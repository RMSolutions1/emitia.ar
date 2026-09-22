// Códigos de Comprobantes ARCA (AFIP) - Resolución General AFIP
// https://www.afip.gob.ar/fe/documentos/TABLACOMPROBANTES.xls
// Actualizado con todos los tipos de comprobantes vigentes

export const DOCUMENT_CODES = {
  // Tipo A (Responsable Inscripto a Responsable Inscripto o Monotributista)
  FACTURA_A: '001',
  NOTA_DEBITO_A: '002',
  NOTA_CREDITO_A: '003',
  
  // Tipo B (Responsable Inscripto a Consumidor Final o Exento)
  FACTURA_B: '006',
  NOTA_DEBITO_B: '007',
  NOTA_CREDITO_B: '008',
  RECIBO_B: '009',
  
  // Tipo C (Monotributistas o Exentos a cualquier sujeto)
  FACTURA_C: '011',
  NOTA_DEBITO_C: '012',
  NOTA_CREDITO_C: '013',
  RECIBO_C: '015',
  NOTA_VENTA_CONTADO_C: '016',
  
  // Operaciones con el Exterior (Exportación) - Tipo E
  FACTURA_E: '019',
  NOTA_DEBITO_E: '020',
  NOTA_CREDITO_E: '021',
  
  // Tipo T (Servicios a Turistas Extranjeros)
  FACTURA_T: '022',
  
  // Operación Sujeta a Retención (ex Tipo M - ahora es Factura A COD 51)
  FACTURA_A_RETENCION: '051',
  NOTA_DEBITO_A_RETENCION: '052',
  NOTA_CREDITO_A_RETENCION: '053',
  
  // Factura de Crédito Electrónica MiPyME (FCE) - Tipo A
  FCE_FACTURA_A: '201',
  FCE_NOTA_DEBITO_A: '202',
  FCE_NOTA_CREDITO_A: '203',
  
  // Factura de Crédito Electrónica MiPyME (FCE) - Tipo B
  FCE_FACTURA_B: '206',
  FCE_NOTA_DEBITO_B: '207',
  FCE_NOTA_CREDITO_B: '208',
  
  // Factura de Crédito Electrónica MiPyME (FCE) - Tipo C
  FCE_FACTURA_C: '211',
  FCE_NOTA_DEBITO_C: '212',
  FCE_NOTA_CREDITO_C: '213',
} as const;

export type DocumentCode = typeof DOCUMENT_CODES[keyof typeof DOCUMENT_CODES];

/** Normaliza códigos AFIP a 3 dígitos (ej. "1" → "001", "6" → "006"). */
export function normalizeDocumentCode(code?: string | number | null): string {
  if (code == null || code === '') return '';
  const raw = String(code).trim();
  if (!/^\d+$/.test(raw)) return raw;
  return raw.padStart(3, '0');
}

const NC_ND_CODES = new Set([
  2, 3, 7, 8, 12, 13, 20, 21, 52, 53, 202, 203, 207, 208, 212, 213,
]);

export function isNotaCreditoDebitoCode(code?: string | number | null): boolean {
  const normalized = normalizeDocumentCode(code);
  if (!normalized) return false;
  return NC_ND_CODES.has(parseInt(normalized, 10));
}

