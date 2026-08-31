import { afterEach, describe, expect, it, vi } from 'vitest';

import type { VannaChat } from '../src/components/vanna-chat.js';
import '../src/components/vanna-chat.js';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function streamResponse(text: string, conversationId: string, requestId: string): Response {
  const frame = JSON.stringify({
    component: { type: 'text', text },
    conversation_id: conversationId,
    request_id: requestId,
    timestamp: 1,
  });
  return new Response(`data: ${frame}\n\ndata: [DONE]\n\n`, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

function renderedMessageText(chat: VannaChat): string {
  return Array.from(chat.shadowRoot?.querySelectorAll('vanna-message') ?? [])
    .map((message) => message.shadowRoot?.textContent ?? '')
    .join('\n');
}

describe('vanna-chat', () => {
  it('renders V3 chunks and clears the local sending state after DONE', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (_input, init) => {
        const request = JSON.parse(String(init?.body)) as {
          conversation_id: string;
          request_id: string;
          metadata?: { starter_ui_request?: boolean };
        };
        const text = request.metadata?.starter_ui_request ? 'Welcome' : 'Visible answer';
        return streamResponse(text, request.conversation_id, request.request_id);
      },
    );

    const chat = document.createElement('vanna-chat') as VannaChat;
    document.body.append(chat);

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(renderedMessageText(chat)).toContain('Welcome');
    });

    await expect(chat.sendMessage('hello')).resolves.toBe(true);
    await chat.updateComplete;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(renderedMessageText(chat)).toContain('Visible answer');
    expect(chat.shadowRoot?.textContent).not.toContain('Thinking…');
    expect(chat.shadowRoot?.querySelector('.shell')?.getAttribute('aria-busy')).toBe('false');
  });
});
