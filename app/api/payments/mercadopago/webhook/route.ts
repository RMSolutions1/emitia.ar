import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getMPPayment, getMPWebhookSecret, verifyMPWebhookSignature } from '@/lib/mercadopago';

async function completeSaleFromPayment(saleId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: true },
  });

  if (!sale || sale.status === 'completed') return;

  await prisma.sale.update({
    where: { id: saleId },
    data: {
      status: 'completed',
      paymentMethod: 'mercadopago',
    },
  });

  for (const item of sale.items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');
    const dataId = body?.data?.id ? String(body.data.id) : '';

    if (body.type === 'payment' && dataId) {
      const secret = await getMPWebhookSecret();
      if (secret && !verifyMPWebhookSignature(xSignature, xRequestId, dataId, secret)) {
        console.error('[MP Webhook] Firma inválida');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      const paymentId = body.data.id;
      const payment = await getMPPayment(paymentId);

      const transaction = await prisma.paymentTransaction.findFirst({
        where: {
          OR: [
            { externalId: paymentId.toString() },
            { preferenceId: payment.preference_id },
          ],
        },
      });

      if (transaction) {
        await prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            externalId: paymentId.toString(),
            status: payment.status,
            statusDetail: payment.status_detail,
            paymentMethodId: payment.payment_method_id,
            paymentTypeId: payment.payment_type_id,
            installments: payment.installments,
            fee: payment.fee_details?.reduce((sum: number, fee: { amount: number }) => sum + fee.amount, 0) || 0,
            netAmount: payment.transaction_details?.net_received_amount,
            payerEmail: payment.payer?.email,
            payerDocument: payment.payer?.identification?.number,
            webhookReceived: true,
            updatedAt: new Date(),
          },
        });

        if (payment.status === 'approved') {
          if (transaction.saleId) {
            await completeSaleFromPayment(transaction.saleId);
          } else if (payment.external_reference) {
            const sale = await prisma.sale.findUnique({
              where: { id: payment.external_reference },
            });
            if (sale) {
              await prisma.paymentTransaction.update({
                where: { id: transaction.id },
                data: { saleId: sale.id },
              });
              await completeSaleFromPayment(sale.id);
            }
          }
        }
      } else {
        await prisma.paymentTransaction.create({
          data: {
            provider: 'mercadopago',
            externalId: paymentId.toString(),
            preferenceId: payment.preference_id,
            status: payment.status,
            statusDetail: payment.status_detail,
            amount: payment.transaction_amount,
            currency: payment.currency_id,
            paymentMethodId: payment.payment_method_id,
            paymentTypeId: payment.payment_type_id,
            installments: payment.installments,
            fee: payment.fee_details?.reduce((sum: number, fee: { amount: number }) => sum + fee.amount, 0) || 0,
            netAmount: payment.transaction_details?.net_received_amount,
            payerEmail: payment.payer?.email,
            payerDocument: payment.payer?.identification?.number,
            webhookReceived: true,
            metadata: JSON.stringify({ external_reference: payment.external_reference }),
          },
        });

        if (payment.status === 'approved' && payment.external_reference) {
          const sale = await prisma.sale.findUnique({
            where: { id: payment.external_reference },
          });
          if (sale && sale.status === 'pending') {
            await completeSaleFromPayment(sale.id);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ received: true, error: 'Processing error' });
  }
}
