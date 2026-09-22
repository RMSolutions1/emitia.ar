/**
 * Proveedor de IA unificado con fallback automático.
 * Orden por defecto: OpenAI → Gemini → Anthropic → Ollama
 * Forzá uno con AI_PROVIDER=openai|gemini|anthropic|ollama
 */

export type AIProviderName = 'openai' | 'gemini' | 'anthropic' | 'ollama';

export type AIMessage = {
  role: string;
  content: string | unknown[];
};

export interface AIChatOptions {
  messages: AIMessage[];
  model?: string;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  response_format?: { type: string };
}

const DEFAULT_MODELS: Record<AIProviderName, string> = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.5-flash',
  anthropic: 'claude-3-5-haiku-latest',
  ollama: 'llama3.2',
};

export function resolveProviderOrder(): AIProviderName[] {
  const forced = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (forced && isProvider(forced)) {
    return [forced];
  }

  const priority = process.env.AI_PROVIDER_PRIORITY?.split(',').map((p) => p.trim().toLowerCase()).filter(isProvider);
  if (priority?.length) {
    return priority as AIProviderName[];
  }

  const order: AIProviderName[] = [];
  if (process.env.OPENAI_API_KEY) order.push('openai');
  if (process.env.GEMINI_API_KEY) order.push('gemini');
  if (process.env.ANTHROPIC_API_KEY) order.push('anthropic');
  if (process.env.OLLAMA_BASE_URL) order.push('ollama');
  return order;
}

function isProvider(value: string): value is AIProviderName {
  return ['openai', 'gemini', 'anthropic', 'ollama'].includes(value);
}

export function parseAIError(provider: AIProviderName, status: number, body: string): string {
  try {
    const parsed = JSON.parse(body);
    const msg = parsed.error?.message || parsed.error || parsed.message || '';
    const text = typeof msg === 'string' ? msg : JSON.stringify(msg);
    if (text.toLowerCase().includes('insufficient_quota') || text.toLowerCase().includes('exceeded your current quota')) {
      return 'OpenAI sin créditos disponibles. Recargá tu plan en platform.openai.com/settings/billing.';
    }
    if (text.toLowerCase().includes('user location is not supported')) {
      return 'Gemini no está disponible desde la ubicación del servidor (VPS). Configurá OPENAI_API_KEY o un proxy (GEMINI_API_BASE_URL).';
    }
    if (text) return text;
  } catch {
    /* ignore */
  }
  if (status === 401 || status === 403) {
    return `API key inválida para ${provider}.`;
  }
  return `Error de IA (${provider}, HTTP ${status}).`;
}

function shouldTryNextProvider(status: number, body: string): boolean {
  const lower = body.toLowerCase();
  return (
    status === 402 ||
    status === 429 ||
    lower.includes('no remaining credits') ||
    lower.includes('insufficient') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('model_not_found') ||
    lower.includes('invalid model')
  );
}

function getModel(provider: AIProviderName, override?: string): string {
  return override || process.env[`AI_MODEL_${provider.toUpperCase()}`] || DEFAULT_MODELS[provider];
}

function contentToText(content: string | unknown[]): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return String(content);
  return content
    .map((part: any) => {
      if (part?.type === 'text') return part.text || '';
      if (part?.type === 'image_url') return '[imagen adjunta]';
      if (part?.type === 'file') return `[archivo: ${part.file?.filename || 'documento'}]`;
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function extractOpenAIContent(data: any): string {
  return data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || '';
}

async function callOpenAI(options: AIChatOptions): Promise<Response> {
  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: getModel('openai', options.model),
      messages: options.messages,
      max_tokens: options.max_tokens ?? 4000,
      temperature: options.temperature ?? 0.2,
      stream: options.stream ?? false,
      ...(options.response_format ? { response_format: options.response_format } : {}),
    }),
  });
}

function messagesToGeminiParts(messages: AIMessage[]): { system?: string; contents: any[] } {
  let system: string | undefined;
  const contents: any[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      system = contentToText(msg.content);
      continue;
    }
    const role = msg.role === 'assistant' ? 'model' : 'user';
    const parts: any[] = [];

    if (typeof msg.content === 'string') {
      parts.push({ text: msg.content });
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content as any[]) {
        if (part.type === 'text') {
          parts.push({ text: part.text });
        } else if (part.type === 'image_url') {
          const url = part.image_url?.url || '';
          const match = url.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
          }
        } else if (part.type === 'file') {
          const fileData = part.file?.file_data || '';
          const match = fileData.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
          }
        }
      }
    }

    if (parts.length) {
      contents.push({ role, parts });
    }
  }

  return { system, contents };
}

