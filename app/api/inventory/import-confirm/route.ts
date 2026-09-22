import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 403 });
    }

    const body = await request.json();
    const { items, documentInfo } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No hay productos para importar' }, { status: 400 });
    }

    const results = {
      created: 0,
      updated: 0,
      errors: 0,
      details: [] as Array<{ name: string; action: string; error?: string }>
    };

    for (const item of items) {
      try {
        if (!item.name || item.unitCost <= 0) {
          results.errors++;
          results.details.push({ name: item.name || 'Sin nombre', action: 'error', error: 'Datos incompletos' });
          continue;
        }

        // Try to find existing product by SKU within same company
        const existingProduct = await prisma.product.findFirst({
          where: {
            companyId,
            OR: [
              { sku: item.sku },
              { name: { equals: item.name, mode: 'insensitive' as any } }
            ]
          }
        });

        if (existingProduct) {
          // Update existing product: add stock, update cost and price
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              stock: { increment: item.quantity },
              cost: item.unitCost,
              price: item.salePrice,
              updatedAt: new Date()
            }
          });

          // Create stock movement
          await prisma.stockMovement.create({
            data: {
              productId: existingProduct.id,
              type: 'in',
              quantity: item.quantity,
              reason: 'Importación IA',
              reference: documentInfo?.documentNumber || 'Importación automática'
            }
          });

          results.updated++;
          results.details.push({ name: item.name, action: 'updated' });
        } else {
          // Find or create category
          let categoryId: string | undefined;
          if (item.category) {
            const category = await prisma.category.findFirst({
              where: {
                companyId,
                name: { equals: item.category, mode: 'insensitive' as any }
              }
            });
            if (category) {
              categoryId = category.id;
            } else {
              const newCategory = await prisma.category.create({
                data: {
                  name: item.category,
                  companyId
                }
              });
              categoryId = newCategory.id;
            }
          }

          // Ensure unique SKU
          let finalSku = item.sku;
          const skuExists = await prisma.product.findFirst({
            where: { companyId, sku: finalSku }
          });
          if (skuExists) {
            finalSku = `${item.sku}-${Date.now().toString(36).slice(-4)}`;
          }

          // Create new product
          const newProduct = await prisma.product.create({
            data: {
              companyId,
              name: item.name,
              sku: finalSku,
              description: item.description || null,
              cost: item.unitCost,
              price: item.salePrice,
              stock: item.quantity,
              minStock: Math.max(1, Math.floor(item.quantity * 0.1)),
              categoryId: categoryId || undefined,
            }
          });

          // Create stock movement
          await prisma.stockMovement.create({
            data: {
              productId: newProduct.id,
              type: 'in',
              quantity: item.quantity,
              reason: 'Importación IA - Nuevo producto',
              reference: documentInfo?.documentNumber || 'Importación automática'
            }
          });

          results.created++;
          results.details.push({ name: item.name, action: 'created' });
        }
      } catch (error) {
        console.error(`[Import Confirm] Error processing item ${item.name}:`, error);
        results.errors++;
        results.details.push({ name: item.name, action: 'error', error: 'Error al guardar' });
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `Importación completada: ${results.created} creados, ${results.updated} actualizados${results.errors > 0 ? `, ${results.errors} errores` : ''}`
    });
  } catch (error) {
    console.error('[Import Confirm] Error:', error);
    return NextResponse.json({ error: 'Error interno al importar productos' }, { status: 500 });
  }
}
