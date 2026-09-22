import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET - Obtener usuario específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar permisos
    if (session.user.role === 'company_admin') {
      if (user.company?.id !== session.user.companyId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    } else if (session.user.role !== 'superadmin') {
      if (user.id !== session.user.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Error al obtener usuario' }, { status: 500 });
  }
}

// PUT - Actualizar usuario
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const { name, email, password, role, status, companyId } = data;

    // Obtener usuario actual
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
      include: { company: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar permisos
    if (session.user.role === 'company_admin') {
      if (existingUser.companyId !== session.user.companyId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      // No puede cambiar a superadmin
      if (role === 'superadmin') {
        return NextResponse.json({ error: 'No puede asignar rol superadmin' }, { status: 403 });
      }
      // No puede cambiar empresa
      if (companyId && companyId !== session.user.companyId) {
        return NextResponse.json({ error: 'No puede mover usuario a otra empresa' }, { status: 403 });
      }
    } else if (session.user.role !== 'superadmin') {
      // Usuario normal solo puede editar su propio nombre
      if (params.id !== session.user.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    }

    // Verificar email único si se está cambiando
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) {
        return NextResponse.json({ error: 'El email ya está en uso' }, { status: 400 });
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    if (role && session.user.role === 'superadmin') updateData.role = role;
    if (role && session.user.role === 'company_admin' && role !== 'superadmin') updateData.role = role;
    if (status) updateData.status = status;
    if (companyId !== undefined && session.user.role === 'superadmin') {
      updateData.companyId = companyId || null;
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ user, message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}

// DELETE - Eliminar usuario
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // No puede eliminar su propio usuario
    if (params.id === session.user.id) {
      return NextResponse.json({ error: 'No puede eliminar su propio usuario' }, { status: 400 });
    }

    // Verificar permisos
    if (session.user.role === 'company_admin') {
      if (existingUser.companyId !== session.user.companyId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      // No puede eliminar company_admin
      if (existingUser.role === 'company_admin') {
        return NextResponse.json({ error: 'No puede eliminar administradores de empresa' }, { status: 403 });
      }
    } else if (session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
  }
}
