import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { createMPPreference, getMPCredentials, createMPQRPayment, getMPUserInfo, listMPPosDevices, ensureMPDefaultPos, validateMPAccessToken } from '@/lib/mercadopago';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const companyId = (session.user as { companyId?: string }).companyId;
    const credentials = await getMPCredentials(companyId);
    if (!credentials) {
      return NextResponse.json({
        error: 'MercadoPago no está configurado',
        needsConfig: true,
      }, { status: 400 });
    }

    const body = await req.json();
    const { saleId, items, customer, total, mode } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items requeridos' }, { status: 400 });
    }

    const paymentTotal = total || items.reduce(
      (sum: number, item: { quantity: number; price?: number; unit_price?: number }) =>
        sum + item.quantity * (item.price || item.unit_price || 0),
      0,
    );

    // Verify sale belongs to user's company if saleId provided
    if (saleId) {
      const userRole = (session.user as { role?: string }).role;
      const sale = await prisma.sale.findUnique({ where: { id: saleId } });
      if (sale && userRole !== 'superadmin' && sale.companyId !== companyId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    }

    const baseUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.emitia.com.ar').replace(/\/$/, '');
    const externalRef = saleId || `sale_${Date.now()}`;

    // Modo QR presencial (mostrador / Point)
    if (mode === 'qr') {
      if (!credentials.mpUserId || !credentials.mpPosId) {
        return NextResponse.json({
          error: 'Configure User ID y POS ID de MercadoPago en Configuración > Integraciones',
          needsQrConfig: true,
        }, { status: 400 });
      }

      const qrResult = await createMPQRPayment({
        amount: paymentTotal,
        description: items.map((i: { name?: string; title?: string }) => i.name || i.title).join(', ').slice(0, 200),
        external_reference: externalRef,
      }, companyId);

      if (!qrResult?.qr_data) {
        return NextResponse.json({ error: 'Error al generar QR de MercadoPago' }, { status: 500 });
      }

      const transaction = await prisma.paymentTransaction.create({
        data: {
          saleId,
          provider: 'mercadopago',
          status: 'pending',
          amount: paymentTotal,
          currency: 'ARS',
          qrCode: qrResult.qr_data,
          metadata: JSON.stringify({
            mode: 'qr',
            in_store_order_id: qrResult.in_store_order_id,
            external_reference: externalRef,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        mode: 'qr',
        qrData: qrResult.qr_data,
        transactionId: transaction.id,
        inStoreOrderId: qrResult.in_store_order_id,
      });
    }

    // Modo link de pago online (Checkout Pro)
    const preference = await createMPPreference({
      items: items.map((item: { name?: string; title?: string; quantity: number; price?: number; unit_price?: number }) => ({
        title: item.name || item.title || 'Producto',
        quantity: item.quantity,
        unit_price: item.price || item.unit_price || 0,
      })),
      payer: customer ? {
        name: customer.name,
        email: customer.email,
        identification: customer.document ? {
          type: 'DNI',
          number: customer.document,
        } : undefined,
      } : undefined,
      back_urls: {
        success: `${baseUrl}/pdv?payment=success`,
        failure: `${baseUrl}/pdv?payment=failure`,
        pending: `${baseUrl}/pdv?payment=pending`,
      },
      auto_return: 'approved',
      external_reference: externalRef,
      notification_url: `${baseUrl}/api/payments/mercadopago/webhook`,
    }, companyId);

    const checkoutUrl = credentials.environment === 'production'
      ? preference.init_point
      : preference.sandbox_init_point;

    const transaction = await prisma.paymentTransaction.create({
      data: {
        saleId,
        provider: 'mercadopago',
        preferenceId: preference.id,
        status: 'pending',
        amount: paymentTotal,
        currency: 'ARS',
        checkoutUrl,
        metadata: JSON.stringify({ mode: 'checkout', external_reference: externalRef }),
      },
    });

    return NextResponse.json({
      success: true,
      mode: 'checkout',
      preferenceId: preference.id,
      checkoutUrl,
      transactionId: transaction.id,
    });
  } catch (error) {
    console.error('Error creating MP payment:', error);
    const msg = error instanceof Error ? error.message : 'Error al procesar pago';
    const isToken = /UNAUTHORIZED|invalid|expired|unauthorized/i.test(msg);
    return NextResponse.json({
      error: isToken
        ? 'Access Token de MercadoPago inválido o expirado. Actualizalo en Configuración > Integraciones.'
        : msg,
      needsTokenRefresh: isToken,
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const companyId = (session.user as { companyId?: string }).companyId;
    const credentials = await getMPCredentials(companyId);
    const discover = req.nextUrl.searchParams.get('discover') === '1';
    const setup = req.nextUrl.searchParams.get('setup') === '1';

    let mpUserId = credentials?.mpUserId || null;
    let mpPosId = credentials?.mpPosId || null;
    let posDevices: { id: number; external_id: string; name: string }[] = [];

    if (credentials && (discover || setup)) {
      const tokenCheck = await validateMPAccessToken(credentials.accessToken);
      const userInfo = tokenCheck.valid ? await getMPUserInfo(companyId) : null;
      if (userInfo?.id) mpUserId = userInfo.id;
      posDevices = tokenCheck.valid ? await listMPPosDevices(companyId) : [];

      if (setup && (!mpUserId || !mpPosId || posDevices.length === 0)) {
        const ensured = await ensureMPDefaultPos(companyId);
        if (ensured) {
          mpUserId = ensured.mpUserId;
          mpPosId = ensured.mpPosId;
          posDevices = await listMPPosDevices(companyId);

          const config = await prisma.apiConfiguration.findFirst({
            where: { companyId, provider: { equals: 'mercadopago', mode: 'insensitive' }, isActive: true },
          });
          if (config) {
            let metadata: Record<string, string> = {};
            try { metadata = config.metadata ? JSON.parse(config.metadata) : {}; } catch { /* */ }
            metadata.mpUserId = ensured.mpUserId;
            metadata.mpPosId = ensured.mpPosId;
            const env = credentials.environment;
            await prisma.apiConfiguration.update({
              where: { id: config.id },
              data: {
                metadata: JSON.stringify(metadata),
                environment: env,
              },
            });
          }
        }
      }
    }

    return NextResponse.json({
      configured: !!credentials,
      environment: credentials?.environment || null,
      tokenValid: credentials ? (await validateMPAccessToken(credentials.accessToken)).valid : false,
      publicKey: credentials?.publicKey ? '***' : null,
      qrEnabled: !!(mpUserId && mpPosId),
      mpUserId,
      mpPosId,
      posDevices: discover || setup ? posDevices : undefined,
    });
  } catch (error) {
    console.error('Error checking MP config:', error);
    return NextResponse.json({ error: 'Error al verificar configuración' }, { status: 500 });
  }
}
