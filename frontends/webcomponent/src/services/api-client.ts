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

export interface FileComponent {
  type: 'file';
  name: string;
  url: string;
  media_type: string;
  size_bytes: number;
  row_count: number;
  truncated: boolean;
  expires_at: string;
}

export type VannaComponent = TextComponent | DataFrameComponent | FileComponent;

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatRequestHeaders {
  requestId: string;
  traceId?: string;
  userId: string;
}

export interface ChatStreamChunk {
  component: VannaComponent;
  conversation_id: string;
  request_id: string;
  timestamp: number;
}

export type ProgressStage =
  | 'analyzing'
  | 'preparing'
  | 'executing'
  | 'summarizing'
  | 'recovering';

export interface ProgressUpdate {
  stage: ProgressStage;
  message: string;
}

export interface ChatStreamProgress {
  progress: ProgressUpdate;
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

export type ChatStreamPayload = ChatStreamChunk | ChatStreamProgress | ChatStreamError;

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

const RESERVED_REQUEST_HEADERS = new Set([
  'content-type',
  'accept',
  'x-request-id',
  'x-trace-id',
  'x-user-id',
]);
const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CANONICAL_USER_ID = /^(?:0|[1-9][0-9]{0,19})$/;
const MAX_UINT64 = 18_446_744_073_709_551_615n;

export function isSafeIdentifier(value: string): boolean {
  return SAFE_IDENTIFIER.test(value);
}

export function isCanonicalUserId(value: string): boolean {
  return CANONICAL_USER_ID.test(value) && BigInt(value) <= MAX_UINT64;
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

export function isChatStreamProgress(payload: unknown): payload is ChatStreamProgress {
  return isRecord(payload)
    && hasOnlyKeys(payload, ['progress', 'conversation_id', 'request_id', 'timestamp'])
    && hasEnvelopeFields(payload)
    && isProgressUpdate(payload.progress);
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
    this.customHeaders = {};
    this.setCustomHeaders(config.customHeaders ?? {});
  }

  setCustomHeaders(headers: Record<string, string>): void {
    for (const name of Object.keys(headers)) {
      if (RESERVED_REQUEST_HEADERS.has(name.toLowerCase())) {
        throw new VannaApiError(`The ${name} header is managed by the Vanna protocol.`);
      }
    }
    this.customHeaders = { ...headers };
  }

  getCustomHeaders(): Record<string, string> {
    return { ...this.customHeaders };
  }

  async *streamChat(
    request: ChatRequest,
    requestHeaders: ChatRequestHeaders,
  ): AsyncGenerator<ChatStreamPayload, void, unknown> {
    const response = await fetch(this.resolveUrl(this.sseEndpoint), {
      method: 'POST',
      headers: this.buildHeaders(requestHeaders, 'text/event-stream'),
      body: JSON.stringify(request),
    });
    this.assertResponseCorrelation(response, requestHeaders);
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
          if (payload) {
            this.assertPayloadCorrelation(payload, requestHeaders.requestId);
            yield payload;
          }
        }
        if (done) break;
      }

