'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, FileText, Image as ImageIcon, Sparkles, CheckCircle2, XCircle, 
  Package, ArrowLeft, Loader2, AlertCircle, Trash2, DollarSign,
  FileUp, Check, Percent, Info, ShoppingBag
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ExtractedItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unitCost: number;
  salePrice: number;
  category: string;
  description: string;
  selected: boolean;
}

interface DocumentInfo {
  supplierName: string | null;
  supplierCuit: string | null;
  documentNumber: string | null;
  documentDate: string | null;
  documentType: string | null;
}

type Step = 'upload' | 'processing' | 'review' | 'confirming' | 'done';

export function ImportarDocumentoClient() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);
  const [markup, setMarkup] = useState(35);
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const isValid = selectedFile.type === 'application/pdf' || selectedFile.type.startsWith('image/');
    if (!isValid) {
      toast.error('Solo se aceptan archivos PDF o imágenes (JPG, PNG)');
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      toast.error('El archivo no puede superar los 20MB');
      return;
    }

    setFile(selectedFile);
    setError(null);

    if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const fakeEvent = { target: { files: [droppedFile] } } as any;
      handleFileSelect(fakeEvent);
    }
  };

  const processDocument = async () => {
    if (!file) return;
    setStep('processing');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('markup', String(markup));

      const res = await fetch('/api/inventory/import-document', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar');
      }

      setItems(data.items);
      setDocumentInfo(data.documentInfo);
      setStep('review');
    } catch (err: any) {
      setError(err.message);
      setStep('upload');
      toast.error(err.message || 'Error al procesar el documento');
    }
  };

  const updateItemField = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      // Recalculate sale price if cost changes
      if (field === 'unitCost') {
        updated.salePrice = Math.round(parseFloat(value) * (1 + markup / 100) * 100) / 100;
      }
      return updated;
    }));
  };

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  };

  const recalculatePrices = (newMarkup: number) => {
    setMarkup(newMarkup);
    setItems(prev => prev.map(item => ({
      ...item,
      salePrice: Math.round(item.unitCost * (1 + newMarkup / 100) * 100) / 100
    })));
  };

  const confirmImport = async () => {
    const selectedItems = items.filter(i => i.selected);
    if (selectedItems.length === 0) {
      toast.error('Seleccioná al menos un producto');
      return;
    }

    setStep('confirming');

    try {
      const res = await fetch('/api/inventory/import-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selectedItems,
          documentInfo,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al importar');
      }

      setImportResult(data);
      setStep('done');
      toast.success(data.message);
    } catch (err: any) {
      setStep('review');
      toast.error(err.message || 'Error al importar productos');
    }
  };

  const resetAll = () => {
    setStep('upload');
    setFile(null);
    setPreviewUrl(null);
    setItems([]);
    setDocumentInfo(null);
    setImportResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatCurrency = (val: number) =>
    '$' + val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const selectedCount = items.filter(i => i.selected).length;
  const totalCost = items.filter(i => i.selected).reduce((s, i) => s + i.unitCost * i.quantity, 0);
  const totalSale = items.filter(i => i.selected).reduce((s, i) => s + i.salePrice * i.quantity, 0);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/inventario')} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Importar con IA
          </h1>
          <p className="text-sm text-gray-500">Subí una factura, remito o imagen y la IA extrae los productos automáticamente</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {['Subir Documento', 'Procesar con IA', 'Revisar y Confirmar'].map((label, idx) => {
          const stepIndex = idx === 0 ? 'upload' : idx === 1 ? 'processing' : 'review';
          const current = step === 'upload' ? 0 : step === 'processing' ? 1 : 2;
          const isActive = idx <= current;
          return (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                isActive ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-400'
              }`}>
                {idx < current ? <Check className="w-4 h-4" /> : idx + 1}
              </div>
              <span className={`text-sm hidden sm:block ${isActive ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{label}</span>
              {idx < 2 && <div className={`flex-1 h-0.5 ${idx < current ? 'bg-purple-600' : 'bg-gray-200'}`} />}
            </div>
          );
        })}
      </div>

      {/* STEP 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-6">
          {/* Markup config */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <Percent className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Margen de ganancia</h3>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="200"
                value={markup}
                onChange={e => setMarkup(parseInt(e.target.value))}
                className="flex-1 accent-purple-600"
              />
              <div className="flex items-center gap-1 bg-purple-50 px-3 py-1.5 rounded-lg">
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={markup}
                  onChange={e => setMarkup(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-14 text-center bg-transparent font-bold text-purple-700 outline-none"
                />
                <span className="text-purple-600 font-semibold">%</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Info className="w-3 h-3" />
              El precio de venta se calculará automáticamente: Costo × {(1 + markup / 100).toFixed(2)}
            </p>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className="bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors cursor-pointer p-8 text-center"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="space-y-3">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded-lg shadow" />
                ) : (
                  <FileText className="w-16 h-16 text-red-500 mx-auto" />
                )}
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button
                  onClick={(e) => { e.stopPropagation(); resetAll(); }}
                  className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 mx-auto"
                >
                  <Trash2 className="w-4 h-4" /> Cambiar archivo
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto">
                  <FileUp className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Arrastrá o hace click para subir</p>
                  <p className="text-sm text-gray-500 mt-1">Factura de compra, remito, nota de entrega</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG • Máx. 20MB</p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Process button */}
          {file && (
            <button
              onClick={processDocument}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-purple-200"
            >
              <Sparkles className="w-5 h-5" />
              Procesar con IA
            </button>
          )}

          {/* Info box */}
          <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
            <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> ¿Cómo funciona?
            </h4>
            <ol className="text-sm text-purple-800 space-y-1.5 list-decimal list-inside">
              <li>Subí una foto o PDF de una factura de compra o remito de tu proveedor</li>
              <li>La IA extrae automáticamente todos los productos con cantidades y precios</li>
              <li>Se calcula el precio de venta al público con tu margen ({markup}%)</li>
              <li>Revisá los datos y confirmá para agregar al inventario</li>
            </ol>
          </div>
        </div>
      )}

      {/* STEP 2: Processing */}
      {step === 'processing' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-purple-100 animate-ping opacity-30" />
            <div className="relative w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-purple-600 animate-pulse" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Procesando documento...</h3>
          <p className="text-gray-500 mb-4">La IA está analizando &ldquo;{file?.name}&rdquo;</p>
          <div className="flex items-center justify-center gap-2 text-sm text-purple-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Extrayendo productos, cantidades y precios
          </div>
        </div>
      )}

      {/* STEP 3: Review */}
      {(step === 'review' || step === 'confirming') && (
        <div className="space-y-4">
          {/* Document info */}
          {documentInfo && (documentInfo.supplierName || documentInfo.documentNumber) && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="flex flex-wrap gap-4 text-sm">
                {documentInfo.supplierName && (
                  <div><span className="text-blue-600 font-medium">Proveedor:</span> <span className="text-blue-900">{documentInfo.supplierName}</span></div>
                )}
                {documentInfo.supplierCuit && (
                  <div><span className="text-blue-600 font-medium">CUIT:</span> <span className="text-blue-900 font-mono">{documentInfo.supplierCuit}</span></div>
                )}
                {documentInfo.documentNumber && (
                  <div><span className="text-blue-600 font-medium">Número:</span> <span className="text-blue-900">{documentInfo.documentNumber}</span></div>
                )}
                {documentInfo.documentDate && (
                  <div><span className="text-blue-600 font-medium">Fecha:</span> <span className="text-blue-900">{documentInfo.documentDate}</span></div>
                )}
              </div>
            </div>
          )}

          {/* Markup adjuster */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-4">
            <Percent className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Margen:</span>
            <input
              type="number"
              min="0"
              max="500"
              value={markup}
              onChange={e => recalculatePrices(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-16 text-center border rounded-lg px-2 py-1 font-bold text-purple-700"
            />
            <span className="text-sm text-gray-500">%</span>
            <div className="ml-auto flex items-center gap-4 text-sm">
              <span className="text-gray-500">Seleccionados: <strong className="text-gray-900">{selectedCount}/{items.length}</strong></span>
            </div>
          </div>

          {/* Items table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">
                      <input
                        type="checkbox"
                        checked={items.every(i => i.selected)}
                        onChange={() => {
                          const allSelected = items.every(i => i.selected);
                          setItems(prev => prev.map(i => ({ ...i, selected: !allSelected })));
                        }}
                        className="rounded accent-purple-600"
                      />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cant.</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo Unit.</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio Venta</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <tr key={item.id} className={`${item.selected ? 'bg-white' : 'bg-gray-50 opacity-60'} hover:bg-gray-50/50 transition`}>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => toggleItem(item.id)}
                          className="rounded accent-purple-600"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={e => updateItemField(item.id, 'name', e.target.value)}
                          className="w-full text-sm font-medium text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-500 focus:outline-none px-1 py-0.5"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={item.sku}
                          onChange={e => updateItemField(item.id, 'sku', e.target.value)}
                          className="w-24 text-sm font-mono text-gray-600 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-500 focus:outline-none px-1 py-0.5"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateItemField(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-16 text-center text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-500 focus:outline-none py-0.5"
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitCost}
                          onChange={e => updateItemField(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                          className="w-24 text-right text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-500 focus:outline-none py-0.5"
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm font-semibold text-green-600">{formatCurrency(item.salePrice)}</span>
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={item.category}
                          onChange={e => updateItemField(item.id, 'category', e.target.value)}
                          className="w-28 text-sm text-gray-600 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-500 focus:outline-none px-1 py-0.5"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase font-medium">Total Costo</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalCost)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase font-medium">Total Venta ({markup}%)</p>
                <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(totalSale)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase font-medium">Ganancia Estimada</p>
                <p className="text-xl font-bold text-purple-600 mt-1">{formatCurrency(totalSale - totalCost)}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={resetAll}
              disabled={step === 'confirming'}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmImport}
              disabled={step === 'confirming' || selectedCount === 0}
              className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition flex items-center justify-center gap-2 shadow-lg shadow-green-200 disabled:opacity-50"
            >
              {step === 'confirming' ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Importando...</>
              ) : (
                <><ShoppingBag className="w-5 h-5" /> Importar {selectedCount} producto{selectedCount !== 1 ? 's' : ''} al Inventario</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Done */}
      {step === 'done' && importResult && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">¡Importación Exitosa!</h3>
            <p className="text-gray-500 mt-2">{importResult.message}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-green-600">{importResult.created}</p>
              <p className="text-xs text-green-700">Creados</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-blue-600">{importResult.updated}</p>
              <p className="text-xs text-blue-700">Actualizados</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-red-600">{importResult.errors}</p>
              <p className="text-xs text-red-700">Errores</p>
            </div>
          </div>

          {importResult.details && importResult.details.length > 0 && (
            <div className="max-w-lg mx-auto text-left">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Detalle:</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {importResult.details.map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {d.action === 'created' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {d.action === 'updated' && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                    {d.action === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                    <span className="text-gray-700">{d.name}</span>
                    <span className={`text-xs ml-auto ${
                      d.action === 'created' ? 'text-green-600' : d.action === 'updated' ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {d.action === 'created' ? 'Nuevo' : d.action === 'updated' ? 'Actualizado' : d.error}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 max-w-md mx-auto">
            <button
              onClick={resetAll}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition"
            >
              Importar Otro
            </button>
            <button
              onClick={() => router.push('/inventario')}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <Package className="w-5 h-5" /> Ver Inventario
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
