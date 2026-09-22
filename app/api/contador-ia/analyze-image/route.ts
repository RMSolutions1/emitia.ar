import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiChatJSON } from '@/lib/ai-provider';
import { extractDocumentText } from '@/lib/document-text-extract';

export const dynamic = 'force-dynamic';

const EXTRACTION_PROMPT = `Sos un experto en contabilidad argentina. Analizá la imagen que te envío y extraé toda la información relevante.

Si es una factura, ticket, recibo o comprobante fiscal, extraé:
- Tipo de comprobante (Factura A/B/C, Ticket, Recibo, NC, ND)
- Número de comprobante
- Fecha de emisión
- CUIT del emisor
- Razón social del emisor
- CUIT del receptor (si aparece)
- Razón social del receptor
- Condición IVA del emisor
- CAE y vencimiento (si aparece)
- Punto de venta
- Items/productos con cantidad, precio unitario y subtotal
- Subtotal, IVA, Total
- Forma de pago

Si es otro tipo de documento (remito, presupuesto, orden de compra, etc.), extraé toda la info relevante.

Respondé SIEMPRE en este formato JSON:
{
  "tipo": "factura_a" | "factura_b" | "factura_c" | "ticket" | "recibo" | "nota_credito" | "nota_debito" | "remito" | "presupuesto" | "otro",
  "numero": "0006-00000123",
  "fecha": "2026-01-15",
  "emisor": {
    "razonSocial": "...",
    "cuit": "20-12345678-9",
    "condicionIva": "responsable_inscripto" | "monotributista" | "exento"
  },
  "receptor": {
    "razonSocial": "...",
    "cuit": "...",
    "condicionIva": "..."
  },
  "items": [
    {
      "descripcion": "...",
      "cantidad": 1,
      "precioUnitario": 1000,
      "subtotal": 1000
    }
  ],
  "subtotal": 1000,
  "iva": 210,
  "total": 1210,
  "cae": "...",
  "caeVencimiento": "2026-01-25",
  "formaPago": "efectivo" | "tarjeta" | "transferencia" | "otro",
  "puntoVenta": 6,
  "observaciones": "Cualquier detalle adicional relevante",
  "resumen": "Breve descripción en texto natural de lo que se ve en la imagen"
}

Si NO es un comprobante fiscal, devolvé:
{
  "tipo": "otro",
  "resumen": "Descripción de lo que ves en la imagen",
  "datosExtraidos": { ... cualquier dato relevante }
}

Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userMessage = (formData.get('message') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';

    let userContent: unknown[];
    const extractedText = mimeType === 'application/pdf' ? await extractDocumentText(buffer, mimeType) : null;

    if (extractedText) {
      userContent = [
        {
          type: 'text',
          text: userMessage
            ? `${EXTRACTION_PROMPT}\n\nTexto del documento:\n${extractedText}\n\nPregunta del usuario: ${userMessage}`
            : `${EXTRACTION_PROMPT}\n\nTexto del documento:\n${extractedText}`,
        },
      ];
    } else if (mimeType === 'application/pdf') {
      userContent = [
        { type: 'file', file: { filename: file.name, file_data: `data:application/pdf;base64,${base64}` } },
        {
          type: 'text',
          text: userMessage ? `${EXTRACTION_PROMPT}\n\nAdemás, el usuario pregunta: ${userMessage}` : EXTRACTION_PROMPT,
        },
      ];
    } else {
      userContent = [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
        {
          type: 'text',
          text: userMessage ? `${EXTRACTION_PROMPT}\n\nAdemás, el usuario pregunta: ${userMessage}` : EXTRACTION_PROMPT,
        },
      ];
    }

    let content_text: string;
    try {
      const result = await aiChatJSON({
        messages: [{ role: 'user', content: userContent }],
        max_tokens: 4000,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });
      content_text = result.content;
    } catch (error: any) {
      console.error('Analyze image AI error:', error.message);
      return NextResponse.json({ error: error.message || 'Error al analizar con IA' }, { status: 502 });
    }

    let parsed;
    try {
      parsed = JSON.parse(content_text);
    } catch {
      parsed = { tipo: 'otro', resumen: content_text };
    }

    return NextResponse.json({ data: parsed });
  } catch (error: any) {
    console.error('Analyze image error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
