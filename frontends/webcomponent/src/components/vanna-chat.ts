import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import './vanna-message.js';
import { vannaDesignTokens } from '../styles/vanna-design-tokens.js';
import {
  type ChatRequest,
  type ChatStreamChunk,
  type DataFrameComponent,
  type JsonScalar,
  type VannaComponent,
  VannaApiClient,
  VannaApiError,
  isChatStreamError,
  isSafeLink,
} from '../services/api-client.js';

interface UserMessage {
  kind: 'user';
  id: string;
  text: string;
  timestamp: number;
}

interface ComponentMessage {
  kind: 'component';
  id: string;
  component: VannaComponent;
  timestamp: number;
}

type ChatItem = UserMessage | ComponentMessage;

@customElement('vanna-chat')
export class VannaChat extends LitElement {
  static styles = [
    vannaDesignTokens,
    css`
      :host {
        display: block;
        width: min(100%, 960px);
        height: min(760px, 90vh);
        min-height: 420px;
        color: var(--vanna-foreground-default);
        font-family: var(--vanna-font-family-default);
      }

      .shell {
        box-sizing: border-box;
        display: grid;
        grid-template-rows: auto minmax(0, 1fr) auto;
        height: 100%;
        overflow: hidden;
        border: 1px solid var(--vanna-outline-dimmer);
        border-radius: 18px;
        background: var(--vanna-background-root);
        box-shadow: var(--vanna-shadow-lg);
      }

      header {
        padding: var(--vanna-space-5) var(--vanna-space-6);
        border-bottom: 1px solid var(--vanna-outline-dimmer);
      }
      h1 { margin: 0; font-size: 18px; font-weight: 650; }
      .subtitle {
        margin: 4px 0 0;
        color: var(--vanna-foreground-dimmer);
        font-size: 13px;
      }

      .messages {
        overflow: auto;
        padding: var(--vanna-space-6);
        scroll-behavior: smooth;
      }
      .empty {
        display: grid;
        height: 100%;
        place-items: center;
        color: var(--vanna-foreground-dimmer);
        text-align: center;
      }

      .component { margin-bottom: var(--vanna-space-4); }
      .table-card {
        overflow: hidden;
        border: 1px solid var(--vanna-outline-dimmer);
        border-radius: 12px;
        background: var(--vanna-background-root);
      }
      .table-title {
        margin: 0;
        padding: 12px 14px;
        border-bottom: 1px solid var(--vanna-outline-dimmer);
        font-size: 14px;
      }
      .table-scroll { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td {
        padding: 10px 12px;
        border-bottom: 1px solid var(--vanna-outline-dimmer);
        text-align: left;
        white-space: nowrap;
      }
      th { background: var(--vanna-background-higher); font-weight: 650; }
      tbody tr:last-child td { border-bottom: 0; }
      .table-note {
        margin: 0;
        padding: 9px 12px;
        border-top: 1px solid var(--vanna-outline-dimmer);
        color: var(--vanna-foreground-dimmer);
        font-size: 12px;
      }
      .link-card {
        display: inline-flex;
        align-items: center;
        min-height: 40px;
        padding: 0 14px;
        border: 1px solid var(--vanna-outline-default);
        border-radius: 10px;
        color: var(--vanna-accent-primary-default);
        font-weight: 600;
        text-decoration: none;
      }
      .link-card:hover { background: var(--vanna-background-higher); }

      .busy {
        margin: 0 0 var(--vanna-space-4);
        color: var(--vanna-foreground-dimmer);
        font-size: 13px;
      }
      .busy::before {
        content: '';
        display: inline-block;
        width: 7px;
        height: 7px;
        margin-right: 8px;
        border-radius: 50%;
        background: var(--vanna-accent-primary-default);
        animation: pulse 1s ease-in-out infinite alternate;
      }
      @keyframes pulse { to { opacity: 0.3; } }

      form {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: var(--vanna-space-3);
        padding: var(--vanna-space-4);
        border-top: 1px solid var(--vanna-outline-dimmer);
        background: var(--vanna-background-higher);
      }
      textarea {
        box-sizing: border-box;
        min-height: 44px;
        max-height: 130px;
        resize: vertical;
        padding: 11px 13px;
        border: 1px solid var(--vanna-outline-default);
        border-radius: 10px;
        background: var(--vanna-background-root);
        color: var(--vanna-foreground-default);
        font: inherit;
        line-height: 1.4;
      }
      textarea:focus {
        border-color: var(--vanna-accent-primary-default);
        outline: 2px solid color-mix(in srgb, var(--vanna-accent-primary-default) 20%, transparent);
      }
      button {
        min-width: 82px;
        border: 0;
        border-radius: 10px;
        background: var(--vanna-accent-primary-default);
        color: white;
        font: inherit;
        font-weight: 650;
        cursor: pointer;
      }
      button:disabled, textarea:disabled { cursor: not-allowed; opacity: 0.55; }

      :host([theme='dark']) .shell,
      :host([theme='dark']) .table-card,
      :host([theme='dark']) textarea {
        background: var(--vanna-background-higher);
      }

      @media (max-width: 600px) {
        :host { height: 100dvh; min-height: 0; }
        .shell { border-width: 0; border-radius: 0; }
        header, .messages { padding: var(--vanna-space-4); }
        form { grid-template-columns: 1fr; }
        button { min-height: 42px; }
      }
    `,
  ];

