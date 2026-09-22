/**
 * Extrae texto de documentos sin usar visión (PDF digital).
 * Permite importar facturas/remitos con LLM de solo texto (más barato y compatible con más proveedores).
 */
export async function extractDocumentText(
  buffer: ArrayBuffer,
  mimeType: string,
): Promise<string | null> {
  if (mimeType !== 'application/pdf') {
    return null;
  }

  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: Buffer.from(buffer) });
    const textResult = await parser.getText();
    await parser.destroy();
    const text = textResult.text?.replace(/\s+/g, ' ').trim();
    return text && text.length >= 40 ? text : null;
  } catch (error) {
    console.warn('[DocumentExtract] PDF parse failed:', (error as Error).message);
    return null;
  }
}