async function callGemini(options: AIChatOptions): Promise<Response> {
  const model = getModel('gemini', options.model);
  const { system, contents } = messagesToGeminiParts(options.messages);
  const base = (process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
  const url = `${base}/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents,
      generationConfig: {
        maxOutputTokens: options.max_tokens ?? 4000,
        temperature: options.temperature ?? 0.2,
        ...(options.response_format?.type === 'json_object'
          ? { responseMimeType: 'application/json' }
          : {}),
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
  const openAiShape = {
    choices: [{ message: { content: text } }],
    provider: 'gemini',
  };
  return new Response(JSON.stringify(openAiShape), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function callAnthropic(options: AIChatOptions): Promise<Response> {
  let system = '';
  const messages = options.messages
    .filter((m) => {
      if (m.role === 'system') {
        system = contentToText(m.content);
        return false;
      }
      return true;
    })
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: contentToText(m.content),
    }));

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: getModel('anthropic', options.model),
      max_tokens: options.max_tokens ?? 4000,
      temperature: options.temperature ?? 0.2,
      system: system || undefined,
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  const data = await res.json();
  const text = data.content?.map((c: any) => c.text).join('') || '';
  return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function callOllama(options: AIChatOptions): Promise<Response> {
  const base = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: getModel('ollama', options.model),
      messages: options.messages.map((m) => ({
        role: m.role,
        content: contentToText(m.content),
      })),
      stream: false,
      format: options.response_format?.type === 'json_object' ? 'json' : undefined,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  const data = await res.json();
  const text = data.message?.content || '';
  return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function callProvider(provider: AIProviderName, options: AIChatOptions): Promise<Response> {
  switch (provider) {
    case 'openai':
      return callOpenAI(options);
    case 'gemini':
      return callGemini(options);
    case 'anthropic':
      return callAnthropic(options);
    case 'ollama':
      return callOllama(options);
    default:
      throw new Error(`Proveedor desconocido: ${provider}`);
  }
}

export async function aiChatCompletion(
  options: AIChatOptions,
): Promise<{ response: Response; provider: AIProviderName }> {
  const providers = resolveProviderOrder();
  if (providers.length === 0) {
    throw new Error(
      'No hay proveedor de IA configurado. Agregá GEMINI_API_KEY u OPENAI_API_KEY.',
    );
  }

  let lastError = 'Todos los proveedores de IA fallaron.';
  for (const provider of providers) {
    try {
      const response = await callProvider(provider, options);
      if (response.ok) {
        return { response, provider };
      }
      const body = await response.text();
      lastError = parseAIError(provider, response.status, body);
      console.warn(`[AI] ${provider} falló:`, lastError.slice(0, 200));
      if (shouldTryNextProvider(response.status, body)) continue;
      if (providers.length > 1) continue;
      throw new Error(lastError);
    } catch (error: any) {
      lastError = error.message || lastError;
      console.warn(`[AI] ${provider} error:`, lastError.slice(0, 200));
    }
  }
  throw new Error(lastError);
}

export async function aiChatJSON(
  options: AIChatOptions,
): Promise<{ content: string; provider: AIProviderName }> {
  const { response, provider } = await aiChatCompletion({
    ...options,
    stream: false,
    response_format: options.response_format || { type: 'json_object' },
  });
  const data = await response.json();
  const content = extractOpenAIContent(data);
  if (!content) {
    throw new Error('La IA no devolvió contenido utilizable.');
  }
  return { content, provider };
}

export function createSSEStreamFromText(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const chunkSize = 40;
  return new ReadableStream({
    start(controller) {
      for (let i = 0; i < text.length; i += chunkSize) {
        const slice = text.slice(i, i + chunkSize);
        const payload = JSON.stringify({ choices: [{ delta: { content: slice } }] });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
}

export async function aiChatStream(
  options: AIChatOptions,
): Promise<{ stream: ReadableStream; provider: AIProviderName }> {
  const providers = resolveProviderOrder();
  if (providers.length === 0) {
    throw new Error(
      'No hay proveedor de IA configurado. Agregá GEMINI_API_KEY u OPENAI_API_KEY.',
    );
  }

  let lastError = 'Todos los proveedores de IA fallaron.';
  for (const provider of providers) {
    try {
      if (provider === 'openai') {
        const response = await callProvider(provider, { ...options, stream: true });
        if (response.ok && response.body) {
          return { stream: response.body, provider };
        }
        const body = await response.text();
        lastError = parseAIError(provider, response.status, body);
        if (shouldTryNextProvider(response.status, body)) continue;
      }

      const { content } = await aiChatJSON({ ...options, stream: false });
      return { stream: createSSEStreamFromText(content), provider };
    } catch (error: any) {
      lastError = error.message || lastError;
    }
  }
  throw new Error(lastError);
}

export async function testAIConnection(): Promise<{
  ok: boolean;
  provider?: AIProviderName;
  error?: string;
  available: AIProviderName[];
}> {
  const available = resolveProviderOrder();
  if (available.length === 0) {
    return {
      ok: false,
      error: 'Sin proveedor de IA. Configurá GEMINI_API_KEY u OPENAI_API_KEY.',
      available,
    };
  }

  try {
    const { provider } = await aiChatJSON({
      messages: [{ role: 'user', content: 'Respondé solo: OK' }],
      max_tokens: 10,
      temperature: 0,
    });
    return { ok: true, provider, available };
  } catch (error: any) {
    return { ok: false, error: error.message, available };
  }
}

