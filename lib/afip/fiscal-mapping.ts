import { determineDocumentType } from '@/lib/document-codes';

export function normalizeTaxCondition(condition?: string | null): string {
  if (!condition) return 'consumidor_final';
  const c = condition.toLowerCase().trim();
  if (c === 'monotributo') return 'monotributista';
  if (c === 'no_responsable') return 'no_categorizado';
  return c;
}

export function getCondicionIVAReceptorId(taxCondition?: string | null): number {
  switch (normalizeTaxCondition(taxCondition)) {
    case 'responsable_inscripto':
      return 1;
    case 'exento':
      return 4;
    case 'consumidor_final':
      return 5;
    case 'monotributista':
      return 6;
    case 'no_categorizado':
    case 'sujeto_no_categorizado':
      return 7;
    case 'proveedor_exterior':
      return 8;
    case 'cliente_exterior':
      return 9;
    case 'iva_liberado':
      return 10;
    case 'monotributista_social':
      return 13;
    case 'iva_no_alcanzado':
      return 15;
    default:
      return 5;
  }
}

export function getDocTipoFromDocument(document?: string | null, documentType?: string | null): number {
  if (documentType === 'CUIT') return 80;
  if (documentType === 'CUIL') return 86;
  if (documentType === 'DNI') return 96;
  const clean = (document || '').replace(/\D/g, '');
  if (clean.length === 11) return 80;
  if (clean.length >= 7 && clean.length <= 8) return 96;
  return 99;
}

export function getIvaIdFromRate(taxRate: number): number {
  if (taxRate === 21) return 5;
  if (taxRate === 10.5) return 4;
  if (taxRate === 27) return 6;
  if (taxRate === 5) return 8;
  if (taxRate === 2.5) return 9;
  return 3;
}

export function getDocumentLetterFromCode(code: string | number): string {
  const n = typeof code === 'string' ? parseInt(code, 10) : code;
  if ([1, 2, 3, 51, 52, 53, 201, 202, 203].includes(n)) return 'A';
  if ([6, 7, 8, 9, 206, 207, 208].includes(n)) return 'B';
  if ([11, 12, 13, 15, 16, 211, 212, 213].includes(n)) return 'C';
  return 'B';
}

export interface CAEValidationResult {
  ok: boolean;
  error?: string;
  suggestedDocumentCode?: string;
  suggestedDocumentName?: string;
}

/** Valida que el tipo de comprobante sea compatible con emisor/receptor según ARCA */
export function validateCAECompatibility(params: {
  documentCode: string | number;
  emisorCondition?: string | null;
  receptorCondition?: string | null;
  customerDocument?: string | null;
}): CAEValidationResult {
  const code = String(params.documentCode).padStart(3, '0');
  const emisor = normalizeTaxCondition(params.emisorCondition || 'responsable_inscripto');
  const receptor = normalizeTaxCondition(params.receptorCondition || 'consumidor_final');
  const letter = getDocumentLetterFromCode(code);

  const suggested = determineDocumentType(emisor, receptor, 'factura');
  const suggestedLetter = getDocumentLetterFromCode(suggested);

  if (letter === 'B') {
    if (receptor === 'responsable_inscripto' || receptor === 'monotributista') {
      return {
        ok: false,
        error: `Factura B no es válida para un cliente ${receptor === 'responsable_inscripto' ? 'Responsable Inscripto' : 'Monotributista'}. Debe emitir Factura ${suggestedLetter}.`,
        suggestedDocumentCode: suggested,
        suggestedDocumentName: suggestedLetter === 'A' ? 'Factura A' : 'Factura C',
      };
    }
  }

  if (letter === 'A' && receptor === 'consumidor_final' && !params.customerDocument) {
    return {
      ok: false,
      error: 'Factura A requiere CUIT/CUIL del cliente. Para consumidor final use Factura B.',
      suggestedDocumentCode: '006',
      suggestedDocumentName: 'Factura B',
    };
  }

  if (letter === 'C' && emisor === 'responsable_inscripto') {
    return {
      ok: false,
      error: 'Un Responsable Inscripto no puede emitir Factura C. Use Factura A o B según el cliente.',
      suggestedDocumentCode: suggested,
      suggestedDocumentName: suggestedLetter === 'A' ? 'Factura A' : 'Factura B',
    };
  }

  const cleanDoc = (params.customerDocument || '').replace(/\D/g, '');
  if (getDocTipoFromDocument(cleanDoc) === 80 && cleanDoc.length === 11 && cleanDoc.startsWith('20')) {
    // CUIT persona física / posible validación básica — AFIP validará inactivos
  }

  return { ok: true };
}

export function formatAfipErrors(
  errores?: Array<{ code: string; msg: string }>,
  observaciones?: Array<{ code: string; msg: string }>,
): string {
  const parts: string[] = [];
  for (const e of errores || []) {
    parts.push(`[${e.code}] ${e.msg}`);
  }
  for (const o of observaciones || []) {
    parts.push(`[Obs. ${o.code}] ${o.msg}`);
  }
  return parts.join(' · ') || 'AFIP rechazó la solicitud de CAE';
}
