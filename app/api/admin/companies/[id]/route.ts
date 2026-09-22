import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

// GET - Obtener empresa específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            products: true,
            customers: true,
            sales: true,
            invoices: true,
            tickets: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    // Estadísticas adicionales
    const salesTotal = await prisma.sale.aggregate({
      where: { companyId: params.id },
      _sum: { total: true },
    });

    const invoicesTotal = await prisma.invoice.aggregate({
      where: { companyId: params.id },
      _sum: { total: true },
    });

    return NextResponse.json({
      company,
      stats: {
        salesTotal: salesTotal._sum.total || 0,
        invoicesTotal: invoicesTotal._sum.total || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json({ error: 'Error al obtener empresa' }, { status: 500 });
  }
}

// PUT - Actualizar empresa
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const data = await request.json();
    const {
      name,
      legalName,
      cuit,
      iibb,
      condicionIva,
      address,
      city,
      province,
      postalCode,
      phone,
      email,
      website,
      plan,
      maxUsers,
      maxPOS,
      status,
    } = data;

    // Verificar CUIT único si se está cambiando
    if (cuit) {
      const existingCuit = await prisma.company.findFirst({
        where: {
          cuit,
          NOT: { id: params.id },
        },
      });
      if (existingCuit) {
        return NextResponse.json({ error: 'El CUIT ya está registrado por otra empresa' }, { status: 400 });
      }
    }

    const company = await prisma.company.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(legalName !== undefined && { legalName }),
        ...(cuit !== undefined && { cuit }),
        ...(iibb !== undefined && { iibb }),
        ...(condicionIva && { condicionIva }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(province !== undefined && { province }),
        ...(postalCode !== undefined && { postalCode }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(website !== undefined && { website }),
        ...(plan && { plan }),
        ...(maxUsers !== undefined && { maxUsers }),
        ...(maxPOS !== undefined && { maxPOS }),
        ...(status && { status }),
      },
    });

    return NextResponse.json({ company, message: 'Empresa actualizada exitosamente' });
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json({ error: 'Error al actualizar empresa' }, { status: 500 });
  }
}

// DELETE - Eliminar empresa (con precaución)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Verificar si la empresa tiene datos
    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            sales: true,
            invoices: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    // Si tiene ventas o facturas, solo bloquear en lugar de eliminar
    if (company._count.sales > 0 || company._count.invoices > 0) {
      await prisma.company.update({
        where: { id: params.id },
        data: { status: 'blocked' },
      });
      return NextResponse.json({
        message: 'La empresa tiene datos históricos. Se ha bloqueado en lugar de eliminar.',
        blocked: true,
      });
    }

    // Si no tiene datos, eliminar completamente (cascade)
    await prisma.company.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Empresa eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json({ error: 'Error al eliminar empresa' }, { status: 500 });
  }
}
