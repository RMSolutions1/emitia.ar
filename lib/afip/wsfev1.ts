/**
 * WSFEv1 - Web Service de Factura Electrónica v1
 * Maneja la emisión de comprobantes electrónicos ante AFIP/ARCA
 */
import { getTicketAcceso, getAFIPCredentials } from './wsaa';

const WSFEV1_URLS = {
  testing: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL',
  production: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL',
};

// Tipos de comprobante AFIP
export const CBTE_TIPOS: Record<number, string> = {
  1: 'Factura A',
  2: 'Nota de Débito A',
  3: 'Nota de Crédito A',
  6: 'Factura B',
  7: 'Nota de Débito B',
  8: 'Nota de Crédito B',
  11: 'Factura C',
  12: 'Nota de Débito C',
  13: 'Nota de Crédito C',
  51: 'Factura M',
  52: 'Nota de Débito M',
  53: 'Nota de Crédito M',
  201: 'Factura de Crédito Electrónica MiPyMEs A',
  202: 'Nota de Débito Electrónica MiPyMEs A',
  203: 'Nota de Crédito Electrónica MiPyMEs A',
  206: 'Factura de Crédito Electrónica MiPyMEs B',
  207: 'Nota de Débito Electrónica MiPyMEs B',
  208: 'Nota de Crédito Electrónica MiPyMEs B',
  211: 'Factura de Crédito Electrónica MiPyMEs C',
  212: 'Nota de Débito Electrónica MiPyMEs C',
  213: 'Nota de Crédito Electrónica MiPyMEs C',
};

// Tipos de documento
export const DOC_TIPOS: Record<number, string> = {
  80: 'CUIT',
  86: 'CUIL',
  96: 'DNI',
  99: 'Doc. Otro / Consumidor Final',
  0: 'CI Policía Federal',
  1: 'CI Buenos Aires',
  2: 'CI Catamarca',
  3: 'CI Córdoba',
  4: 'CI Corrientes',
  5: 'CI Entre Ríos',
  6: 'CI Jujuy',
  7: 'CI Mendoza',
  8: 'CI La Rioja',
  9: 'CI Salta',
  10: 'CI San Juan',
  11: 'CI San Luis',
  12: 'CI Santa Fe',
  13: 'CI Santiago del Estero',
  14: 'CI Tucumán',
  16: 'CI Chaco',
  17: 'CI Chubut',
  18: 'CI Formosa',
  19: 'CI Misiones',
  20: 'CI Neuquén',
  21: 'CI La Pampa',
  22: 'CI Río Negro',
  23: 'CI Santa Cruz',
  24: 'CI Tierra del Fuego',
  30: 'Certificado de Migración',
  33: 'Pasaporte',
  34: 'DNI Extranjero',
};

// Tipos de IVA
export const IVA_TIPOS: Record<number, { descripcion: string; alicuota: number }> = {
  3: { descripcion: 'IVA 0%', alicuota: 0 },
  4: { descripcion: 'IVA 10.5%', alicuota: 10.5 },
  5: { descripcion: 'IVA 21%', alicuota: 21 },
  6: { descripcion: 'IVA 27%', alicuota: 27 },
  8: { descripcion: 'IVA 5%', alicuota: 5 },
  9: { descripcion: 'IVA 2.5%', alicuota: 2.5 },
};

// Conceptos
export const CONCEPTOS: Record<number, string> = {
  1: 'Productos',
  2: 'Servicios',
  3: 'Productos y Servicios',
};

// Monedas
export const MONEDAS: Record<string, string> = {
  PES: 'Peso Argentino',
  DOL: 'Dólar Estadounidense',
  '012': 'Real Brasileño',
  '014': 'Corona Danesa',
  '007': 'Florín Holandés',
  '049': 'Bolívar Venezolano',
  '002': 'Dólar Libre EEUU',
};

export interface InvoiceItem {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  bonificacion?: number;
  ivaId: number; // 3=0%, 4=10.5%, 5=21%, 6=27%, 8=5%, 9=2.5%
}

// Condiciones IVA del receptor (RG 5616/2024)
export const CONDICION_IVA_RECEPTOR: Record<number, string> = {
  1: 'IVA Responsable Inscripto',
  4: 'IVA Sujeto Exento',
  5: 'Consumidor Final',
  6: 'Responsable Monotributo',
  7: 'Sujeto No Categorizado',
  8: 'Proveedor del Exterior',
  9: 'Cliente del Exterior',
  10: 'IVA Liberado – Ley Nº 19.640',
  13: 'Monotributista Social',
  15: 'IVA No Alcanzado',
  16: 'Monotributo Trabajador Independiente Promovido',
};

