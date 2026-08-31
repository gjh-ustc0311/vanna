/** Typed client for the Vanna V3 chat protocol. */

export type JsonScalar = string | number | boolean | null;

export interface TextComponent {
  type: 'text';
  text: string;
}

export interface DataFrameComponent {
  type: 'dataframe';
  columns: string[];
  rows: Array<Record<string, JsonScalar>>;
  title?: string | null;
  truncated: boolean;
}

export interface LinkComponent {
  type: 'link';
  url: string;
  text?: string | null;
}

export type VannaComponent = TextComponent | DataFrameComponent | LinkComponent;

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  request_id?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatStreamChunk {
  component: VannaComponent;
  conversation_id: string;
  request_id: string;
  timestamp: number;
}

export interface ChatStreamError {
  error: {
    code: string;
    message: string;
  };
  conversation_id: string;
  request_id: string;
  timestamp: number;
}

export type ChatStreamPayload = ChatStreamChunk | ChatStreamError;

export interface ChatResponse {
  chunks: ChatStreamChunk[];
  conversation_id: string;
  request_id: string;
  total_chunks: number;
}

export interface ApiClientConfig {
  baseUrl?: string;
  sseEndpoint?: string;
  pollEndpoint?: string;
  customHeaders?: Record<string, string>;
}

export class VannaApiError extends Error {
  constructor(
    message: string,
    public readonly code = 'transport_error',
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'VannaApiError';
  }
}

export function isChatStreamError(payload: unknown): payload is ChatStreamError {
  return isRecord(payload)
    && hasOnlyKeys(payload, ['error', 'conversation_id', 'request_id', 'timestamp'])
    && hasEnvelopeFields(payload)
    && isRecord(payload.error)
    && hasOnlyKeys(payload.error, ['code', 'message'])
    && typeof payload.error.code === 'string'
    && typeof payload.error.message === 'string';
}

