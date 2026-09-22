import crypto from 'crypto';
import prisma from '@/lib/db';
import { decrypt } from '@/lib/encryption';

interface MPCredentials {
  accessToken: string;
  publicKey?: string;
  environment: 'sandbox' | 'production';
  mpUserId?: string;
  mpPosId?: string;
  companyId?: string;
}

interface MPPreferenceItem {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
}

interface MPPayer {
  name?: string;
  email?: string;
  identification?: {
    type: string;
    number: string;
  };
}

interface MPPreferenceInput {
  items: MPPreferenceItem[];
  payer?: MPPayer;
  back_urls?: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return?: string;
  external_reference?: string;
  notification_url?: string;
}

interface MPPreference {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

function detectMPEnvironment(accessToken: string, stored: string): 'sandbox' | 'production' {
  if (accessToken.startsWith('TEST-')) return 'sandbox';
  if (accessToken.startsWith('APP_USR-')) return 'production';
  return stored === 'production' ? 'production' : 'sandbox';
}

function parseMetadata(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function getMPCredentials(companyId?: string): Promise<MPCredentials | null> {
  try {
    const where: { isActive: boolean; companyId?: string } = { isActive: true };
    if (companyId) where.companyId = companyId;

    const configs = await prisma.apiConfiguration.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    const config = configs.find(c => c.provider.toLowerCase() === 'mercadopago');

    if (!config || !config.accessToken) {
      return null;
    }

    const metadata = parseMetadata(config.metadata);
    const accessToken = decrypt(config.accessToken);
    const environment = detectMPEnvironment(accessToken, config.environment as string);

    return {
      accessToken,
      publicKey: config.publicKey ? decrypt(config.publicKey) : undefined,
      environment,
      mpUserId: metadata.mpUserId || undefined,
      mpPosId: metadata.mpPosId || undefined,
      companyId: config.companyId,
    };
  } catch (error) {
    console.error('Error getting MP credentials:', error);
    return null;
  }
}

export async function validateMPAccessToken(accessToken: string): Promise<{ valid: boolean; userId?: string; error?: string }> {
  const token = accessToken.trim();
  const response = await fetch('https://api.mercadopago.com/users/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.ok) {
    const data = await response.json();
    return { valid: true, userId: String(data.id) };
  }
  const errText = await response.text().catch(() => '');
  return {
    valid: false,
    error: errText.slice(0, 200) || `HTTP ${response.status}`,
  };
}

export async function getMPUserInfo(companyId?: string): Promise<{ id: string; nickname?: string; email?: string } | null> {
  const credentials = await getMPCredentials(companyId);
  if (!credentials) return null;

  const response = await fetch('https://api.mercadopago.com/users/me', {
    headers: { Authorization: `Bearer ${credentials.accessToken}` },
  });

  if (!response.ok) return null;
  const data = await response.json();
  return {
    id: String(data.id),
    nickname: data.nickname,
    email: data.email,
  };
}

export interface MPPosDevice {
  id: number;
  external_id: string;
  name: string;
  store_id?: string;
}

export async function listMPPosDevices(companyId?: string): Promise<MPPosDevice[]> {
  const credentials = await getMPCredentials(companyId);
  if (!credentials) return [];

  const response = await fetch('https://api.mercadopago.com/pos?limit=50', {
    headers: { Authorization: `Bearer ${credentials.accessToken}` },
  });

  if (!response.ok) return [];
  const data = await response.json();
  return (data.results || []).map((pos: MPPosDevice) => ({
    id: pos.id,
    external_id: pos.external_id,
    name: pos.name,
    store_id: pos.store_id,
  }));
}

/** Crea tienda + caja por defecto si la cuenta MP no tiene POS (requerido para QR) */
export async function ensureMPDefaultPos(
  companyId?: string,
): Promise<{ mpUserId: string; mpPosId: string } | null> {
  const credentials = await getMPCredentials(companyId);
  if (!credentials) return null;

  const user = await getMPUserInfo(companyId);
  if (!user?.id) return null;

  const existing = await listMPPosDevices(companyId);
  if (existing.length > 0) {
    return { mpUserId: user.id, mpPosId: existing[0].external_id };
  }

  const storeRes = await fetch(`https://api.mercadopago.com/users/${user.id}/stores`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${credentials.accessToken}`,
    },
    body: JSON.stringify({
      name: 'EMITIA',
      external_id: `EMITIA_STORE_${user.id}`,
      location: {
        street_number: '1',
        street_name: 'Local comercial',
        city_name: 'Buenos Aires',
        state_name: 'Buenos Aires',
        latitude: -34.6037,
        longitude: -58.3816,
        reference: 'EMITIA ERP',
      },
    }),
  });

  if (!storeRes.ok) {
    console.error('MP store create error:', await storeRes.text());
    return null;
  }

  const store = await storeRes.json();
  if (!store?.id) return null;

  const posRes = await fetch('https://api.mercadopago.com/pos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${credentials.accessToken}`,
    },
    body: JSON.stringify({
      name: 'EMITIA PDV',
      store_id: store.id,
      external_id: `EMITIA_POS_${user.id}`,
      fixed_amount: false,
      category: 621102,
    }),
  });

