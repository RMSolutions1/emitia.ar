'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2, Calculator, BookOpen, FileText, HelpCircle, Loader2, Copy, Check, ImagePlus, Camera, X, FileUp, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imagePreview?: string;
  extractedData?: any;
}

const QUICK_QUESTIONS = [
  { icon: Calculator, label: 'Categorías Monotributo', question: '¿Cuáles son las categorías actuales del Monotributo y sus topes de facturación?' },
  { icon: FileText, label: 'Factura A vs B vs C', question: '¿Cuándo debo emitir Factura A, B o C? Explicame las diferencias y cuándo corresponde cada una.' },
  { icon: BookOpen, label: 'Liquidación de IVA', question: '¿Cómo se hace la liquidación mensual de IVA? Explicame con un ejemplo práctico el crédito y débito fiscal.' },
  { icon: HelpCircle, label: 'Nota de Crédito', question: '¿Cuándo y cómo debo emitir una Nota de Crédito? ¿Qué requisitos pide ARCA?' },
  { icon: Calculator, label: 'Retenciones IVA/Ganancias', question: '¿Cuándo estoy obligado a retener IVA y Ganancias a mis proveedores? ¿Qué porcentajes aplican?' },
  { icon: FileText, label: 'FCE MiPyME', question: '¿Qué es la Factura de Crédito Electrónica MiPyME y cuándo estoy obligado a emitirla?' },
];

function formatExtractedData(data: any): string {
  if (!data || data.tipo === 'otro') {
    return data?.resumen || 'No se pudo extraer información estructurada.';
  }

  const tipoLabels: Record<string, string> = {
    factura_a: '🧳 Factura A',
    factura_b: '🧳 Factura B',
    factura_c: '🧳 Factura C',
    ticket: '🏷️ Ticket',
    recibo: '📝 Recibo',
    nota_credito: '🟢 Nota de Crédito',
    nota_debito: '🟠 Nota de Débito',
    remito: '🚚 Remito',
    presupuesto: '📋 Presupuesto',
  };

  let md = `### ${tipoLabels[data.tipo] || '📄 Comprobante'} ${data.numero || ''}\n\n`;
  
  if (data.fecha) md += `**Fecha:** ${data.fecha}\n\n`;
  
  if (data.emisor) {
    md += `**Emisor:** ${data.emisor.razonSocial || '-'}\n`;
    if (data.emisor.cuit) md += `**CUIT:** ${data.emisor.cuit}\n`;
    if (data.emisor.condicionIva) md += `**Cond. IVA:** ${data.emisor.condicionIva}\n`;
    md += '\n';
  }

  if (data.receptor?.razonSocial) {
    md += `**Receptor:** ${data.receptor.razonSocial}\n`;
    if (data.receptor.cuit) md += `**CUIT:** ${data.receptor.cuit}\n`;
    md += '\n';
  }

  if (data.items?.length) {
    md += '| Producto | Cant. | P. Unit. | Subtotal |\n';
    md += '|----------|------:|--------:|---------:|\n';
    data.items.forEach((item: any) => {
      md += `| ${item.descripcion || '-'} | ${item.cantidad || 1} | $${(item.precioUnitario || 0).toLocaleString('es-AR')} | $${(item.subtotal || 0).toLocaleString('es-AR')} |\n`;
    });
    md += '\n';
  }

  if (data.subtotal != null) md += `**Subtotal:** $${data.subtotal.toLocaleString('es-AR')}\n`;
  if (data.iva != null) md += `**IVA:** $${data.iva.toLocaleString('es-AR')}\n`;
  if (data.total != null) md += `**Total:** $${data.total.toLocaleString('es-AR')}\n\n`;
  
  if (data.cae) md += `**CAE:** ${data.cae}\n`;
  if (data.caeVencimiento) md += `**Vto. CAE:** ${data.caeVencimiento}\n`;
  if (data.formaPago) md += `**Forma de pago:** ${data.formaPago}\n`;
  
  if (data.observaciones) md += `\n> ${data.observaciones}\n`;
  if (data.resumen) md += `\n${data.resumen}\n`;

  return md;
}

