// @ts-nocheck
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    const userRole = (session.user as any).role;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: { items: true }
    });

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    if (userRole !== 'superadmin' && order.companyId !== companyId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (order.status === 'received') {
      return NextResponse.json({ error: 'Orden ya recibida' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            cost: item.unitCost
          }
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'in',
            quantity: item.quantity,
            reason: 'Recepción de compra',
            reference: order.orderNumber
          }
        });

        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { receivedQty: item.quantity }
        });
      }

      await tx.purchaseOrder.update({
        where: { id: params.id },
        data: {
          status: 'received',
          receivedDate: new Date()
        }
      });
    });

    return NextResponse.json({ success: true, message: 'Stock actualizado correctamente' });
  } catch (error) {
    console.error('Error al recibir orden:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