export const DOCUMENT_CODE_INFO: Record<string, {
  name: string;
  type: 'factura' | 'nota_debito' | 'nota_credito' | 'recibo' | 'nota_venta';
  letter: 'A' | 'B' | 'C' | 'E' | 'T' | 'FCE-A' | 'FCE-B' | 'FCE-C';
  isRetention?: boolean;
  description: string;
  requiresCUIT: boolean;
  isFCE?: boolean;
  isMiPyME?: boolean;
}> = {
  // Tipo A - Responsable Inscripto a RI o Monotributista
  '001': { name: 'Factura Electrónica A', type: 'factura', letter: 'A', description: 'Responsable Inscripto a R.I. o Monotributista', requiresCUIT: true },
  '002': { name: 'Nota de Débito Electrónica A', type: 'nota_debito', letter: 'A', description: 'Nota de Débito tipo A', requiresCUIT: true },
  '003': { name: 'Nota de Crédito Electrónica A', type: 'nota_credito', letter: 'A', description: 'Nota de Crédito tipo A', requiresCUIT: true },
  
  // Tipo B - Responsable Inscripto a Consumidor Final o Exento
  '006': { name: 'Factura Electrónica B', type: 'factura', letter: 'B', description: 'Responsable Inscripto a Consumidor Final o Exento', requiresCUIT: false },
  '007': { name: 'Nota de Débito Electrónica B', type: 'nota_debito', letter: 'B', description: 'Nota de Débito tipo B', requiresCUIT: false },
  '008': { name: 'Nota de Crédito Electrónica B', type: 'nota_credito', letter: 'B', description: 'Nota de Crédito tipo B', requiresCUIT: false },
  '009': { name: 'Recibo B', type: 'recibo', letter: 'B', description: 'Recibo tipo B', requiresCUIT: false },
  
  // Tipo C - Monotributista o Exento a cualquier sujeto
  '011': { name: 'Factura Electrónica C', type: 'factura', letter: 'C', description: 'Monotributista o Exento a cualquier sujeto', requiresCUIT: false },
  '012': { name: 'Nota de Débito Electrónica C', type: 'nota_debito', letter: 'C', description: 'Nota de Débito tipo C', requiresCUIT: false },
  '013': { name: 'Nota de Crédito Electrónica C', type: 'nota_credito', letter: 'C', description: 'Nota de Crédito tipo C', requiresCUIT: false },
  '015': { name: 'Recibo C', type: 'recibo', letter: 'C', description: 'Recibo tipo C', requiresCUIT: false },
  '016': { name: 'Nota de Venta al Contado C', type: 'nota_venta', letter: 'C', description: 'Nota de Venta al Contado tipo C', requiresCUIT: false },
  
  // Tipo E - Operaciones con el Exterior (Exportación)
  '019': { name: 'Factura de Exportación E', type: 'factura', letter: 'E', description: 'Factura por operaciones con el exterior', requiresCUIT: true },
  '020': { name: 'Nota de Débito E (Exportación)', type: 'nota_debito', letter: 'E', description: 'Nota de Débito por operaciones con el exterior', requiresCUIT: true },
  '021': { name: 'Nota de Crédito E (Exportación)', type: 'nota_credito', letter: 'E', description: 'Nota de Crédito por operaciones con el exterior', requiresCUIT: true },
  
  // Tipo T - Servicios a Turistas Extranjeros
  '022': { name: 'Factura Electrónica T', type: 'factura', letter: 'T', description: 'Servicios a turistas extranjeros', requiresCUIT: false },
  
  // Tipo A con Retención - Operación Sujeta a Retención (ex Factura M, ahora es Factura A COD 51)
  '051': { name: 'Factura A (Sujeta a Retención)', type: 'factura', letter: 'A', isRetention: true, description: 'Factura A - OPERACIÓN SUJETA A RETENCIÓN', requiresCUIT: true },
  '052': { name: 'Nota de Débito A (Sujeta a Retención)', type: 'nota_debito', letter: 'A', isRetention: true, description: 'Nota de Débito A - OPERACIÓN SUJETA A RETENCIÓN', requiresCUIT: true },
  '053': { name: 'Nota de Crédito A (Sujeta a Retención)', type: 'nota_credito', letter: 'A', isRetention: true, description: 'Nota de Crédito A - OPERACIÓN SUJETA A RETENCIÓN', requiresCUIT: true },
  
  // Factura de Crédito Electrónica MiPyME (FCE) - Tipo A
  '201': { name: 'FCE MiPyME - Factura A', type: 'factura', letter: 'FCE-A', description: 'Factura de Crédito Electrónica MiPyME tipo A', requiresCUIT: true, isFCE: true, isMiPyME: true },
  '202': { name: 'FCE MiPyME - Nota de Débito A', type: 'nota_debito', letter: 'FCE-A', description: 'Nota de Débito FCE MiPyME tipo A', requiresCUIT: true, isFCE: true, isMiPyME: true },
  '203': { name: 'FCE MiPyME - Nota de Crédito A', type: 'nota_credito', letter: 'FCE-A', description: 'Nota de Crédito FCE MiPyME tipo A', requiresCUIT: true, isFCE: true, isMiPyME: true },
  
  // Factura de Crédito Electrónica MiPyME (FCE) - Tipo B
  '206': { name: 'FCE MiPyME - Factura B', type: 'factura', letter: 'FCE-B', description: 'Factura de Crédito Electrónica MiPyME tipo B', requiresCUIT: false, isFCE: true, isMiPyME: true },
  '207': { name: 'FCE MiPyME - Nota de Débito B', type: 'nota_debito', letter: 'FCE-B', description: 'Nota de Débito FCE MiPyME tipo B', requiresCUIT: false, isFCE: true, isMiPyME: true },
  '208': { name: 'FCE MiPyME - Nota de Crédito B', type: 'nota_credito', letter: 'FCE-B', description: 'Nota de Crédito FCE MiPyME tipo B', requiresCUIT: false, isFCE: true, isMiPyME: true },
  
  // Factura de Crédito Electrónica MiPyME (FCE) - Tipo C
  '211': { name: 'FCE MiPyME - Factura C', type: 'factura', letter: 'FCE-C', description: 'Factura de Crédito Electrónica MiPyME tipo C', requiresCUIT: false, isFCE: true, isMiPyME: true },
  '212': { name: 'FCE MiPyME - Nota de Débito C', type: 'nota_debito', letter: 'FCE-C', description: 'Nota de Débito FCE MiPyME tipo C', requiresCUIT: false, isFCE: true, isMiPyME: true },
  '213': { name: 'FCE MiPyME - Nota de Crédito C', type: 'nota_credito', letter: 'FCE-C', description: 'Nota de Crédito FCE MiPyME tipo C', requiresCUIT: false, isFCE: true, isMiPyME: true },
};