      if (buffer.trim()) {
        const payload = this.parseSseEvent(buffer);
        if (payload === null) return;
        if (payload) {
          this.assertPayloadCorrelation(payload, requestHeaders.requestId);
          yield payload;
        }
      }
      throw new VannaApiError('The server ended the stream before [DONE].');
    } finally {
      try {
        await reader.cancel();
      } catch {
        // Preserve the original stream result or protocol error.
      }
      reader.releaseLock();
    }
  }

  async sendPollMessage(
    request: ChatRequest,
    requestHeaders: ChatRequestHeaders,
  ): Promise<ChatResponse> {
    const response = await fetch(this.resolveUrl(this.pollEndpoint), {
      method: 'POST',
      headers: this.buildHeaders(requestHeaders, 'application/json'),
      body: JSON.stringify(request),
    });
    this.assertResponseCorrelation(response, requestHeaders);
    await this.assertOk(response);
    const payload: unknown = await response.json();
    if (!isChatResponse(payload)) {
      throw new VannaApiError('The server returned an invalid polling response.');
    }
    this.assertPayloadCorrelation(payload, requestHeaders.requestId);
    return payload;
  }

  async downloadLocalFile(url: string, userId: string): Promise<Blob> {
    const resolvedUrl = this.resolveLocalFileUrl(url);
    if (!resolvedUrl || !isCanonicalUserId(userId)) {
      throw new VannaApiError('The local file request is invalid.');
    }
    const response = await fetch(resolvedUrl, {
      method: 'GET',
      headers: { 'X-User-Id': userId },
    });
    if (!response.ok) {
      throw new VannaApiError(
        `File download failed with HTTP ${response.status}.`,
        'file_download_error',
        response.status,
      );
    }
    return response.blob();
  }

  generateId(): string {
    return globalThis.crypto?.randomUUID?.()
      ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  private resolveUrl(endpoint: string): string {
    return /^https?:\/\//i.test(endpoint) ? endpoint : `${this.baseUrl}${endpoint}`;
  }

  private resolveLocalFileUrl(url: string): string | null {
    const value = url.trim();
    if (!value || value.startsWith('//') || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)) {
      return null;
    }
    const browserOrigin = globalThis.location?.origin ?? 'http://localhost';
    try {
      const serviceOrigin = new URL(this.baseUrl || '/', browserOrigin).origin;
      const resolved = this.resolveUrl(value);
      return new URL(resolved, browserOrigin).origin === serviceOrigin ? resolved : null;
    } catch {
      return null;
    }
  }

  private buildHeaders(
    headers: ChatRequestHeaders,
    accept: 'text/event-stream' | 'application/json',
  ): Record<string, string> {
    if (!isSafeIdentifier(headers.requestId)
      || (headers.traceId !== undefined && !isSafeIdentifier(headers.traceId))
      || !isCanonicalUserId(headers.userId)
    ) {
      throw new VannaApiError('The request correlation headers are invalid.');
    }
    return {
      ...this.customHeaders,
      'Content-Type': 'application/json',
      Accept: accept,
      'X-Request-Id': headers.requestId,
      ...(headers.traceId ? { 'X-Trace-Id': headers.traceId } : {}),
      'X-User-Id': headers.userId,
    };
  }

  private assertResponseCorrelation(
    response: Response,
    headers: ChatRequestHeaders,
  ): void {
    const expectedTraceId = headers.traceId ?? headers.requestId;
    if (response.headers.get('X-Request-Id') !== headers.requestId
      || response.headers.get('X-Trace-Id') !== expectedTraceId
    ) {
      throw new VannaApiError('The server returned mismatched request correlation.');
    }
  }

  private assertPayloadCorrelation(
    payload: ChatStreamPayload | ChatResponse,
    requestId: string,
  ): void {
    if (payload.request_id !== requestId) {
      throw new VannaApiError('The server returned mismatched request correlation.');
    }
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
  if (value.type === 'file') {
    return hasOnlyKeys(value, [
      'type', 'name', 'url', 'media_type', 'size_bytes', 'row_count', 'truncated', 'expires_at',
    ])
      && typeof value.name === 'string'
      && value.name.length >= 1
      && value.name.length <= 255
      && value.name.trim() === value.name
      && !/[\\/\u0000-\u001f\u007f]/.test(value.name)
      && typeof value.url === 'string'
      && isSafeLink(value.url)
      && typeof value.media_type === 'string'
      && /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/.test(value.media_type)
      && Number.isSafeInteger(value.size_bytes)
      && (value.size_bytes as number) >= 0
      && Number.isSafeInteger(value.row_count)
      && (value.row_count as number) >= 0
      && typeof value.truncated === 'boolean'
      && typeof value.expires_at === 'string'
      && /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value.expires_at)
      && Number.isFinite(Date.parse(value.expires_at));
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

function isProgressUpdate(value: unknown): value is ProgressUpdate {
  if (!isRecord(value)
    || !hasOnlyKeys(value, ['stage', 'message'])
    || typeof value.stage !== 'string'
    || typeof value.message !== 'string'
    || value.message.length < 1
    || value.message.length > 120
  ) return false;
  return [
    'analyzing',
    'preparing',
    'executing',
    'summarizing',
    'recovering',
  ].includes(value.stage);
}

function isChatStreamPayload(value: unknown): value is ChatStreamPayload {
  if (!isRecord(value) || !hasEnvelopeFields(value)) return false;
  if ('component' in value) {
    return hasOnlyKeys(
      value,
      ['component', 'conversation_id', 'request_id', 'timestamp'],
    ) && isComponent(value.component);
  }
  if ('progress' in value) return isChatStreamProgress(value);
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