export interface CbteAsociado {
  tipo: number;       // Tipo del comprobante asociado (ej: 1=Factura A)
  puntoVenta: number; // Punto de venta del comprobante asociado
  numero: number;     // Número del comprobante asociado
  cuit?: string;      // CUIT del emisor del comprobante asociado
  fecha?: string;     // YYYYMMDD - Fecha del comprobante asociado
}

export interface InvoiceRequest {
  puntoVenta: number;
  tipoComprobante: number;
  concepto: number; // 1=Prod, 2=Serv, 3=Prod+Serv
  tipoDocumento: number; // 80=CUIT, 96=DNI, 99=CF
  nroDocumento: string;
  items: InvoiceItem[];
  condicionIVAReceptorId?: number; // RG 5616 - mandatory from June 2026
  // Comprobante asociado (obligatorio para NC y ND)
  cbtesAsociados?: CbteAsociado[];
  // Optional for services
  fechaServicioDesde?: string; // YYYYMMDD
  fechaServicioHasta?: string; // YYYYMMDD
  fechaVencimientoPago?: string; // YYYYMMDD
  moneda?: string;
  cotizacion?: number;
  /** Número explícito para retry o emisión sincronizada con DB (debe ser lastAuthorized + 1) */
  numeroComprobante?: number;
}

export interface InvoiceResponse {
  success: boolean;
  cae?: string;
  caeVencimiento?: string;
  comprobanteNumero?: number;
  comprobanteFecha?: string;
  resultado?: string;
  errores?: Array<{ code: string; msg: string }>;
  observaciones?: Array<{ code: string; msg: string }>;
}

export interface ServerStatus {
  appServer: string;
  dbServer: string;
  authServer: string;
}

/**
 * Crea un cliente SOAP para WSFEv1
 */
async function getWSFEClient(environment: 'testing' | 'production') {
  const soap = require('soap');
  const wsdlUrl = WSFEV1_URLS[environment];
  const client = await soap.createClientAsync(wsdlUrl, {
    wsdl_options: { timeout: 30000 },
  });
  return client;
}

/**
 * Obtiene auth params para WSFEv1
 * @param companyCuit - CUIT de la empresa que factura (modelo delegación).
 *                      Si no se pasa, usa el CUIT del certificado (AFIP_CUIT).
 */
async function getAuthParams(companyCuit?: string) {
  const { certPem, keyPem, cuit, environment } = getAFIPCredentials();
  const ticket = await getTicketAcceso('wsfe', certPem, keyPem, environment);
  
  // En modelo delegación: companyCuit es el CUIT de la empresa cliente,
  // el certificado de EMITIA (AFIP_CUIT) se usa para autenticarse pero
  // se factura a nombre del companyCuit
  const facturaCuit = companyCuit || cuit;
  
  return {
    Auth: {
      Token: ticket.token,
      Sign: ticket.sign,
      Cuit: facturaCuit,
    },
    environment,
  };
}

/**
 * FEDummy - Verifica el estado del servidor
 */
export async function checkServerStatus(): Promise<ServerStatus> {
  const { environment } = getAFIPCredentials();
  const client = await getWSFEClient(environment);
  const [result] = await client.FEDummyAsync({});
  
  return {
    appServer: result.FEDummyResult?.AppServer || 'N/A',
    dbServer: result.FEDummyResult?.DbServer || 'N/A',
    authServer: result.FEDummyResult?.AuthServer || 'N/A',
  };
}

/**
 * FECompUltimoAutorizado - Obtiene el último comprobante autorizado
 */
export async function getLastAuthorizedVoucher(
  puntoVenta: number,
  tipoComprobante: number,
  companyCuit?: string
): Promise<number> {
  const { Auth, environment } = await getAuthParams(companyCuit);
  const client = await getWSFEClient(environment);
  
  const [result] = await client.FECompUltimoAutorizadoAsync({
    Auth,
    PtoVta: puntoVenta,
    CbteTipo: tipoComprobante,
  });
  
  const response = result.FECompUltimoAutorizadoResult;
  
  if (response.Errors) {
    const errors = Array.isArray(response.Errors.Err)
      ? response.Errors.Err
      : [response.Errors.Err];
    throw new Error(`AFIP Error: ${errors.map((e: any) => `${e.Code}: ${e.Msg}`).join(', ')}`);
  }
  
  return response.CbteNro || 0;
}

/**
 * FECAESolicitar - Solicita CAE para un comprobante
 */
