import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import prisma from './db';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Credenciales inválidas');
        }

        let user;
        try {
          user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            company: true,
          },
        });
        } catch (dbError: unknown) {
          const msg = dbError instanceof Error ? dbError.message : '';
          if (msg.includes('Timed out') || msg.includes('connection pool') || msg.includes("Can't reach")) {
            throw new Error('DB_CONNECTION_ERROR');
          }
          throw dbError;
        }

        if (!user || !user?.password) {
          throw new Error('Usuario no encontrado');
        }

        // Verificar si el usuario está activo
        if (user.status === 'blocked') {
          throw new Error('Usuario bloqueado. Contacte al administrador.');
        }

        if (user.status === 'inactive') {
          throw new Error('Usuario inactivo. Contacte al administrador.');
        }

        // Verificar si la empresa está activa (solo para usuarios no superadmin)
        if (user.companyId && user.company) {
          if (user.company.status === 'blocked') {
            throw new Error('Empresa bloqueada. Contacte al administrador.');
          }
          if (user.company.status === 'suspended') {
            throw new Error('Empresa suspendida. Contacte al administrador.');
          }
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error('Contraseña incorrecta');
        }

        // Actualizar último login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          companyName: user.company?.name || null,
          companyPlan: user.company?.plan || 'free',
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.companyId = (user as any).companyId;
        token.companyName = (user as any).companyName;
        token.companyPlan = (user as any).companyPlan;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).companyId = token.companyId;
        (session.user as any).companyName = token.companyName;
        (session.user as any).companyPlan = token.companyPlan;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    signOut: '/cerrar-sesion',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Tipos extendidos para TypeScript
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: string;
      companyId: string | null;
      companyName: string | null;
      companyPlan: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    companyId: string | null;
    companyName: string | null;
    companyPlan: string;
  }
}
