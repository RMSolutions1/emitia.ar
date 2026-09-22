import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiChatJSON } from '@/lib/ai-provider';
import { extractDocumentText } from '@/lib/document-text-extract';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const companyId = (session.user as any).companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const markupPercent = parseFloat(formData.get('markup') as string) || 35;

    if (!file) {
      return NextResponse.json({ error: 'No se encontró el archivo' }, { status: 400 });
    }

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'El archivo es demasiado grande (máx. 20MB)' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64String = Buffer.from(buffer).toString('base64');

    const isPDF = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');

    if (!isPDF && !isImage) {
      return NextResponse.json({ error: 'Formato no soportado. Usa PDF o imagen (JPG, PNG)' }, { status: 400 });
    }

    const systemPrompt = `Sos un experto en extraer datos de facturas, remitos y documentos comerciales argentinos.

Tu tarea es analizar el documento y extraer TODOS los productos/items listados.

Para cada producto extraé:
- name: nombre descriptivo del producto
- sku: código/SKU si aparece (o genera uno basado en el nombre, ej: "PROD-001")
- quantity: cantidad (número entero)
- unitCost: costo unitario (número decimal, sin IVA si es posible distinguirlo)
- category: categoría sugerida (ej: "Alimentos", "Bebidas", "Electrónica", "Limpieza", "Ropa", etc.)
- description: descripción breve si hay info adicional

También extrae info del proveedor si está disponible:
- supplierName: nombre o razón social
- supplierCuit: CUIT si aparece
- documentNumber: número de factura/remito
- documentDate: fecha del documento (formato YYYY-MM-DD)
- documentType: tipo ("factura", "remito", "nota_entrega", "orden_compra", "otro")

Si no podés distinguir el costo sin IVA, usa el precio total unitario como unitCost.
Si no encontrás algún campo, usa null.
Respondé con JSON puro con la clave "items" como array, sin markdown ni bloques de código.`;

    const extractedText = isPDF ? await extractDocumentText(buffer, file.type) : null;
    let userContent: unknown[];

    if (extractedText) {
      console.log('[Import Document] Using PDF text extraction, chars:', extractedText.length);
      userContent = [
        {
          type: 'text',
          text: `Texto del documento comercial:\n\n${extractedText}\n\nExtraé todos los productos/items. Respondé solo con JSON.`,
        },
      ];
    } else if (isPDF) {
      userContent = [
        { type: 'file', file: { filename: file.name, file_data: `data:application/pdf;base64,${base64String}` } },
        { type: 'text', text: 'Extrae todos los productos/items de este documento comercial argentino. Respondé solo con el JSON.' },
      ];
    } else {
      userContent = [
        { type: 'image_url', image_url: { url: `data:${file.type};base64,${base64String}` } },
        { type: 'text', text: 'Extrae todos los productos/items de este documento comercial argentino. Respondé solo con el JSON.' },
      ];
    }

    console.log('[Import Document] Processing file:', file.name, 'type:', file.type, 'size:', file.size);

    let responseContent: string;
    let provider: string;
    try {
      const result = await aiChatJSON({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 4000,
        temperature: 0.1,
      });
      responseContent = result.content;
      provider = result.provider;
    } catch (error: any) {
      console.error('[Import Document] AI error:', error.message);
      return NextResponse.json({ error: error.message || 'Error al procesar el documento con IA' }, { status: 502 });
    }

    console.log('[Import Document] AI provider:', provider, 'response:', responseContent.substring(0, 500));

    let extractedData: any;
    try {
      extractedData = JSON.parse(responseContent);
    } catch (e) {
      console.error('[Import Document] JSON parse error:', e);
      return NextResponse.json({ error: 'Error al interpretar la respuesta de IA' }, { status: 500 });
    }

    let items = extractedData.items || extractedData.products || extractedData.productos || extractedData.data || [];
    if (!Array.isArray(items)) {
      const arrays = Object.values(extractedData).filter((v) => Array.isArray(v));
      items = arrays.length > 0 ? (arrays[0] as any[]) : [];
    }

    if (items.length === 0) {
      return NextResponse.json({ error: 'No se encontraron productos en el documento' }, { status: 422 });
    }

    const markupMultiplier = 1 + markupPercent / 100;
    const processedItems = items.map((item: any, index: number) => {
      const unitCost = parseFloat(String(item.unitCost || item.unit_cost || item.precio || item.price || item.costo || 0));
      const quantity = parseInt(String(item.quantity || item.cantidad || item.qty || 1));
      const salePrice = Math.round(unitCost * markupMultiplier * 100) / 100;

      return {
        id: `import-${index}`,
        name: item.name || item.nombre || item.descripcion || item.description || `Producto ${index + 1}`,
        sku: item.sku || item.codigo || item.code || `IMP-${String(index + 1).padStart(3, '0')}`,
        quantity: isNaN(quantity) ? 1 : quantity,
        unitCost: isNaN(unitCost) ? 0 : unitCost,
        salePrice,
        category: item.category || item.categoria || 'General',
        description: item.description || item.descripcion || '',
        selected: true,
      };
    });

    return NextResponse.json({
      success: true,
      items: processedItems,
      documentInfo: {
        supplierName: extractedData.supplierName || extractedData.proveedor || null,
        supplierCuit: extractedData.supplierCuit || extractedData.cuit_proveedor || null,
        documentNumber: extractedData.documentNumber || extractedData.numero || null,
        documentDate: extractedData.documentDate || extractedData.fecha || null,
        documentType: extractedData.documentType || extractedData.tipo || null,
      },
      markupPercent,
      fileName: file.name,
      aiProvider: provider,
    });
  } catch (error) {
    console.error('[Import Document] Error:', error);
    return NextResponse.json({ error: 'Error interno al procesar el documento' }, { status: 500 });
  }
}
