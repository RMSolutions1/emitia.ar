/**
 * AFIP Module - Exportaciones centrales
 */
export { getTicketAcceso, clearTicketCache, getAFIPCredentials } from './wsaa';

import prisma from '@/lib/db';

/**
 * Obtiene el CUIT de la empresa del usuario para el modelo de delegación.
 * En el modelo de delegación, EMITIA (CUIT master) autentica ante AFIP,
 * pero se usa el CUIT de la empresa del usuario como cuitRepresentada.
 */
export async function getCompanyCuit(companyId: string | null | undefined): Promise<string | undefined> {
  if (!companyId) return undefined;
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { cuit: true },
    });
    return company?.cuit || undefined;
  } catch (error) {
    console.error('[AFIP] Error obteniendo CUIT de empresa:', error);
    return undefined;
  }
}
export {
  checkServerStatus,
  getLastAuthorizedVoucher,
  requestCAE,
  consultVoucher,
  getEnabledVoucherTypes,
  getPointsOfSale,
  generateAFIPQR,
  CBTE_TIPOS,
  DOC_TIPOS,
  IVA_TIPOS,
  CONCEPTOS,
  MONEDAS,
  CONDICION_IVA_RECEPTOR,
} from './wsfev1';
export type {
  InvoiceRequest,
  InvoiceResponse,
  InvoiceItem,
  CbteAsociado,
  ServerStatus,
} from './wsfev1';
export {
  getPersona,
  getPersonaFallback,
  determineTaxCondition,
  buildPersonaName,
  PROVINCIAS_MAP,
} from './ws-padron';
export type { AFIPPersonaData } from './ws-padron';
export {
  parseAfipCalendarDate,
  formatAfipCalendarDate,
  toAfipDateString,
  daysUntilAfipCalendarDate,
} from './date-utils';