export async function requestCAE(invoice: InvoiceRequest, companyCuit?: string): Promise<InvoiceResponse> {
  const { Auth, environment } = await getAuthParams(companyCuit);
  const client = await getWSFEClient(environment);
  
  // Get last authorized number
  const lastNumber = await getLastAuthorizedVoucher(
    invoice.puntoVenta,
    invoice.tipoComprobante,
    companyCuit
  );
  const nextNumber = invoice.numeroComprobante ?? lastNumber + 1;
  if (nextNumber !== lastNumber + 1) {
    console.warn(
      `[WSFEv1] Número explícito ${nextNumber} (último AFIP: ${lastNumber}). Debe coincidir con ${lastNumber + 1} para evitar rechazo.`,
    );
  }
  
  // Calculate totals
  let impNeto = 0;
  let impIVA = 0;
  const ivaArray: any[] = [];
  const ivaMap = new Map<number, { baseImp: number; importe: number }>;
  
  for (const item of invoice.items) {
    const subtotal = item.cantidad * item.precioUnitario - (item.bonificacion || 0);
    const ivaInfo = IVA_TIPOS[item.ivaId];
    const ivaAmount = subtotal * (ivaInfo?.alicuota || 0) / 100;
    
    impNeto += subtotal;
    impIVA += ivaAmount;
    
    // Group by IVA type
    const existing = ivaMap.get(item.ivaId);
    if (existing) {
      existing.baseImp += subtotal;
      existing.importe += ivaAmount;
    } else {
      ivaMap.set(item.ivaId, { baseImp: subtotal, importe: ivaAmount });
    }
  }
  
  // Build IVA array
  for (const [id, data] of ivaMap) {
    ivaArray.push({
      AlicIva: {
        Id: id,
        BaseImp: Math.round(data.baseImp * 100) / 100,
        Importe: Math.round(data.importe * 100) / 100,
      },
    });
  }
  
  const impTotal = Math.round((impNeto + impIVA) * 100) / 100;
  impNeto = Math.round(impNeto * 100) / 100;
  impIVA = Math.round(impIVA * 100) / 100;
  
  // Format date
  const today = new Date();
  const cbteFch = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  
  // Build request
  const feCAEReq: any = {
    FeCabReq: {
      CantReg: 1,
      PtoVta: invoice.puntoVenta,
      CbteTipo: invoice.tipoComprobante,
    },
    FeDetReq: {
      FECAEDetRequest: {
        Concepto: invoice.concepto,
        DocTipo: invoice.tipoDocumento,
        DocNro: invoice.nroDocumento.replace(/[-\s]/g, ''),
        CbteDesde: nextNumber,
        CbteHasta: nextNumber,
        CbteFch: cbteFch,
        ImpTotal: impTotal,
        ImpTotConc: 0, // No gravado
        ImpNeto: impNeto,
        ImpOpEx: 0, // Exento
        ImpTrib: 0, // Tributos
        ImpIVA: impIVA,
        MonId: invoice.moneda || 'PES',
        MonCotiz: invoice.cotizacion || 1,
        // RG 5616/2024 - Condición IVA del receptor (obligatorio desde Jun 2026)
        ...(invoice.condicionIVAReceptorId ? { CondicionIVAReceptorId: invoice.condicionIVAReceptorId } : {}),
      },
    },
  };
  
  // For Type C (Monotributo), IVA is 0 and no IVA array
  const isTypeC = [11, 12, 13, 211, 212, 213].includes(invoice.tipoComprobante);
  
  if (!isTypeC && ivaArray.length > 0) {
    feCAEReq.FeDetReq.FECAEDetRequest.Iva = { AlicIva: ivaArray.map((i: any) => i.AlicIva) };
  }
  
  if (isTypeC) {
    feCAEReq.FeDetReq.FECAEDetRequest.ImpIVA = 0;
    feCAEReq.FeDetReq.FECAEDetRequest.ImpNeto = impTotal;
  }
  
  // CbtesAsoc (required for NC/ND - tipos 2,3,7,8,12,13,52,53,202,203,207,208,212,213)
  const ncNdTipos = [2, 3, 7, 8, 12, 13, 52, 53, 202, 203, 207, 208, 212, 213];
  if (ncNdTipos.includes(invoice.tipoComprobante) && invoice.cbtesAsociados && invoice.cbtesAsociados.length > 0) {
    feCAEReq.FeDetReq.FECAEDetRequest.CbtesAsoc = {
      CbteAsoc: invoice.cbtesAsociados.map(asoc => ({
        Tipo: asoc.tipo,
        PtoVta: asoc.puntoVenta,
        Nro: asoc.numero,
        ...(asoc.cuit ? { Cuit: asoc.cuit.replace(/[-\s]/g, '') } : {}),
        ...(asoc.fecha ? { CbteFch: asoc.fecha } : {}),
      })),
    };
  }

  // Service dates (required for concept 2 or 3)
  if (invoice.concepto >= 2) {
    feCAEReq.FeDetReq.FECAEDetRequest.FchServDesde = invoice.fechaServicioDesde || cbteFch;
    feCAEReq.FeDetReq.FECAEDetRequest.FchServHasta = invoice.fechaServicioHasta || cbteFch;
    feCAEReq.FeDetReq.FECAEDetRequest.FchVtoPago = invoice.fechaVencimientoPago || cbteFch;
  }
  
  console.log('[WSFEv1] Solicitando CAE...', JSON.stringify(feCAEReq, null, 2));
  
  const [result] = await client.FECAESolicitarAsync({ Auth, FeCAEReq: feCAEReq });
  
  const response = result.FECAESolicitarResult;
  
  // Parse response
  const cabResp = response.FeCabResp;
  const detResp = response.FeDetResp?.FECAEDetResponse;
  const det = Array.isArray(detResp) ? detResp[0] : detResp;
  
  const invoiceResponse: InvoiceResponse = {
    success: cabResp?.Resultado === 'A',
    cae: det?.CAE || undefined,
    caeVencimiento: det?.CAEFchVto || undefined,
    comprobanteNumero: nextNumber,
    comprobanteFecha: cbteFch,
    resultado: cabResp?.Resultado,
  };
  
  // Collect errors
  if (response.Errors) {
    const errors = response.Errors.Err;
    invoiceResponse.errores = (Array.isArray(errors) ? errors : [errors]).map((e: any) => ({
      code: String(e.Code),
      msg: e.Msg,
    }));
  }
  
  // Collect observations  
  if (det?.Observaciones) {
    const obs = det.Observaciones.Obs;
    invoiceResponse.observaciones = (Array.isArray(obs) ? obs : [obs]).map((o: any) => ({
      code: String(o.Code),
      msg: o.Msg,
    }));
  }
  
  console.log('[WSFEv1] Respuesta:', JSON.stringify(invoiceResponse, null, 2));
  
  return invoiceResponse;
}

