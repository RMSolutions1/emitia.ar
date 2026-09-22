import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'superadmin' && session.user.role !== 'company_admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';

    const where: any = {};
    if (status && status !== 'all' && status !== '') where.status = status;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { legalName: { contains: search, mode: 'insensitive' } },
        { cuit: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // company_admin solo ve su propia empresa
    if (session.user.role === 'company_admin') {
      where.id = session.user.companyId;
    }

    const companies = await prisma.company.findMany({
      where,
      select: {
        id: true,
        name: true,
        legalName: true,
        cuit: true,
        condicionIva: true,
        actividadPrincipal: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        province: true,
        postalCode: true,
        plan: true,
        status: true,
        maxUsers: true,
        maxPOS: true,
        daysOverdue: true,
        paymentStatus: true,
        lastPaymentDate: true,
        nextBillingDate: true,
        subscriptionPrice: true,
        createdAt: true,
        _count: { select: { users: true, products: true, customers: true, sales: true, invoices: true } }
      },
      orderBy: { [sortBy]: 'desc' },
      take: 200
    });

    const stats = {
      total: await prisma.company.count(),
      active: await prisma.company.count({ where: { status: 'active' } }),
      suspended: await prisma.company.count({ where: { status: 'suspended' } }),
      blocked: await prisma.company.count({ where: { status: 'blocked' } }),
      overdue: await prisma.company.count({ where: { paymentStatus: 'overdue' } })
    };

    return NextResponse.json({ companies, stats });
  } catch (error: any) {
    console.error('Admin companies GET error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await req.json();
    const { name, legalName, cuit, condicionIva, actividadPrincipal, email, phone, address, city, province, postalCode, plan, maxUsers, maxPOS } = data;

    if (!name) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    // Verificar CUIT único si se proporciona
    if (cuit) {
      const existingCuit = await prisma.company.findFirst({ where: { cuit } });
      if (existingCuit) {
        return NextResponse.json({ error: 'El CUIT ya está registrado' }, { status: 400 });
      }
    }

    const company = await prisma.company.create({
      data: {
        name,
        legalName: legalName || null,
        cuit: cuit || null,
        condicionIva: condicionIva || 'responsable_inscripto',
        actividadPrincipal: actividadPrincipal || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        province: province || null,
        postalCode: postalCode || null,
        plan: plan || 'free',
        maxUsers: maxUsers || 1,
        maxPOS: maxPOS || 1,
        status: 'active',
        paymentStatus: 'paid',
      },
    });

    return NextResponse.json({ company, message: 'Empresa creada exitosamente' });
  } catch (error: any) {
    console.error('Admin companies POST error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una empresa con esos datos' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al crear empresa' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { companyId, action, data } = await req.json();

    if (!companyId) {
      return NextResponse.json({ error: 'companyId requerido' }, { status: 400 });
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    let updated;

    switch (action) {
      case 'toggle_status':
        const newStatus = company.status === 'active' ? 'suspended' : 'active';
        updated = await prisma.company.update({
          where: { id: companyId },
          data: { status: newStatus }
        });
        break;

      case 'block':
        updated = await prisma.company.update({
          where: { id: companyId },
          data: { status: 'blocked' }
        });
        break;

      case 'unblock':
        updated = await prisma.company.update({
          where: { id: companyId },
          data: { status: 'active', daysOverdue: 0, paymentStatus: 'paid' }
        });
        break;

      case 'record_payment': {
        const nextBilling = new Date();
        nextBilling.setMonth(nextBilling.getMonth() + 1);
        updated = await prisma.company.update({
          where: { id: companyId },
          data: {
            lastPaymentDate: new Date(),
            paymentStatus: 'paid',
            daysOverdue: 0,
            nextBillingDate: nextBilling,
            status: 'active'
          }
        });
        break;
      }

      case 'update_plan':
        if (!data?.plan) {
          return NextResponse.json({ error: 'Plan requerido' }, { status: 400 });
        }
        updated = await prisma.company.update({
          where: { id: companyId },
          data: { plan: data.plan }
        });
        break;

      case 'update_price':
        if (typeof data?.subscriptionPrice !== 'number') {
          return NextResponse.json({ error: 'Precio inválido' }, { status: 400 });
        }
        updated = await prisma.company.update({
          where: { id: companyId },
          data: { subscriptionPrice: data.subscriptionPrice }
        });
        break;

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    return NextResponse.json({ ...updated, message: 'Acción completada exitosamente' });
  } catch (error: any) {
    console.error('Admin PUT error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