export function isSafeLink(url: string): boolean {
  const value = url.trim();
  if (!value || value.startsWith('//')) return false;
  try {
    const parsed = new URL(value, globalThis.location?.origin ?? 'http://localhost');
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export class VannaApiClient {
  public readonly baseUrl: string;
  private readonly sseEndpoint: string;
  private readonly pollEndpoint: string;
  private customHeaders: Record<string, string>;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? '';
    this.sseEndpoint = config.sseEndpoint ?? '/api/vanna/v3/chat_sse';
    this.pollEndpoint = config.pollEndpoint ?? '/api/vanna/v3/chat_poll';
    this.customHeaders = config.customHeaders ?? {};
  }

  setCustomHeaders(headers: Record<string, string>): void {
    this.customHeaders = { ...headers };
  }

  getCustomHeaders(): Record<string, string> {
    return { ...this.customHeaders };
  }

  async *streamChat(
    request: ChatRequest,
  ): AsyncGenerator<ChatStreamPayload, void, unknown> {
    const response = await fetch(this.resolveUrl(this.sseEndpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...this.customHeaders,
      },
      body: JSON.stringify(request),
    });
    await this.assertOk(response);

    const reader = response.body?.getReader();
    if (!reader) throw new VannaApiError('The server returned an empty response.');

    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n');
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const event of events) {
          const payload = this.parseSseEvent(event);
          if (payload === null) return;
          if (payload) yield payload;
        }
        if (done) break;
      }

      if (buffer.trim()) {
        const payload = this.parseSseEvent(buffer);
        if (payload) yield payload;
      }
    } finally {
      reader.releaseLock();
    }
  }

  async sendPollMessage(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(this.resolveUrl(this.pollEndpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.customHeaders,
      },
      body: JSON.stringify(request),
    });
    await this.assertOk(response);
    const payload: unknown = await response.json();
    if (!isChatResponse(payload)) {
      throw new VannaApiError('The server returned an invalid polling response.');
    }
    return payload;
  }

  generateId(): string {
    return globalThis.crypto?.randomUUID?.()
      ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  private resolveUrl(endpoint: string): string {
    return /^https?:\/\//i.test(endpoint) ? endpoint : `${this.baseUrl}${endpoint}`;
  }

  private parseSseEvent(event: string): ChatStreamPayload | null | undefined {
    const data = event
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
      .trim();
    if (!data) return undefined;
    if (data === '[DONE]') return null;

    let payload: unknown;
    try {
      payload = JSON.parse(data);
    } catch {
      throw new VannaApiError('The server returned malformed stream data.');
    }
    if (!isChatStreamPayload(payload)) {
      throw new VannaApiError('The server returned an unsupported component.');
    }
    return payload;
  }

  private async assertOk(response: Response): Promise<void> {
    if (response.ok) return;
    let code = 'http_error';
    let message = `Request failed with HTTP ${response.status}.`;
    try {
      const payload: unknown = await response.json();
      if (isChatStreamError(payload)) {
        code = payload.error.code;
        message = payload.error.message;
      }
    } catch {
      // Keep the safe status-only fallback.
    }
    throw new VannaApiError(message, code, response.status);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonScalar(value: unknown): value is JsonScalar {
  return value === null
    || typeof value === 'string'
    || typeof value === 'boolean'
    || (typeof value === 'number' && Number.isFinite(value));
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function isComponent(value: unknown): value is VannaComponent {
  if (!isRecord(value) || typeof value.type !== 'string') return false;
  if (value.type === 'text') {
    return hasOnlyKeys(value, ['type', 'text']) && typeof value.text === 'string';
  }
  if (value.type === 'link') {
    return hasOnlyKeys(value, ['type', 'url', 'text'])
      && typeof value.url === 'string'
      && isSafeLink(value.url)
      && (value.text === undefined || value.text === null || typeof value.text === 'string');
  }
  if (value.type === 'dataframe') {
    if (!hasOnlyKeys(value, ['type', 'columns', 'rows', 'title', 'truncated'])
      || !Array.isArray(value.columns)
    ) return false;
    const columns = value.columns;
    if (!columns.every((column) => typeof column === 'string')) return false;
    const stringColumns = columns as string[];
    if (new Set(stringColumns).size !== stringColumns.length
      || !Array.isArray(value.rows)
      || value.rows.length > 100
      || typeof value.truncated !== 'boolean'
      || !(value.title === undefined || value.title === null || typeof value.title === 'string')
    ) return false;
    return value.rows.every((row) => isRecord(row)
      && Object.keys(row).length === stringColumns.length
      && stringColumns.every((column) => column in row)
      && Object.values(row).every(isJsonScalar));
  }
  return false;
}

function hasEnvelopeFields(value: Record<string, unknown>): boolean {
  return typeof value.conversation_id === 'string'
    && typeof value.request_id === 'string'
    && typeof value.timestamp === 'number'
    && Number.isFinite(value.timestamp);
}

function isChatStreamPayload(value: unknown): value is ChatStreamPayload {
  if (!isRecord(value) || !hasEnvelopeFields(value)) return false;
  if ('component' in value) {
    return hasOnlyKeys(
      value,
      ['component', 'conversation_id', 'request_id', 'timestamp'],
    ) && isComponent(value.component);
  }
  return hasOnlyKeys(value, ['error', 'conversation_id', 'request_id', 'timestamp'])
    && isRecord(value.error)
    && hasOnlyKeys(value.error, ['code', 'message'])
    && typeof value.error.code === 'string'
    && typeof value.error.message === 'string';
}

function isChatResponse(value: unknown): value is ChatResponse {
  if (!isRecord(value)
    || !hasOnlyKeys(
      value,
      ['chunks', 'conversation_id', 'request_id', 'total_chunks'],
    )
    || !Array.isArray(value.chunks)
    || typeof value.conversation_id !== 'string'
    || typeof value.request_id !== 'string'
    || !Number.isInteger(value.total_chunks)
    || value.total_chunks !== value.chunks.length
  ) return false;
  return value.chunks.every((chunk) => isChatStreamPayload(chunk)
    && !isChatStreamError(chunk)
    && chunk.conversation_id === value.conversation_id
    && chunk.request_id === value.request_id);
}

export const apiClient = new VannaApiClient();
