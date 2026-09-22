/**
 * Verificación integral de integraciones EMITIA
 * Uso: npm run verify
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function main() {
  const { checkIntegrations } = await import('../lib/integrations-health');
  const report = await checkIntegrations();

  console.log('=== EMITIA - Verificación de integraciones ===\n');
  console.log('Fecha:', report.timestamp);

  console.log('\n1. Base de datos:', report.database.ok ? '✅' : '❌');
  console.log('  ', report.database.detail || report.database.error);

  console.log('\n2. AFIP/ARCA:', report.afip.ok ? '✅' : '❌');
  console.log('  ', report.afip.detail || report.afip.error);
  if (report.afip.environment) console.log('   Ambiente:', report.afip.environment);
  if (report.afip.cuit) console.log('   CUIT:', report.afip.cuit);

  console.log('\n3. IA (Importar productos, Contador IA):', report.ai.ok ? '✅' : '❌');
  console.log('  ', report.ai.detail || report.ai.error);
  if (report.ai.provider) console.log('   Proveedor activo:', report.ai.provider);
  if (report.ai.available?.length) console.log('   Proveedores detectados:', report.ai.available.join(', '));

  console.log('\n4. Email (Resend):', report.email.ok ? '✅' : '❌');
  console.log('  ', report.email.detail || report.email.error);

  console.log('\n5. Variables de entorno en este entorno:');
  for (const [k, v] of Object.entries(report.env)) {
    console.log(`   ${v ? '✅' : '❌'} ${k}`);
  }

  const allOk = report.database.ok && report.afip.ok && report.ai.ok;
  console.log('\n=== RESULTADO:', allOk ? 'TODAS OK' : 'HAY FALLOS', '===');

  if (!allOk) {
    console.log('\nAcciones recomendadas:');
    if (!report.database.ok) console.log('- Verificar DATABASE_URL y acceso de red al PostgreSQL');
    if (!report.afip.ok) console.log('- Copiar AFIP_CERT, AFIP_KEY, AFIP_CUIT, AFIP_ENVIRONMENT al servidor de producción');
    if (!report.ai.ok) {
      console.log('- Configurá GEMINI_API_KEY (aistudio.google.com) u OPENAI_API_KEY');
    }
    if (!report.email?.ok) {
      console.log('- Configurá RESEND_API_KEY para emails (resend.com)');
    }
    if (Object.values(report.env).some((v) => !v)) {
      console.log('- Completá las variables de .env.local o de Vercel');
    }
  }

  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
