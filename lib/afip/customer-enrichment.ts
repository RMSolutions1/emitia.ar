import { getPersona, getPersonaFallback, buildPersonaName, determineTaxCondition } from './ws-padron';
import type { AFIPPersonaData } from './ws-padron';

export interface CustomerLike {
  id?: string | null;
  name?: string | null;
  document?: string | null;
  documentType?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  taxCondition?: string | null;
  email?: string | null;
  phone?: string | null;
}

export function cleanDocument(document: string): string {
  return document.replace(/[-\s.]/g, '');
}

/** Cliente con CUIT/CUIL sin domicilio o con condición IVA genérica → consultar AFIP */
export function customerNeedsAfipEnrichment(customer: CustomerLike): boolean {
  const clean = cleanDocument(customer.document || '');
  if (clean.length !== 11) return false;

  const missingAddress = !customer.address?.trim();
  const defaultTax = !customer.taxCondition || customer.taxCondition === 'consumidor_final';

  return missingAddress || defaultTax;
}

export function mergeCustomerWithPersona(
  local: CustomerLike,
  persona: AFIPPersonaData,
  documentType: string,
): CustomerLike {
  const cleanDoc = cleanDocument(local.document || String(persona.idPersona));
  const afipTax = determineTaxCondition(persona.impuestos, persona.tipoPersona, cleanDoc);
  const afipAddress = persona.domicilioFiscal?.direccion?.trim() || '';
  const afipCity = persona.domicilioFiscal?.localidad?.trim() || '';
  const afipProvince = persona.domicilioFiscal?.descripcionProvincia?.trim() || '';

  const keepLocalTax =
    !!local.taxCondition && local.taxCondition !== 'consumidor_final';

  return {
    id: local.id,
    name: local.name?.trim() || buildPersonaName(persona),
    document: cleanDoc,
    documentType: local.documentType || documentType,
    email: local.email,
    phone: local.phone,
    address: local.address?.trim() || afipAddress,
    city: local.city?.trim() || afipCity,
    province: local.province?.trim() || afipProvince,
    taxCondition: keepLocalTax ? local.taxCondition! : afipTax,
  };
}

export async function fetchPersonaFromAfip(
  cuit: string,
  companyCuit?: string,
): Promise<AFIPPersonaData | null> {
  try {
    const persona = await getPersona(cuit, companyCuit);
    if (persona) return persona;
  } catch (err: any) {
    console.log('[Enrichment] AFIP SOAP:', (err?.message || '').substring(0, 120));
  }

  try {
    return await getPersonaFallback(cuit);
  } catch (err: any) {
    console.log('[Enrichment] Fallback:', (err?.message || '').substring(0, 120));
  }

  return null;
}
