'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Download, Calendar, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const CONDICION_IVA_SHORT: Record<string, string> = {
  'responsable_inscripto': 'RI',
  'monotributista': 'M',
  'monotributo': 'M',
  'consumidor_final': 'CF',
  'exento': 'EX',
};

const DOC_TYPE_NAME: Record<string, string> = {
  '001': 'Fact. A', '002': 'ND A', '003': 'NC A',
  '006': 'Fact. B', '007': 'ND B', '008': 'NC B',
  '011': 'Fact. C', '012': 'ND C', '013': 'NC C',
  '051': 'Fact. A (Ret)', '052': 'ND A (Ret)', '053': 'NC A (Ret)',
};

interface LibroRow {
  fecha: string;
  tipo?: string;
  letra?: string;
  puntoVenta?: number;
  numero: string;
  documentoReceptor?: string;
  nombreReceptor?: string;
  condicionIva?: string;
  netoGravado: number;
  ivaRate?: number;
  iva: number;
  exento?: number;
  noGravado?: number;
  otrosTributos?: number;
  total: number;
  cae?: string;
  proveedor?: string;
  cuitProveedor?: string;
  status?: string;
}

export default function LibroIVAClient() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [type, setType] = useState<'ventas' | 'compras'>('ventas');
  const [data, setData] = useState<{ rows: LibroRow[]; totals: any; count: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/libro-iva?month=${month}&year=${year}&type=${type}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      } else {
        toast.error('Error al cargar libro IVA');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [month, year, type]);

  const formatCurrency = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(n);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const exportCSV = () => {
    if (!data || data.rows.length === 0) { toast.error('No hay datos para exportar'); return; }
    let csvRows: string[] = [];
    if (type === 'ventas') {
      csvRows.push('Fecha;Tipo;Número;CUIT/DNI;Razón Social;Cond. IVA;Neto Gravado;IVA;Exento;Otros Trib.;Total;CAE');
      data.rows.forEach(r => {
        csvRows.push([
          formatDate(r.fecha), DOC_TYPE_NAME[r.tipo || ''] || r.tipo || '', r.numero,
          r.documentoReceptor || '', `"${r.nombreReceptor || ''}"`, CONDICION_IVA_SHORT[r.condicionIva || ''] || r.condicionIva || '',
          r.netoGravado.toFixed(2), r.iva.toFixed(2), (r.exento || 0).toFixed(2), (r.otrosTributos || 0).toFixed(2),
          r.total.toFixed(2), r.cae || '',
        ].join(';'));
      });
    } else {
      csvRows.push('Fecha;Proveedor;CUIT;Número;Neto Gravado;IVA;Total');
      data.rows.forEach(r => {
        csvRows.push([
          formatDate(r.fecha), `"${r.proveedor || ''}"`, r.cuitProveedor || '', r.numero,
          r.netoGravado.toFixed(2), r.iva.toFixed(2), r.total.toFixed(2),
        ].join(';'));
      });
    }
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `libro_iva_${type}_${year}_${String(month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Archivo exportado');
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-blue-600" /> Libro IVA Digital
          </h1>
          <p className="text-gray-500 text-sm mt-1">Registro de operaciones según normativa ARCA/AFIP</p>
        </div>
        <button onClick={exportCSV} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2 font-medium text-sm">
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row items-center gap-4">
        {/* Type selector */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setType('ventas')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${type === 'ventas' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Ventas
          </button>
          <button
            onClick={() => setType('compras')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${type === 'compras' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Compras
          </button>
        </div>

        {/* Month selector */}
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg min-w-[180px] justify-center">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-800">{MONTHS[month - 1]} {year}</span>
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
        </div>

        {loading && <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />}
      </div>

      {/* Summary Cards */}
      {data && data.totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium">Comprobantes</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{data.count}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium">Neto Gravado</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data.totals.netoGravado || 0)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium">IVA</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{formatCurrency(type === 'ventas' ? (data.totals.iva21 || 0) + (data.totals.iva105 || 0) + (data.totals.iva27 || 0) : (data.totals.iva || 0))}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium">Total</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(data.totals.total || 0)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {type === 'ventas' ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Tipo</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Número</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">CUIT/DNI</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Razón Social</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">Neto Grav.</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">IVA</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">Total</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600">CAE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{formatDate(row.fecha)}</td>
                    <td className="px-3 py-2">
                      <span className="text-xs font-medium px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{DOC_TYPE_NAME[row.tipo || ''] || row.tipo}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-800">{row.numero}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{row.documentoReceptor || '-'}</td>
                    <td className="px-3 py-2 text-gray-800 max-w-[200px] truncate">{row.nombreReceptor}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{formatCurrency(row.netoGravado)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{formatCurrency(row.iva)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs font-semibold">{formatCurrency(row.total)}</td>
                    <td className="px-3 py-2 text-center">
                      {row.cae ? (
                        <span className="text-green-600 text-xs">✓</span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!data || data.rows.length === 0) && (
                  <tr><td colSpan={9} className="px-3 py-12 text-center text-gray-400">No hay comprobantes en este período</td></tr>
                )}
              </tbody>
              {data && data.rows.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                    <td colSpan={5} className="px-3 py-3 text-right text-xs text-gray-600">TOTALES</td>
                    <td className="px-3 py-3 text-right font-mono text-xs">{formatCurrency(data.totals.netoGravado || 0)}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs">{formatCurrency((data.totals.iva21 || 0) + (data.totals.iva105 || 0) + (data.totals.iva27 || 0))}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs font-bold">{formatCurrency(data.totals.total || 0)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Fecha</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Proveedor</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">CUIT</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600">Número</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">Neto Grav.</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">IVA</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{formatDate(row.fecha)}</td>
                    <td className="px-3 py-2 text-gray-800">{row.proveedor}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{row.cuitProveedor || '-'}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-800">{row.numero}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{formatCurrency(row.netoGravado)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{formatCurrency(row.iva)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs font-semibold">{formatCurrency(row.total)}</td>
                  </tr>
                ))}
                {(!data || data.rows.length === 0) && (
                  <tr><td colSpan={7} className="px-3 py-12 text-center text-gray-400">No hay compras en este período</td></tr>
                )}
              </tbody>
              {data && data.rows.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                    <td colSpan={4} className="px-3 py-3 text-right text-xs text-gray-600">TOTALES</td>
                    <td className="px-3 py-3 text-right font-mono text-xs">{formatCurrency(data.totals.netoGravado || 0)}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs">{formatCurrency(data.totals.iva || 0)}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs font-bold">{formatCurrency(data.totals.total || 0)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
