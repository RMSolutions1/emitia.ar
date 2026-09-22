import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

// GET - Obtener secuencias de documentos
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    const userCompanyId = (session.user as any)?.companyId;

    if (!userCompanyId && userRole !== 'superadmin') {
      return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 403 });
    }

    const where = userCompanyId ? { companyId: userCompanyId } : undefined;

    const sequences = await prisma.documentSequence.findMany({
      where,
      orderBy: [{ pointOfSale: 'asc' }, { documentCode: 'asc' }]
    });

    return NextResponse.json(sequences);
  } catch (error) {
    console.error('Error fetching sequences:', error);
    return NextResponse.json({ error: 'Error al obtener secuencias' }, { status: 500 });
  }
}

// POST - Crear o actualizar secuencia
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    const userCompanyId = (session.user as any)?.companyId;

    if (userRole !== 'company_admin' && userRole !== 'superadmin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    if (!userCompanyId && userRole !== 'superadmin') {
      return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 403 });
    }

    const body = await req.json();
    const { documentCode, pointOfSale, nextNumber, companyId: targetCompanyId } = body;

    if (!documentCode || pointOfSale === undefined) {
      return NextResponse.json({ error: 'documentCode y pointOfSale requeridos' }, { status: 400 });
    }

    const finalCompanyId = userRole === 'superadmin' && targetCompanyId ? targetCompanyId : userCompanyId;

    if (!finalCompanyId) {
      return NextResponse.json({ error: 'ID de empresa requerido' }, { status: 400 });
    }

    const sequence = await prisma.documentSequence.upsert({
      where: {
        companyId_documentCode_pointOfSale: {
          companyId: finalCompanyId,
          documentCode,
          pointOfSale: parseInt(pointOfSale)
        }
      },
      update: {
        nextNumber: nextNumber ? parseInt(nextNumber) : undefined
      },
      create: {
        companyId: finalCompanyId,
        documentCode,
        pointOfSale: parseInt(pointOfSale),
        nextNumber: nextNumber ? parseInt(nextNumber) : 1
      }
    });

    return NextResponse.json({ success: true, sequence });
  } catch (error) {
    console.error('Error saving sequence:', error);
    return NextResponse.json({ error: 'Error al guardar secuencia' }, { status: 500 });
  }
}

// DELETE - Eliminar secuencia
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    const userCompanyId = (session.user as any)?.companyId;

    if (userRole !== 'company_admin' && userRole !== 'superadmin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    // Verificar acceso
    const sequence = await prisma.documentSequence.findUnique({
      where: { id }
    });

    if (!sequence) {
      return NextResponse.json({ error: 'Secuencia no encontrada' }, { status: 404 });
    }

    if (userRole !== 'superadmin' && sequence.companyId !== userCompanyId) {
      return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
    }

    await prisma.documentSequence.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sequence:', error);
    return NextResponse.json({ error: 'Error al eliminar secuencia' }, { status: 500 });
  }
}
