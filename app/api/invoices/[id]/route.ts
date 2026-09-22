import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        company: true
      }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    // Verificar acceso a la empresa
    const userRole = (session.user as any)?.role;
    const userCompanyId = (session.user as any)?.companyId;
    
    if (userRole !== 'superadmin' && invoice.companyId !== userCompanyId) {
      return NextResponse.json({ error: 'Sin acceso a esta factura' }, { status: 403 });
    }

    // If saleId exists, get sale details
    let saleDetails = null;
    if (invoice.saleId) {
      saleDetails = await prisma.sale.findUnique({
        where: { id: invoice.saleId },
        include: {
          items: {
            include: { product: true }
          }
        }
      });
    }

    return NextResponse.json({
      invoice,
      business: invoice.company, // Retornar company como business para compatibilidad
      sale: saleDetails
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ error: 'Error al obtener factura' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    
    // Verificar que el usuario tiene acceso a esta factura
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id }
    });
    
    if (!existingInvoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }
    
    const userRole = (session.user as any)?.role;
    const userCompanyId = (session.user as any)?.companyId;
    
    if (userRole !== 'superadmin' && existingInvoice.companyId !== userCompanyId) {
      return NextResponse.json({ error: 'Sin acceso a esta factura' }, { status: 403 });
    }
    
    const body = await req.json();
    const { status, cae, caeExpiration, pdfUrl, notes } = body;

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: status || undefined,
        cae: cae || undefined,
        caeExpiration: caeExpiration ? new Date(caeExpiration) : undefined,
        pdfUrl: pdfUrl || undefined,
        notes: notes !== undefined ? notes : undefined,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: 'Error al actualizar factura' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    const userRole = (session.user as any)?.role;
    const userCompanyId = (session.user as any)?.companyId;

    if (userRole !== 'superadmin' && invoice.companyId !== userCompanyId) {
      return NextResponse.json({ error: 'Sin acceso a esta factura' }, { status: 403 });
    }

    // SOLO se pueden eliminar facturas SIN CAE (sin validez fiscal)
    if (invoice.cae && invoice.cae.trim() !== '') {
      return NextResponse.json(
        { error: 'No se puede eliminar una factura con CAE autorizado. Los comprobantes con validez fiscal no pueden eliminarse.' },
        { status: 400 }
      );
    }

    await prisma.invoice.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Factura eliminada correctamente' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json({ error: 'Error al eliminar factura' }, { status: 500 });
  }
}
