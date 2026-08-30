/**
 * API client for communicating with Vanna Agents backend
 */

export interface ChatMessage {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: number;
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  user_id?: string;
  request_id?: string;
  metadata?: Record<string, any>;
}

export interface ChatStreamChunk {
  rich: Record<string, any>;
  simple?: Record<string, any>;
  conversation_id: string;
  request_id: string;
  timestamp: number;
}

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

export class VannaApiClient {
  public readonly baseUrl: string;
  private sseEndpoint: string;
  private pollEndpoint: string;
  private customHeaders: Record<string, string>;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || '';
    this.sseEndpoint = config.sseEndpoint || '/api/vanna/v2/chat_sse';
    this.pollEndpoint = config.pollEndpoint || '/api/vanna/v2/chat_poll';
    this.customHeaders = config.customHeaders || {};

    console.log('[VannaApiClient] Constructor called with config:', config);
    console.log('[VannaApiClient] Endpoint configuration:');
    console.log('  - SSE endpoint:', this.sseEndpoint, config.sseEndpoint ? '(custom)' : '(default)');
    console.log('  - Poll endpoint:', this.pollEndpoint, config.pollEndpoint ? '(custom)' : '(default)');
    console.log('  - Base URL:', this.baseUrl || '(empty)');
  }

  /**
   * Update custom headers (e.g., for authentication)
   */
  setCustomHeaders(headers: Record<string, string>) {
    this.customHeaders = headers;
  }

  /**
   * Get current custom headers
   */
  getCustomHeaders(): Record<string, string> {
    return { ...this.customHeaders };
  }

  /**
   * Send message using Server-Sent Events (SSE) streaming
   */
  async *streamChat(request: ChatRequest): AsyncGenerator<ChatStreamChunk, void, unknown> {
    const url = this.sseEndpoint.startsWith('http')
      ? this.sseEndpoint
      : `${this.baseUrl}${this.sseEndpoint}`;

    console.log('[VannaApiClient] SSE streaming to URL:', url);
    console.log('[VannaApiClient] SSE endpoint config:', {
      baseUrl: this.baseUrl,
      sseEndpoint: this.sseEndpoint,
      constructedUrl: url
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...this.customHeaders,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              return;
            }

            try {
              const chunk = JSON.parse(data) as ChatStreamChunk;
              yield chunk;
            } catch (e) {
              console.warn('Failed to parse SSE chunk:', data, e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Send message using polling (fallback option)
   */
  async sendPollMessage(request: ChatRequest): Promise<ChatResponse> {
    const url = this.pollEndpoint.startsWith('http')
      ? this.pollEndpoint
      : `${this.baseUrl}${this.pollEndpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.customHeaders,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<ChatResponse>;
  }

  /**
   * Generate unique IDs for conversations and requests
   */
  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Default API client instance
 */
export const apiClient = new VannaApiClient();
