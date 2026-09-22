/**
 * Verifica consulta WSFE (sin emitir comprobantes)
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function main() {
  const { getLastAuthorizedVoucher, getPointsOfSale, getEnabledVoucherTypes } = await import('../lib/afip');

  console.log('Puntos de venta:');
  const pvs = await getPointsOfSale();
  console.log(pvs);

  console.log('\nÚltimo comprobante PV 6, Factura B (tipo 6):');
  const last = await getLastAuthorizedVoucher(6, 6);
  console.log(last);

  console.log('\nTipos habilitados (primeros 5):');
  const types = await getEnabledVoucherTypes();
  console.log(types.slice(0, 5));
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
