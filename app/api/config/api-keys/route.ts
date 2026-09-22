// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { encrypt, decrypt, maskSecret } from '@/lib/encryption';
import { getMPUserInfo, validateMPAccessToken } from '@/lib/mercadopago';

// GET - Obtener configuraciones de API del usuario
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { requireTenant } = await import('@/lib/tenant');
    const scoped = requireTenant(session, req);
    if (!scoped.ok) return scoped.response;

    const configs = await prisma.apiConfiguration.findMany({
      where: scoped.where,
      orderBy: { createdAt: 'desc' }
    });

    // Enmascarar credenciales sensibles
    const maskedConfigs = configs.map(config => {
      let metadata: Record<string, unknown> | null = null;
      if (config.metadata) {
        try {
          metadata = JSON.parse(config.metadata);
        } catch {
          metadata = null;
        }
      }

      return {
        id: config.id,
        companyId: config.companyId,
        provider: config.provider.toLowerCase(),
        displayName: config.displayName,
        accessToken: config.accessToken ? maskSecret(decrypt(config.accessToken), 4) : null,
        publicKey: config.publicKey ? maskSecret(decrypt(config.publicKey), 4) : null,
        secretKey: config.secretKey ? maskSecret(decrypt(config.secretKey), 4) : null,
        webhookSecret: config.webhookSecret ? maskSecret(decrypt(config.webhookSecret), 4) : null,
        environment: config.environment,
        isActive: config.isActive,
        metadata,
        hasAccessToken: !!config.accessToken,
        hasPublicKey: !!config.publicKey,
        hasSecretKey: !!config.secretKey,
        hasWebhookSecret: !!config.webhookSecret,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      };
    });

    return NextResponse.json({ configs: maskedConfigs });
  } catch (error) {
    console.error('Error fetching API configs:', error);
    return NextResponse.json({ error: 'Error al obtener configuraciones' }, { status: 500 });
  }
}

// POST - Crear o actualizar configuración de API
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'company_admin' && userRole !== 'superadmin') {
      return NextResponse.json({ error: 'Sin permisos para configurar APIs' }, { status: 403 });
    }

    const { requireTenant } = await import('@/lib/tenant');
    const scoped = requireTenant(session, req);
    if (!scoped.ok) return scoped.response;

    const body = await req.json();
    const {
      provider: rawProvider,
      displayName,
      accessToken,
      publicKey,
      secretKey,
      webhookSecret,
      environment,
      isActive,
      mpUserId,
      mpPosId,
      metadata: rawMetadata,
    } = body;

    if (!rawProvider) {
      return NextResponse.json({ error: 'Provider requerido' }, { status: 400 });
    }

    const provider = String(rawProvider).toLowerCase();
    const finalCompanyId = scoped.companyId;

    const existing = await prisma.apiConfiguration.findFirst({
      where: {
        companyId: finalCompanyId,
        provider: { equals: provider, mode: 'insensitive' },
      },
    });

    if (!existing && !accessToken && provider !== 'afip') {
      return NextResponse.json({ error: 'Access Token requerido para nueva configuración' }, { status: 400 });
    }

    // Construir datos encriptados
    const data: Record<string, unknown> = {
      companyId: finalCompanyId,
      provider,
      displayName: displayName || provider.charAt(0).toUpperCase() + provider.slice(1),
      environment: environment || 'sandbox',
      isActive: isActive !== undefined ? isActive : true,
    };

    // Metadata adicional (QR, Point, etc.)
    let metadata: Record<string, unknown> = {};
    if (existing?.metadata) {
      try {
        metadata = JSON.parse(existing.metadata);
      } catch {
        metadata = {};
      }
    }
    if (rawMetadata && typeof rawMetadata === 'object') {
      metadata = { ...metadata, ...rawMetadata };
    }

    if (provider === 'mercadopago' && accessToken) {
      const trimmed = String(accessToken).trim();
      const validation = await validateMPAccessToken(trimmed);
      if (!validation.valid) {
        return NextResponse.json({
          error: 'Access Token de MercadoPago inválido o expirado. Generá uno nuevo en developers.mercadopago.com',
          mpError: validation.error,
        }, { status: 400 });
      }
      data.accessToken = encrypt(trimmed);
      data.environment = trimmed.startsWith('APP_USR-') ? 'production' : trimmed.startsWith('TEST-') ? 'sandbox' : (environment || 'sandbox');
      if (!metadata.mpUserId && validation.userId) metadata.mpUserId = validation.userId;
    } else if (accessToken) {
      data.accessToken = encrypt(accessToken);
    }

    if (publicKey) data.publicKey = encrypt(publicKey);
    if (secretKey) data.secretKey = encrypt(secretKey);
    if (webhookSecret) data.webhookSecret = encrypt(webhookSecret);

    if (mpUserId !== undefined) metadata.mpUserId = mpUserId;
    if (mpPosId !== undefined) metadata.mpPosId = mpPosId;

    if (provider === 'mercadopago' && !metadata.mpUserId && existing?.accessToken && !accessToken) {
      try {
        const userInfo = await getMPUserInfo(finalCompanyId);
        if (userInfo?.id) metadata.mpUserId = userInfo.id;
      } catch {
        // opcional
      }
    }

    if (Object.keys(metadata).length > 0) {
      data.metadata = JSON.stringify(metadata);
    }

    // Upsert: actualizar si existe, crear si no
    const config = existing
      ? await prisma.apiConfiguration.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.apiConfiguration.create({
          data: data as Parameters<typeof prisma.apiConfiguration.create>[0]['data'],
        });

    return NextResponse.json({
      success: true,
      config: {
        id: config.id,
        provider: config.provider,
        displayName: config.displayName,
        environment: config.environment,
        isActive: config.isActive
      }
    });
  } catch (error) {
    console.error('Error saving API config:', error);
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 });
  }
}

// DELETE - Eliminar configuración de API
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== 'company_admin' && userRole !== 'superadmin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { requireTenant } = await import('@/lib/tenant');
    const scoped = requireTenant(session, req);
    if (!scoped.ok) return scoped.response;

    const { searchParams } = new URL(req.url);
    const provider = searchParams.get('provider');
    const configId = searchParams.get('id');

    if (!provider && !configId) {
      return NextResponse.json({ error: 'Provider o ID requerido' }, { status: 400 });
    }

    if (configId) {
      // Verificar que pertenece a la empresa del usuario
      const config = await prisma.apiConfiguration.findUnique({
        where: { id: configId }
      });

      if (!config) {
        return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 });
      }

      if (config.companyId !== scoped.companyId) {
        return NextResponse.json({ error: 'Sin acceso a esta configuración' }, { status: 403 });
      }

      await prisma.apiConfiguration.delete({
        where: { id: configId }
      });
    } else if (provider) {
      await prisma.apiConfiguration.deleteMany({
        where: {
          companyId: scoped.companyId,
          provider: { equals: provider.toLowerCase(), mode: 'insensitive' },
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting API config:', error);
    return NextResponse.json({ error: 'Error al eliminar configuración' }, { status: 500 });
  }
}