export function ContadorIAClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Formató no soportado. Usá imágenes (JPG, PNG, WebP) o PDF.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo no puede superar los 10MB.');
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const analyzeImage = async () => {
    if (!selectedFile || isAnalyzing) return;
    setIsAnalyzing(true);

    const userMsg: Message = { 
      role: 'user', 
      content: input.trim() || `Analizá este ${selectedFile.type === 'application/pdf' ? 'documento' : 'comprobante'}`, 
      imagePreview: filePreview || undefined 
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (input.trim()) formData.append('message', input.trim());

      const res = await fetch('/api/contador-ia/analyze-image', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}`);
      }

      const { data } = await res.json();
      const formattedContent = formatExtractedData(data);

      const assistantMsg: Message = {
        role: 'assistant',
        content: formattedContent,
        extractedData: data,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Disculpá, no pude analizar el archivo. Verificá que sea una imagen clara o un PDF legible e intentá de nuevo.';
      setMessages(prev => [...prev, { role: 'assistant', content: message }]);
    } finally {
      setIsAnalyzing(false);
      clearFile();
    }
  };

  const sendMessage = async (content: string) => {
    if (selectedFile) {
      await analyzeImage();
      return;
    }
    if (!content.trim() || isStreaming) return;

    const userMessage: Message = { role: 'user', content: content.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);

    try {
      const response = await fetch('/api/contador-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${response.status}`);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No se pudo leer la respuesta');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let partialRead = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        partialRead += decoder.decode(value, { stream: true });
        const lines = partialRead.split('\n');
        partialRead = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) {
                assistantContent += delta;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                  return updated;
                });
              }
            } catch { /* skip */ }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      const message = error instanceof Error
        ? error.message
        : 'Disculpá, hubo un error al procesar tu consulta. Intentá de nuevo.';
      setMessages(prev => [
        ...prev.filter(m => m.role !== 'assistant' || m.content),
        { role: 'assistant', content: message },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const clearChat = () => {
    setMessages([]);
    setInput('');
    clearFile();
  };

  const isBusy = isStreaming || isAnalyzing;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Contador IA</h1>
            <p className="text-xs text-gray-500">Experto tributario · Analizá comprobantes con fotos</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Limpiar</span>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">¡Hola! Soy el Contador IA 🧮</h2>
            <p className="text-gray-500 text-center max-w-md mb-4">
              Especializado en el sistema tributario argentino. También podés enviarme fotos de facturas, tickets o comprobantes y los analizo al instante.
            </p>

            {/* Image upload CTA */}
            <div className="mb-8 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
                <Camera className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">¡Nuevo! Sacá una foto a un comprobante y lo analizo</span>
              </div>
              <div className="flex gap-2 text-xs text-gray-400">
                <span className="flex items-center gap-1"><ImagePlus className="w-3.5 h-3.5" /> JPG, PNG</span>
                <span>·</span>
                <span className="flex items-center gap-1"><FileUp className="w-3.5 h-3.5" /> PDF</span>
                <span>·</span>
                <span>Máx 10MB</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
              {QUICK_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => sendMessage(q.question)}
                  className="flex items-start gap-3 p-4 text-left bg-white border border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all group">
                  <q.icon className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700 group-hover:text-emerald-800 font-medium">{q.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={`max-w-[85%] sm:max-w-[80%] ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-3'
                  : 'bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm'
              }`}>
                {/* Image preview for user messages */}
                {msg.imagePreview && (
                  <div className="mb-2 rounded-lg overflow-hidden">
                    <img src={msg.imagePreview} alt="Comprobante adjunto" className="max-h-48 rounded-lg" />
                  </div>
                )}
                
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900 prose-code:text-emerald-700 prose-code:bg-emerald-50 prose-code:px-1 prose-code:rounded prose-table:text-sm">
                    <ReactMarkdown>{msg.content || '...'}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}

                {/* Actions for extracted data */}
                {msg.extractedData && msg.extractedData.tipo !== 'otro' && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                    <span className="text-[10px] text-gray-400 w-full mb-1">Datos extraídos automáticamente</span>
                    <button
                      onClick={() => {
                        const json = JSON.stringify(msg.extractedData, null, 2);
                        navigator.clipboard.writeText(json);
                        setCopiedIdx(i);
                        setTimeout(() => setCopiedIdx(null), 2000);
                      }}
                      className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      {copiedIdx === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedIdx === i ? 'Copiado' : 'Copiar JSON'}
                    </button>
                  </div>
                )}

                {msg.role === 'assistant' && msg.content && !isBusy && !msg.extractedData && (
                  <div className="flex justify-end mt-2 pt-2 border-t border-gray-100">
                    <button onClick={() => copyToClipboard(msg.content, i)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                      {copiedIdx === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedIdx === i ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
              )}
            </div>
          ))
        )}
        {(isStreaming && messages[messages.length - 1]?.role !== 'assistant') || isAnalyzing ? (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                {isAnalyzing && <span className="text-sm text-gray-500">Analizando documento...</span>}
              </div>
            </div>
          </div>
        ) : null}
        <div ref={messagesEndRef} />
      </div>

      {/* File preview bar */}
      {selectedFile && (
        <div className="px-4 sm:px-6 py-2 bg-emerald-50 border-t border-emerald-200 flex items-center gap-3">
          {filePreview ? (
            <img src={filePreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-emerald-200" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
              <FileUp className="w-5 h-5 text-emerald-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-800 truncate">{selectedFile.name}</p>
            <p className="text-xs text-emerald-600">{(selectedFile.size / 1024).toFixed(0)} KB · Listo para analizar</p>
          </div>
          <button onClick={clearFile} className="p-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
            <X className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2 sm:gap-3 items-end">
          {/* File upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            title="Subir foto o PDF de comprobante"
            className="flex items-center justify-center w-12 h-12 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
          >
            <Camera className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedFile ? 'Agregá un comentario (opcional) y presioná enviar...' : 'Preguntame o subi una foto de comprobante...'}
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 pr-12 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm min-h-[48px] max-h-[150px]"
              rows={1}
              disabled={isBusy}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 150) + 'px';
              }}
            />
          </div>
          <button
            onClick={() => selectedFile ? analyzeImage() : sendMessage(input)}
            disabled={(!input.trim() && !selectedFile) || isBusy}
            className={`flex items-center justify-center w-12 h-12 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex-shrink-0 ${
              selectedFile 
                ? 'bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700'
                : 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
            }`}
          >
            {isBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : selectedFile ? <Sparkles className="w-5 h-5" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          📷 Subí fotos de facturas, tickets o recibos para análisis instantáneo · El Contador IA es informativo
        </p>
      </div>
    </div>
  );
}

export default ContadorIAClient;