export const TAX_CONDITIONS = {
  RESPONSABLE_INSCRIPTO: 'responsable_inscripto',
  CONSUMIDOR_FINAL: 'consumidor_final',
  MONOTRIBUTISTA: 'monotributista',
  EXENTO: 'exento',
  NO_RESPONSABLE: 'no_responsable',
} as const;

export const TAX_CONDITION_LABELS: Record<string, string> = {
  responsable_inscripto: 'Responsable Inscripto',
  consumidor_final: 'Consumidor Final',
  monotributista: 'Monotributista',
  exento: 'Exento',
  no_responsable: 'No Responsable',
};

// Opciones adicionales para determinar el tipo de documento
export interface DocumentTypeOptions {
  isFCE?: boolean;        // Si es Factura de Crédito Electrónica MiPyME
  isExport?: boolean;     // Si es operación de exportación
  isTourist?: boolean;    // Si es servicio a turista extranjero
  hasRetention?: boolean; // Si tiene retención (Factura A COD 51 - ex Factura M)
}

// Determina qué tipo de factura emitir según condición del emisor y receptor
export function determineDocumentType(
  emisorCondition: string,
  receptorCondition: string,
  documentType: 'factura' | 'nota_debito' | 'nota_credito' | 'recibo',
  options: DocumentTypeOptions = {}
): string {
  const { isFCE, isExport, isTourist, hasRetention } = options;

  // Operaciones de exportación (Tipo E)
  if (isExport) {
    switch (documentType) {
      case 'factura': return DOCUMENT_CODES.FACTURA_E;
      case 'nota_debito': return DOCUMENT_CODES.NOTA_DEBITO_E;
      case 'nota_credito': return DOCUMENT_CODES.NOTA_CREDITO_E;
      default: return DOCUMENT_CODES.FACTURA_E;
    }
  }

  // Servicios a turistas extranjeros (Tipo T)
  if (isTourist) {
    return DOCUMENT_CODES.FACTURA_T;
  }

  // Factura de Crédito Electrónica MiPyME (FCE)
  if (isFCE) {
    if (emisorCondition === 'monotributista' || emisorCondition === 'exento') {
      switch (documentType) {
        case 'factura': return DOCUMENT_CODES.FCE_FACTURA_C;
        case 'nota_debito': return DOCUMENT_CODES.FCE_NOTA_DEBITO_C;
        case 'nota_credito': return DOCUMENT_CODES.FCE_NOTA_CREDITO_C;
        default: return DOCUMENT_CODES.FCE_FACTURA_C;
      }
    }
    if (emisorCondition === 'responsable_inscripto') {
      if (receptorCondition === 'responsable_inscripto') {
        switch (documentType) {
          case 'factura': return DOCUMENT_CODES.FCE_FACTURA_A;
          case 'nota_debito': return DOCUMENT_CODES.FCE_NOTA_DEBITO_A;
          case 'nota_credito': return DOCUMENT_CODES.FCE_NOTA_CREDITO_A;
          default: return DOCUMENT_CODES.FCE_FACTURA_A;
        }
      }
      switch (documentType) {
        case 'factura': return DOCUMENT_CODES.FCE_FACTURA_B;
        case 'nota_debito': return DOCUMENT_CODES.FCE_NOTA_DEBITO_B;
        case 'nota_credito': return DOCUMENT_CODES.FCE_NOTA_CREDITO_B;
        default: return DOCUMENT_CODES.FCE_FACTURA_B;
      }
    }
  }

  // Si el emisor es Monotributista o Exento, siempre emite tipo C
  if (emisorCondition === 'monotributista' || emisorCondition === 'exento') {
    switch (documentType) {
      case 'factura': return DOCUMENT_CODES.FACTURA_C;
      case 'nota_debito': return DOCUMENT_CODES.NOTA_DEBITO_C;
      case 'nota_credito': return DOCUMENT_CODES.NOTA_CREDITO_C;
      case 'recibo': return DOCUMENT_CODES.RECIBO_C;
      default: return DOCUMENT_CODES.FACTURA_C;
    }
  }

  // Si el emisor es Responsable Inscripto
  if (emisorCondition === 'responsable_inscripto') {
    // Si el receptor es RI, emite tipo A (o A con retención COD 51 si corresponde)
    if (receptorCondition === 'responsable_inscripto' || receptorCondition === 'monotributista') {
      if (hasRetention) {
        switch (documentType) {
          case 'factura': return DOCUMENT_CODES.FACTURA_A_RETENCION;
          case 'nota_debito': return DOCUMENT_CODES.NOTA_DEBITO_A_RETENCION;
          case 'nota_credito': return DOCUMENT_CODES.NOTA_CREDITO_A_RETENCION;
          default: return DOCUMENT_CODES.FACTURA_A_RETENCION;
        }
      }
      switch (documentType) {
        case 'factura': return DOCUMENT_CODES.FACTURA_A;
        case 'nota_debito': return DOCUMENT_CODES.NOTA_DEBITO_A;
        case 'nota_credito': return DOCUMENT_CODES.NOTA_CREDITO_A;
        default: return DOCUMENT_CODES.FACTURA_A;
      }
    }
    // Si el receptor es CF, Exento, emite tipo B
    switch (documentType) {
      case 'factura': return DOCUMENT_CODES.FACTURA_B;
      case 'nota_debito': return DOCUMENT_CODES.NOTA_DEBITO_B;
      case 'nota_credito': return DOCUMENT_CODES.NOTA_CREDITO_B;
      case 'recibo': return DOCUMENT_CODES.RECIBO_B;
      default: return DOCUMENT_CODES.FACTURA_B;
    }
  }

  // Default: Factura B
  return DOCUMENT_CODES.FACTURA_B;
}

