// @ts-nocheck
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      email, password, name, phone,
      companyName, legalName, cuit, condicionIva,
      rubro, address, city, province, postalCode
    } = body;

    // Validaciones
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Nombre, email y contraseña son requeridos' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }

    if (!companyName?.trim()) {
      return NextResponse.json({ error: 'El nombre del negocio es requerido' }, { status: 400 });
    }

    // Check existing email
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'El email ya está registrado. Podés iniciar sesión o recuperar tu clave.' }, { status: 400 });
    }

    // Check existing CUIT if provided
    const cleanCuit = cuit?.replace(/\D/g, '') || '';
    if (cleanCuit && cleanCuit.length === 11) {
      const existingCompany = await prisma.company.findUnique({ where: { cuit: cleanCuit } });
      if (existingCompany) {
        return NextResponse.json({ error: 'Ya existe una empresa registrada con ese CUIT.' }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create company + user in transaction
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName.trim(),
          legalName: (legalName || companyName).trim(),
          cuit: cleanCuit.length === 11 ? cleanCuit : null,
          condicionIva: condicionIva || 'monotributista',
          actividadPrincipal: rubro || null,
          address: address || null,
          city: city || null,
          province: province || null,
          postalCode: postalCode || null,
          phone: phone || null,
          email: email,
          plan: 'free',
          status: 'active',
          maxUsers: 1,
          maxPOS: 1,
        },
      });

      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          role: 'company_admin',
          companyId: company.id,
          status: 'active',
        },
      });

      return { company, user };
    });

    return NextResponse.json(
      {
        message: 'Cuenta creada exitosamente',
        user: { id: result.user.id, email: result.user.email, name: result.user.name },
        company: { id: result.company.id, name: result.company.name },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error en signup:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'El email o CUIT ya está registrado.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al crear cuenta. Intentá nuevamente.' }, { status: 500 });
  }
}