/**
 * FECompConsultar - Consulta un comprobante autorizado
 */
export async function consultVoucher(
  puntoVenta: number,
  tipoComprobante: number,
  nroComprobante: number,
  companyCuit?: string
) {
  const { Auth, environment } = await getAuthParams(companyCuit);
  const client = await getWSFEClient(environment);
  
  const [result] = await client.FECompConsultarAsync({
    Auth,
    FeCompConsReq: {
      CbteTipo: tipoComprobante,
      CbteNro: nroComprobante,
      PtoVta: puntoVenta,
    },
  });
  
  return result.FECompConsultarResult?.ResultGet || null;
}

/**
 * FEParamGetTiposCbte - Obtiene tipos de comprobantes habilitados
 */
export async function getEnabledVoucherTypes(companyCuit?: string) {
  const { Auth, environment } = await getAuthParams(companyCuit);
  const client = await getWSFEClient(environment);
  
  const [result] = await client.FEParamGetTiposCbteAsync({ Auth });
  const tipos = result.FEParamGetTiposCbteResult?.ResultGet?.CbteTipo;
  return Array.isArray(tipos) ? tipos : tipos ? [tipos] : [];
}

/**
 * FEParamGetPtosVenta - Obtiene puntos de venta habilitados
 */
export async function getPointsOfSale(companyCuit?: string) {
  const { Auth, environment } = await getAuthParams(companyCuit);
  const client = await getWSFEClient(environment);
  
  const [result] = await client.FEParamGetPtosVentaAsync({ Auth });
  const ptos = result.FEParamGetPtosVentaResult?.ResultGet?.PtoVenta;
  return Array.isArray(ptos) ? ptos : ptos ? [ptos] : [];
}

/**
 * Genera el URL del QR de AFIP para un comprobante
 */
export function generateAFIPQR(params: {
  ver: number;
  fecha: string; // YYYY-MM-DD
  cuit: string;
  ptoVta: number;
  tipoCmp: number;
  nroCmp: number;
  importe: number;
  moneda: string;
  ctz: number;
  tipoDocRec: number;
  nroDocRec: string;
  tipoCodAut: string; // 'E' for CAE
  codAut: string; // CAE number
}): string {
  const data = JSON.stringify(params);
  const base64 = Buffer.from(data).toString('base64');
  return `https://www.afip.gob.ar/fe/qr/?p=${base64}`;
}
