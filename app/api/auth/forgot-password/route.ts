import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      return NextResponse.json({ message: 'Si el email existe, recibirás instrucciones.' });
    }

    if (user.status === 'blocked') {
      return NextResponse.json({ error: 'Tu cuenta está bloqueada. Contactá al soporte.' }, { status: 403 });
    }

    const tempPassword = crypto.randomBytes(4).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    const emailSent = await sendPasswordResetEmail(normalizedEmail, tempPassword);
    if (!emailSent) {
      console.error(`[PASSWORD RESET] No se pudo enviar email a ${normalizedEmail}`);
      return NextResponse.json(
        { error: 'No pudimos enviar el email. Intentá más tarde o contactá a soporte@emitia.com.ar' },
        { status: 503 },
      );
    }

    return NextResponse.json({ message: 'Si el email existe, recibirás instrucciones.' });
  } catch (error: unknown) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
  }
}
