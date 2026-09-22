import { testAIConnection } from './ai-provider';

export interface IntegrationCheck {
  ok: boolean;
  detail?: string;
  error?: string;
}

export interface IntegrationsReport {
  timestamp: string;
  env: Record<string, boolean>;
  database: IntegrationCheck;
  afip: IntegrationCheck & { environment?: string; cuit?: string; servers?: unknown };
  ai: IntegrationCheck & { provider?: string; available?: string[] };
  email: IntegrationCheck;
}

export async function checkIntegrations(): Promise<IntegrationsReport> {
  const envKeys = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'AFIP_CERT',
    'AFIP_KEY',
    'AFIP_CUIT',
    'AFIP_ENVIRONMENT',
    'OPENAI_API_KEY',
    'GEMINI_API_KEY',
    'ANTHROPIC_API_KEY',
    'RESEND_API_KEY',
  ];

  const env = Object.fromEntries(envKeys.map((k) => [k, !!process.env[k]]));

  let database: IntegrationCheck = { ok: false, error: 'No verificado' };
  try {
    const { default: prisma } = await import('./db');
    const count = await prisma.company.count();
    database = { ok: true, detail: `${count} empresas` };
  } catch (e: any) {
    database = { ok: false, error: e.message?.slice(0, 200) || 'Error de conexión' };
  }

  let afip: IntegrationsReport['afip'] = { ok: false, error: 'No verificado' };
  try {
    const { getAFIPCredentials, getTicketAcceso, checkServerStatus } = await import('./afip');
    const creds = getAFIPCredentials();
    const servers = await checkServerStatus();
    await getTicketAcceso('wsfe', creds.certPem, creds.keyPem, creds.environment);
    afip = {
      ok: true,
      environment: creds.environment,
      cuit: creds.cuit,
      servers,
      detail: `WSAA OK · ${creds.environment}`,
    };
  } catch (e: any) {
    afip = {
      ok: false,
      error: e.message?.slice(0, 200) || 'Error AFIP',
      environment: process.env.AFIP_ENVIRONMENT || 'testing',
    };
  }

  const aiResult = await testAIConnection();
  const ai: IntegrationsReport['ai'] = aiResult.ok
    ? {
        ok: true,
        provider: aiResult.provider,
        available: aiResult.available,
        detail: `IA operativa (${aiResult.provider})`,
      }
    : {
        ok: false,
        error: aiResult.error,
        available: aiResult.available,
      };

  const email: IntegrationCheck = process.env.RESEND_API_KEY
    ? { ok: true, detail: 'Resend configurado' }
    : { ok: false, error: 'RESEND_API_KEY no configurada' };

  return {
    timestamp: new Date().toISOString(),
    env,
    database,
    afip,
    ai,
    email,
  };
}
