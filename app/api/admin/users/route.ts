import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

function isAdminUser(session: any): boolean {
  if (!session?.user) return false;
  if (session.user.role === 'superadmin') return true;
  if (session.user.role === 'company_admin') return true;
  return false;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminUser(session)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status');
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    const where: any = {};

    // company_admin can only see their own company users
    if (session!.user.role === 'company_admin') {
      where.companyId = session!.user.companyId;
    } else if (companyId) {
      where.companyId = companyId;
    }

    if (status && status !== 'all') where.status = status;
    if (role && role !== 'all') where.role = role;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, totalCount, activeCount, blockedCount, inactiveCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyId: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          company: {
            select: { id: true, name: true, plan: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.user.count({ where: session!.user.role === 'company_admin' ? { companyId: session!.user.companyId } : {} }),
      prisma.user.count({ where: { ...(session!.user.role === 'company_admin' ? { companyId: session!.user.companyId } : {}), status: 'active' } }),
      prisma.user.count({ where: { ...(session!.user.role === 'company_admin' ? { companyId: session!.user.companyId } : {}), status: 'blocked' } }),
      prisma.user.count({ where: { ...(session!.user.role === 'company_admin' ? { companyId: session!.user.companyId } : {}), status: 'inactive' } }),
    ]);

    return NextResponse.json({
      users,
      stats: {
        total: totalCount,
        active: activeCount,
        blocked: blockedCount,
        inactive: inactiveCount,
      }
    });
  } catch (error: any) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminUser(session)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { name, email, password, role, companyId, status } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nombre, email y contraseña son requeridos' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }

    // company_admin restrictions
    if (session!.user.role === 'company_admin') {
      if (role === 'superadmin') {
        return NextResponse.json({ error: 'No puede crear usuarios superadmin' }, { status: 403 });
      }
      // Force company_admin users to their own company
      if (companyId && companyId !== session!.user.companyId) {
        return NextResponse.json({ error: 'No puede crear usuarios en otra empresa' }, { status: 403 });
      }
    }

    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const assignedCompanyId = session!.user.role === 'company_admin'
      ? session!.user.companyId
      : (role === 'superadmin' ? null : companyId);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'user',
        companyId: assignedCompanyId,
        status: status || 'active',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        company: { select: { id: true, name: true } },
      }
    });

    return NextResponse.json({ user, message: 'Usuario creado exitosamente' });
  } catch (error: any) {
    console.error('Create user error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminUser(session)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { userId, action } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId requerido' }, { status: 400 });
    }

    // Cannot modify self
    if (userId === session!.user.id) {
      return NextResponse.json({ error: 'No puede modificar su propio usuario con esta acción' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // company_admin restrictions
    if (session!.user.role === 'company_admin') {
      if (user.companyId !== session!.user.companyId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      if (user.role === 'superadmin' || user.role === 'company_admin') {
        return NextResponse.json({ error: 'No puede modificar administradores' }, { status: 403 });
      }
    }

    let updated;

    switch (action) {
      case 'block':
        updated = await prisma.user.update({
          where: { id: userId },
          data: { status: 'blocked' }
        });
        break;

      case 'unblock':
      case 'activate':
        updated = await prisma.user.update({
          where: { id: userId },
          data: { status: 'active' }
        });
        break;

      case 'deactivate':
        updated = await prisma.user.update({
          where: { id: userId },
          data: { status: 'inactive' }
        });
        break;

      case 'reset_password': {
        const tempPassword = Math.random().toString(36).slice(-10);
        const hashed = await bcrypt.hash(tempPassword, 10);
        updated = await prisma.user.update({
          where: { id: userId },
          data: { password: hashed }
        });
        return NextResponse.json({ ...updated, tempPassword, message: `Contraseña temporal: ${tempPassword}` });
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    return NextResponse.json({ ...updated, message: 'Usuario actualizado exitosamente' });
  } catch (error: any) {
    console.error('Admin user update error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