// Verifica si un código de documento es FCE MiPyME
export function isFCEDocument(documentCode: string): boolean {
  return ['201', '202', '203', '206', '207', '208', '211', '212', '213'].includes(documentCode);
}

// Verifica si un código es de operación sujeta a retención (ex Factura M)
export function isRetentionDocument(documentCode: string): boolean {
  return ['051', '052', '053'].includes(documentCode);
}

// Verifica si un código requiere CAE (todos los electrónicos)
export function requiresCAE(documentCode: string): boolean {
  // Todos los comprobantes electrónicos requieren CAE excepto tickets internos
  return DOCUMENT_CODE_INFO[documentCode] !== undefined;
}

// Obtiene la letra del comprobante según su código
export function getDocumentLetter(documentCode: string): string {
  const info = DOCUMENT_CODE_INFO[documentCode];
  if (!info) return '';
  // Extraer solo la letra principal (A, B, C, E, T)
  const letter = info.letter;
  if (letter.startsWith('FCE-')) return letter.substring(4) + ' (FCE)';
  return letter;
}

// Agrupa los códigos de documentos por categoría
export function getDocumentCodesByCategory(): Record<string, { code: string; name: string }[]> {
  return {
    'Tipo A (R.I. a R.I./Monotrib.)': [
      { code: '001', name: 'Factura A' },
      { code: '002', name: 'Nota de Débito A' },
      { code: '003', name: 'Nota de Crédito A' },
    ],
    'Tipo B (R.I. a Cons. Final/Exento)': [
      { code: '006', name: 'Factura B' },
      { code: '007', name: 'Nota de Débito B' },
      { code: '008', name: 'Nota de Crédito B' },
      { code: '009', name: 'Recibo B' },
    ],
    'Tipo C (Monotrib./Exento a todos)': [
      { code: '011', name: 'Factura C' },
      { code: '012', name: 'Nota de Débito C' },
      { code: '013', name: 'Nota de Crédito C' },
      { code: '015', name: 'Recibo C' },
      { code: '016', name: 'Nota de Venta C' },
    ],
    'Exportación (Tipo E)': [
      { code: '019', name: 'Factura E' },
      { code: '020', name: 'Nota de Débito E' },
      { code: '021', name: 'Nota de Crédito E' },
    ],
    'Turismo (Tipo T)': [
      { code: '022', name: 'Factura T' },
    ],
    'Tipo A - Sujeta a Retención (ex M)': [
      { code: '051', name: 'Factura A (Retención)' },
      { code: '052', name: 'Nota de Débito A (Retención)' },
      { code: '053', name: 'Nota de Crédito A (Retención)' },
    ],
    'FCE MiPyME - Tipo A': [
      { code: '201', name: 'FCE Factura A' },
      { code: '202', name: 'FCE Nota Débito A' },
      { code: '203', name: 'FCE Nota Crédito A' },
    ],
    'FCE MiPyME - Tipo B': [
      { code: '206', name: 'FCE Factura B' },
      { code: '207', name: 'FCE Nota Débito B' },
      { code: '208', name: 'FCE Nota Crédito B' },
    ],
    'FCE MiPyME - Tipo C': [
      { code: '211', name: 'FCE Factura C' },
      { code: '212', name: 'FCE Nota Débito C' },
      { code: '213', name: 'FCE Nota Crédito C' },
    ],
  };
}