  @property() title = 'Vanna AI Chat';
  @property() subtitle = '';
  @property() placeholder = 'Ask me anything...';
  @property({ type: Boolean }) disabled = false;
  @property({ reflect: true }) theme = 'light';
  @property({ attribute: 'api-base' }) apiBaseUrl = '';
  @property({ attribute: 'sse-endpoint' }) sseEndpoint = '/api/vanna/v3/chat_sse';
  @property({ attribute: 'poll-endpoint' }) pollEndpoint = '/api/vanna/v3/chat_poll';

  @state() private currentMessage = '';
  @state() private busy = false;
  @state() private items: ChatItem[] = [];

  private conversationId = this.generateId();
  private customHeaders: Record<string, string> = {};

  protected firstUpdated(): void {
    void this.requestStarter();
  }

  render() {
    const inputDisabled = this.disabled || this.busy;
    return html`
      <section class="shell" aria-busy=${String(this.busy)}>
        <header>
          <h1>${this.title}</h1>
          ${this.subtitle ? html`<p class="subtitle">${this.subtitle}</p>` : nothing}
        </header>
        <main class="messages" aria-live="polite">
          ${this.items.length === 0 && !this.busy
            ? html`<div class="empty">Ask a question to begin.</div>`
            : this.items.map((item) => this.renderItem(item))}
          ${this.busy ? html`<p class="busy" role="status">Thinking…</p>` : nothing}
        </main>
        <form @submit=${this.handleSubmit}>
          <textarea
            .value=${this.currentMessage}
            placeholder=${this.placeholder}
            ?disabled=${inputDisabled}
            aria-label=${this.placeholder}
            @input=${this.handleInput}
            @keydown=${this.handleKeydown}
          ></textarea>
          <button type="submit" ?disabled=${inputDisabled || !this.currentMessage.trim()}>
            Send
          </button>
        </form>
      </section>
    `;
  }

  async sendMessage(messageText?: string): Promise<boolean> {
    const text = (messageText ?? this.currentMessage).trim();
    if (!text || this.disabled || this.busy) return false;

    this.currentMessage = '';
    this.items = [...this.items, {
      kind: 'user',
      id: this.generateId(),
      text,
      timestamp: Date.now(),
    }];
    this.dispatchEvent(new CustomEvent('message-sent', {
      detail: { message: text, conversationId: this.conversationId },
      bubbles: true,
      composed: true,
    }));
    await this.performRequest({ message: text, conversation_id: this.conversationId });
    return true;
  }

  addMessage(content: string, type: 'user' | 'assistant' = 'assistant'): void {
    const timestamp = Date.now();
    this.items = type === 'user'
      ? [...this.items, { kind: 'user', id: this.generateId(), text: content, timestamp }]
      : [...this.items, {
        kind: 'component',
        id: this.generateId(),
        component: { type: 'text', text: content },
        timestamp,
      }];
    void this.scrollToEnd();
  }

  clearMessages(): void {
    this.items = [];
    this.conversationId = this.generateId();
  }

  setCustomHeaders(headers: Record<string, string>): void {
    this.customHeaders = { ...headers };
  }

  updateApiBaseUrl(baseUrl: string): void {
    this.apiBaseUrl = baseUrl;
  }

  getApiClient(): VannaApiClient {
    return this.createClient();
  }

  private async requestStarter(): Promise<void> {
    await this.performRequest({
      message: '',
      conversation_id: this.conversationId,
      metadata: { starter_ui_request: true },
    }, true);
  }

