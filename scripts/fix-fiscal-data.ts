/**
 * Corrige condición IVA y domicilio de clientes/comprobantes desde AFIP.
 * Uso: npx tsx scripts/fix-fiscal-data.ts [CUIT] [invoiceNumber...]
 */
import prisma from '../lib/db';
import {
  fetchPersonaFromAfip,
  mergeCustomerWithPersona,
  customerNeedsAfipEnrichment,
} from '../lib/afip/customer-enrichment';

const DEFAULT_CUIT = '33710900979';
const DEFAULT_INVOICES = ['0006-00000005', '0006-00000006', '0006-00000010'];

async function enrichCustomer(cuit: string) {
  const customers = await prisma.customer.findMany({
    where: { document: cuit },
  });

  let persona = await fetchPersonaFromAfip(cuit);
  if (!persona) {
    console.error(`No se pudo obtener datos AFIP para CUIT ${cuit}`);
    return null;
  }

  const mergedBase = mergeCustomerWithPersona(
    { document: cuit, documentType: 'CUIT', taxCondition: 'consumidor_final' },
    persona,
    'CUIT',
  );

  for (const cust of customers) {
    const merged = mergeCustomerWithPersona(cust, persona, 'CUIT');
    await prisma.customer.update({
      where: { id: cust.id },
      data: {
        name: merged.name || cust.name,
        address: merged.address || null,
        city: merged.city || null,
        province: merged.province || null,
        taxCondition: merged.taxCondition,
        documentType: 'CUIT',
      },
    });
    console.log(`Cliente ${cust.id} actualizado:`, merged.taxCondition, merged.address || merged.city);
  }

  if (customers.length === 0) {
    console.log('Sin cliente local; datos AFIP:', mergedBase);
  }

  return mergedBase;
}

async function fixInvoices(cuit: string, invoiceNumbers: string[], fiscal: { taxCondition: string; address?: string | null; city?: string | null }) {
  for (const num of invoiceNumbers) {
    const updated = await prisma.invoice.updateMany({
      where: { invoiceNumber: num, customerDocument: cuit },
      data: {
        customerTaxCondition: fiscal.taxCondition,
        customerAddress: fiscal.address || fiscal.city || null,
      },
    });
    console.log(`Factura ${num}: ${updated.count} registro(s) corregido(s)`);
  }

  const bulk = await prisma.invoice.updateMany({
    where: {
      customerDocument: cuit,
      customerTaxCondition: 'consumidor_final',
    },
    data: {
      customerTaxCondition: fiscal.taxCondition,
      customerAddress: fiscal.address || fiscal.city || null,
    },
  });
  console.log(`Facturas adicionales con CF corregidas: ${bulk.count}`);
}

async function main() {
  const cuit = process.argv[2] || DEFAULT_CUIT;
  const invoiceNumbers = process.argv.length > 3 ? process.argv.slice(3) : DEFAULT_INVOICES;

  console.log('=== Corrección fiscal EMITIA ===');
  console.log('CUIT:', cuit);
  console.log('Facturas:', invoiceNumbers.join(', '));

  const fiscal = await enrichCustomer(cuit);
  if (!fiscal?.taxCondition) {
    process.exit(1);
  }

  await fixInvoices(cuit, invoiceNumbers, {
    taxCondition: fiscal.taxCondition,
    address: fiscal.address,
    city: fiscal.city,
  });

  console.log('=== Listo ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