// Formatea el número de comprobante según estándar AFIP: PPPP-NNNNNNNN
export function formatInvoiceNumber(pointOfSale: number, sequenceNumber: number): string {
  const pos = pointOfSale.toString().padStart(4, '0');
  const num = sequenceNumber.toString().padStart(8, '0');
  return `${pos}-${num}`;
}

// Obtiene el próximo número de secuencia para un tipo de documento y punto de venta
export async function getNextSequenceNumber(
  prisma: any,
  documentCode: string,
  pointOfSale: number
): Promise<{ sequenceNumber: number; invoiceNumber: string }> {
  // Obtener configuración del negocio
  let businessConfig = await prisma.businessConfig.findFirst();
  
  if (!businessConfig) {
    // Crear configuración por defecto
    businessConfig = await prisma.businessConfig.create({
      data: {
        businessName: 'Mi Empresa',
        currency: 'ARS',
        taxRate: 21,
        defaultPOS: 1,
      },
    });
  }

  // Buscar o crear secuencia para este tipo de documento y punto de venta
  let sequence = await prisma.documentSequence.findFirst({
    where: {
      businessConfigId: businessConfig.id,
      documentCode,
      pointOfSale,
    },
  });

  if (!sequence) {
    sequence = await prisma.documentSequence.create({
      data: {
        businessConfigId: businessConfig.id,
        documentCode,
        pointOfSale,
        nextNumber: 1,
      },
    });
  }

  const sequenceNumber = sequence.nextNumber;
  const invoiceNumber = formatInvoiceNumber(pointOfSale, sequenceNumber);

  // Incrementar el número de secuencia
  await prisma.documentSequence.update({
    where: { id: sequence.id },
    data: { nextNumber: sequenceNumber + 1 },
  });

  return { sequenceNumber, invoiceNumber };
}
