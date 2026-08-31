import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { LitElement, css, html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { customElement, property } from 'lit/decorators.js';

import { vannaDesignTokens } from '../styles/vanna-design-tokens.js';

@customElement('vanna-message')
export class VannaMessage extends LitElement {
  static styles = [
    vannaDesignTokens,
    css`
      :host {
        display: block;
        margin: 0 0 var(--vanna-space-4);
        font-family: var(--vanna-font-family-default);
      }

      .message {
        box-sizing: border-box;
        max-width: min(88%, 720px);
        padding: var(--vanna-space-4) var(--vanna-space-5);
        border: 1px solid var(--vanna-outline-dimmer);
        border-radius: 18px 18px 18px 5px;
        background: var(--vanna-background-root);
        color: var(--vanna-foreground-default);
        box-shadow: var(--vanna-shadow-sm);
        line-height: 1.55;
        overflow-wrap: anywhere;
      }

      .message.user {
        margin-left: auto;
        border: 0;
        border-radius: 18px 18px 5px 18px;
        background: var(--vanna-accent-primary-default);
        color: white;
        white-space: pre-wrap;
      }

      .content > :first-child { margin-top: 0; }
      .content > :last-child { margin-bottom: 0; }
      .content p, .content ul, .content ol, .content pre, .content blockquote {
        margin: 0.65em 0;
      }
      .content pre {
        padding: 0.8em;
        border-radius: 8px;
        background: var(--vanna-background-higher);
        overflow-x: auto;
      }
      .content code {
        padding: 0.1em 0.3em;
        border-radius: 4px;
        background: var(--vanna-background-higher);
        font-family: var(--vanna-font-family-mono);
      }
      .content pre code { padding: 0; }
      .content a { color: var(--vanna-accent-primary-default); }
      .content blockquote {
        margin-left: 0;
        padding-left: 0.9em;
        border-left: 3px solid var(--vanna-outline-default);
        color: var(--vanna-foreground-dimmer);
      }

      .timestamp {
        margin-top: var(--vanna-space-2);
        color: var(--vanna-foreground-dimmest);
        font-size: 11px;
      }
      .user .timestamp { color: rgb(255 255 255 / 75%); text-align: right; }

      :host([theme='dark']) .message:not(.user) {
        background: var(--vanna-background-higher);
      }

      @media (max-width: 600px) {
        .message { max-width: 96%; }
      }
    `,
  ];

  @property() content = '';
  @property() type: 'user' | 'assistant' = 'assistant';
  @property({ type: Boolean }) markdown = true;
  @property({ type: Number }) timestamp = Date.now();
  @property({ reflect: true }) theme = 'light';

  protected updated(): void {
    for (const link of this.renderRoot.querySelectorAll<HTMLAnchorElement>('a')) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  }

  render() {
    const rendered = this.markdown
      ? unsafeHTML(renderSafeMarkdown(this.content))
      : this.content;
    return html`
      <article class="message ${this.type}">
        <div class="content">${rendered}</div>
        <div class="timestamp">${this.formatTimestamp()}</div>
      </article>
    `;
  }

  private formatTimestamp(): string {
    return new Date(this.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

export function renderSafeMarkdown(source: string): string {
  // Escape source HTML before Markdown parsing so raw HTML is never interpreted.
  const escaped = source
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const parsed = marked.parse(escaped, { async: false }) as string;
  return DOMPurify.sanitize(parsed, {
    ALLOWED_TAGS: [
      'a', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3',
      'h4', 'h5', 'h6', 'hr', 'li', 'ol', 'p', 'pre', 'strong', 'ul',
    ],
    ALLOWED_ATTR: ['href', 'title'],
  });
}

declare global {
  interface HTMLElementTagNameMap {
    'vanna-message': VannaMessage;
  }
}