  private async performRequest(request: ChatRequest, silent = false): Promise<void> {
    this.busy = true;
    const client = this.createClient();
    const payload = { ...request, request_id: client.generateId() };
    let receivedPayload = false;
    try {
      try {
        for await (const chunk of client.streamChat(payload)) {
          receivedPayload = true;
          if (isChatStreamError(chunk)) {
            throw new VannaApiError(chunk.error.message, chunk.error.code);
          }
          this.appendChunk(chunk);
        }
      } catch (error) {
        if (receivedPayload) throw error;
      }
      if (!receivedPayload) await this.consumePoll(client, payload);
    } catch (error) {
      if (!silent) this.appendError(error);
    } finally {
      this.busy = false;
      await this.scrollToEnd();
    }
  }

  private async consumePoll(client: VannaApiClient, request: ChatRequest): Promise<void> {
    const response = await client.sendPollMessage(request);
    for (const chunk of response.chunks) this.appendChunk(chunk);
  }

  private appendChunk(chunk: ChatStreamChunk): void {
    this.conversationId = chunk.conversation_id || this.conversationId;
    this.items = [...this.items, {
      kind: 'component',
      id: `${chunk.request_id}-${chunk.timestamp}-${this.items.length}`,
      component: chunk.component,
      timestamp: chunk.timestamp * 1000,
    }];
    this.dispatchEvent(new CustomEvent('chunk-received', {
      detail: chunk,
      bubbles: true,
      composed: true,
    }));
    void this.scrollToEnd();
  }

  private appendError(error: unknown): void {
    const message = error instanceof VannaApiError
      ? error.message
      : 'The request could not be completed. Please try again.';
    this.addMessage(message, 'assistant');
    this.dispatchEvent(new CustomEvent('chat-error', {
      detail: { message },
      bubbles: true,
      composed: true,
    }));
  }

  private renderItem(item: ChatItem) {
    if (item.kind === 'user') {
      return html`<vanna-message
        type="user"
        .content=${item.text}
        .markdown=${false}
        .timestamp=${item.timestamp}
        theme=${this.theme}
      ></vanna-message>`;
    }

    const component = item.component;
    if (component.type === 'text') {
      return html`<vanna-message
        type="assistant"
        .content=${component.text}
        .markdown=${true}
        .timestamp=${item.timestamp}
        theme=${this.theme}
      ></vanna-message>`;
    }
    if (component.type === 'dataframe') return this.renderDataFrame(component);
    if (!isSafeLink(component.url)) {
      return html`<vanna-message
        type="assistant"
        content="Unsupported link"
        .timestamp=${item.timestamp}
        theme=${this.theme}
      ></vanna-message>`;
    }
    return html`<div class="component">
      <a class="link-card" href=${component.url} target="_blank" rel="noopener noreferrer">
        ${component.text || component.url}
      </a>
    </div>`;
  }

  private renderDataFrame(component: DataFrameComponent) {
    return html`<section class="component table-card">
      ${component.title ? html`<h2 class="table-title">${component.title}</h2>` : nothing}
      <div class="table-scroll">
        <table>
          <thead><tr>${component.columns.map((column) => html`<th scope="col">${column}</th>`)}</tr></thead>
          <tbody>
            ${component.rows.length
              ? component.rows.map((row) => html`<tr>${component.columns.map(
                (column) => html`<td>${this.formatCell(row[column])}</td>`,
              )}</tr>`)
              : html`<tr><td colspan=${Math.max(component.columns.length, 1)}>No rows returned.</td></tr>`}
          </tbody>
        </table>
      </div>
      ${component.truncated ? html`<p class="table-note">Showing the first 100 rows.</p>` : nothing}
    </section>`;
  }

  private formatCell(value: JsonScalar | undefined): string {
    if (value === null || value === undefined) return '—';
    return String(value);
  }

  private createClient(): VannaApiClient {
    return new VannaApiClient({
      baseUrl: this.apiBaseUrl,
      sseEndpoint: this.sseEndpoint,
      pollEndpoint: this.pollEndpoint,
      customHeaders: this.customHeaders,
    });
  }

  private handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    void this.sendMessage();
  }

  private handleInput(event: InputEvent): void {
    this.currentMessage = (event.target as HTMLTextAreaElement).value;
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.sendMessage();
    }
  }

  private generateId(): string {
    return globalThis.crypto?.randomUUID?.()
      ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  private async scrollToEnd(): Promise<void> {
    await this.updateComplete;
    const messages = this.renderRoot.querySelector<HTMLElement>('.messages');
    if (messages) messages.scrollTop = messages.scrollHeight;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'vanna-chat': VannaChat;
  }
}
