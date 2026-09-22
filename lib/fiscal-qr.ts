export type FiscalQrPayload = {
  ver: number;
  fecha: string;
  cuit: number;
  ptoVta: number;
  tipoCmp: number;
  nroCmp: number;
  importe: number;
  moneda: 'PES' | 'DOL';
  ctz: number;
  tipoDocRec: number;
  nroDocRec: number;
  tipoCodAut: 'E';
  codAut: number;
};

export function buildFiscalQrPayload(input: {
  date: Date | string;
  cuit: string;
  pointOfSale: number;
  documentCode: string;
  documentNumber: string;
  total: number;
  currency?: string;
  currencyRate?: number;
  customerCuit?: string;
  customerDocument?: string;
  cae: string;
}): FiscalQrPayload {
  const cuit = Number(input.cuit.replace(/\D/g, ''));
  const tipoCmp = Number.parseInt(input.documentCode || '0', 10) || 0;
  const nroCmp = Number.parseInt(input.documentNumber.split('-').pop() || '0', 10) || 0;
  const docRecRaw = (input.customerCuit || input.customerDocument || '0').replace(/\D/g, '');
  const tipoDocRec = input.customerCuit ? 80 : input.customerDocument ? 96 : 99;

  return {
    ver: 1,
    fecha: new Date(input.date).toISOString().slice(0, 10),
    cuit,
    ptoVta: input.pointOfSale,
    tipoCmp,
    nroCmp,
    importe: Number(input.total.toFixed(2)),
    moneda: input.currency === 'USD' ? 'DOL' : 'PES',
    ctz: input.currencyRate || 1,
    tipoDocRec,
    nroDocRec: Number(docRecRaw || '0'),
    tipoCodAut: 'E',
    codAut: Number(input.cae.replace(/\D/g, '')),
  };
}

export function buildFiscalQrUrl(payload: FiscalQrPayload): string {
  const json = JSON.stringify(payload);
  const base64 =
    typeof window !== 'undefined'
      ? btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, 'utf8').toString('base64');
  return `https://www.afip.gob.ar/fe/qr/?p=${base64}`;
}

export function buildFiscalQrImageUrl(qrUrl: string, size = 120): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrUrl)}`;
}