  if (!posRes.ok) {
    console.error('MP POS create error:', await posRes.text());
    return null;
  }

  const pos = await posRes.json();
  if (!pos?.external_id) return null;

  return { mpUserId: user.id, mpPosId: pos.external_id };
}

async function postMPPreference(
  credentials: MPCredentials,
  payload: Record<string, unknown>,
): Promise<{ ok: true; data: MPPreference } | { ok: false; error: unknown }> {
  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${credentials.accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return { ok: false, error };
  }
  return { ok: true, data: await response.json() };
}

function extractMPErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Error creating MP preference';
  const e = error as Record<string, unknown>;
  const cause = Array.isArray(e.cause) ? e.cause[0] : null;
  const causeDesc = cause && typeof cause === 'object' ? (cause as { description?: string }).description : undefined;
  const msg = e.message || e.error || causeDesc;
  return typeof msg === 'string' ? msg : JSON.stringify(msg);
}

function isMPPolicyError(message: string): boolean {
  return /UNAUTHORIZED|policy|notific/i.test(message);
}

export async function createMPPreference(data: MPPreferenceInput, companyId?: string): Promise<MPPreference> {
  const credentials = await getMPCredentials(companyId);
  if (!credentials) {
    throw new Error('MercadoPago no está configurado');
  }

  const baseItems = data.items.map(item => ({
    title: item.title.substring(0, 256),
    quantity: item.quantity,
    unit_price: Number(item.unit_price),
    currency_id: item.currency_id || 'ARS',
  }));

  const hasValidBackUrls = data.back_urls?.success?.startsWith('https://');
  const hasValidWebhook = data.notification_url?.startsWith('https://');

  const attempts: Record<string, unknown>[] = [
    {
      items: baseItems,
      external_reference: data.external_reference,
      ...(data.payer?.email ? { payer: data.payer } : {}),
      ...(hasValidBackUrls && data.back_urls ? { back_urls: data.back_urls, auto_return: data.auto_return || 'approved' } : {}),
      ...(hasValidWebhook ? { notification_url: data.notification_url } : {}),
    },
    {
      items: baseItems,
      external_reference: data.external_reference,
      ...(hasValidBackUrls && data.back_urls ? { back_urls: data.back_urls } : {}),
    },
    {
      items: baseItems,
      external_reference: data.external_reference,
    },
  ];

  let lastError: unknown = null;
  for (const payload of attempts) {
    const result = await postMPPreference(credentials, payload);
    if (result.ok) return result.data;
    lastError = result.error;
    const msg = extractMPErrorMessage(result.error);
    if (!isMPPolicyError(msg)) break;
  }

  console.error('MP API Error:', lastError);
  throw new Error(extractMPErrorMessage(lastError));
}

