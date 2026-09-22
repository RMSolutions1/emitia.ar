import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { getMPMerchantOrder, getMPPayment } from '@/lib/mercadopago';

export const dynamic = 'force-dynamic';

async function completeSaleFromPayment(saleId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: true },
  });

  if (!sale || sale.status === 'completed') return;

  await prisma.sale.update({
    where: { id: saleId },
    data: { status: 'completed', paymentMethod: 'mercadopago' },
  });

  for (const item of sale.items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const companyId = (session.user as { companyId?: string }).companyId;
    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId requerido' }, { status: 400 });
    }

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 });
    }

    if (transaction.status === 'approved') {
      return NextResponse.json({
        status: 'approved',
        transaction,
      });
    }

    let metadata: Record<string, string> = {};
    if (transaction.metadata) {
      try {
        metadata = JSON.parse(transaction.metadata);
      } catch {
        metadata = {};
      }
    }

    // Consultar estado en MercadoPago si es QR
    if (metadata.mode === 'qr' && metadata.in_store_order_id) {
      try {
        const order = await getMPMerchantOrder(metadata.in_store_order_id, companyId);
        const payments = order?.payments || [];
        const approved = payments.find((p: { status?: string }) => p.status === 'approved');

        if (approved) {
          await prisma.paymentTransaction.update({
            where: { id: transaction.id },
            data: {
              status: 'approved',
              externalId: String(approved.id),
              webhookReceived: true,
            },
          });

          if (transaction.saleId) {
            await completeSaleFromPayment(transaction.saleId);
          }

          return NextResponse.json({
            status: 'approved',
            paymentId: approved.id,
          });
        }

        const pending = payments.find((p: { status?: string }) => p.status === 'pending' || p.status === 'in_process');
        if (pending) {
          return NextResponse.json({ status: 'pending' });
        }
      } catch (err) {
        console.error('Error polling MP order:', err);
      }
    }

    // Consultar por externalId si ya existe
    if (transaction.externalId) {
      try {
        const payment = await getMPPayment(transaction.externalId, companyId);
        if (payment.status === 'approved') {
          await prisma.paymentTransaction.update({
            where: { id: transaction.id },
            data: { status: 'approved', statusDetail: payment.status_detail },
          });
          if (transaction.saleId) {
            await completeSaleFromPayment(transaction.saleId);
          }
          return NextResponse.json({ status: 'approved', paymentId: payment.id });
        }
        return NextResponse.json({ status: payment.status || 'pending' });
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      status: transaction.status || 'pending',
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    return NextResponse.json({ error: 'Error al verificar pago' }, { status: 500 });
  }
}