export async function getMPPayment(paymentId: string | number, companyId?: string): Promise<any> {
  try {
    const credentials = await getMPCredentials(companyId);
    if (!credentials) {
      throw new Error('MercadoPago no está configurado');
    }

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error fetching payment from MercadoPago');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting MP payment:', error);
    throw error;
  }
}

export async function getMPMerchantOrder(orderId: string | number, companyId?: string): Promise<any> {
  try {
    const credentials = await getMPCredentials(companyId);
    if (!credentials) {
      throw new Error('MercadoPago no está configurado');
    }

    const response = await fetch(`https://api.mercadopago.com/merchant_orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error fetching merchant order from MercadoPago');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting MP merchant order:', error);
    throw error;
  }
}

export async function refundMPPayment(paymentId: string | number, amount?: number, companyId?: string): Promise<any> {
  try {
    const credentials = await getMPCredentials(companyId);
    if (!credentials) {
      throw new Error('MercadoPago no está configurado');
    }

    const body: { amount?: number } = {};
    if (amount) body.amount = amount;

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credentials.accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error processing refund');
    }

    return await response.json();
  } catch (error) {
    console.error('Error refunding MP payment:', error);
    throw error;
  }
}

/** QR dinámico para cobro presencial en mostrador (MP Instore) */
export async function createMPQRPayment(
  data: { amount: number; description: string; external_reference: string },
  companyId?: string,
): Promise<{ qr_data: string; in_store_order_id?: string } | null> {
  try {
    const credentials = await getMPCredentials(companyId);
    if (!credentials) {
      throw new Error('MercadoPago no está configurado');
    }

    if (!credentials.mpUserId || !credentials.mpPosId) {
      throw new Error('Configure User ID y POS ID de MercadoPago en Integraciones');
    }

    const response = await fetch(
      `https://api.mercadopago.com/instore/orders/qr/seller/collectors/${credentials.mpUserId}/pos/${credentials.mpPosId}/qrs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${credentials.accessToken}`,
        },
        body: JSON.stringify({
          external_reference: data.external_reference,
          title: data.description,
          description: data.description,
          total_amount: data.amount,
          items: [{
            title: data.description,
            unit_price: data.amount,
            quantity: 1,
            unit_measure: 'unit',
            total_amount: data.amount,
          }],
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('MP QR API Error:', error);
      throw new Error(error.message || error.error || 'Error al crear QR de MercadoPago');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating MP QR payment:', error);
    throw error;
  }
}

export function verifyMPWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
  secret: string,
): boolean {
  if (!xSignature || !secret || !dataId) return false;

  const parts = Object.fromEntries(
    xSignature.split(',').map((part) => {
      const [key, value] = part.split('=');
      return [key.trim(), (value || '').trim()];
    }),
  ) as Record<string, string>;

  const ts = parts.ts;
  const hash = parts.v1;
  if (!ts || !hash) return false;

  const manifest = `id:${dataId};request-id:${xRequestId || ''};ts:${ts};`;
  const computed = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return computed === hash;
}

export async function getMPWebhookSecret(companyId?: string): Promise<string | null> {
  if (process.env.MERCADOPAGO_WEBHOOK_SECRET) {
    return process.env.MERCADOPAGO_WEBHOOK_SECRET;
  }

  try {
    const where: { isActive: boolean; companyId?: string } = { isActive: true };
    if (companyId) where.companyId = companyId;

    const configs = await prisma.apiConfiguration.findMany({ where });
    const config = configs.find(c => c.provider.toLowerCase() === 'mercadopago');

    if (config?.webhookSecret) {
      return decrypt(config.webhookSecret);
    }
  } catch {
    // fallback below
  }

  const credentials = await getMPCredentials(companyId);
  return credentials?.accessToken || null;
}
