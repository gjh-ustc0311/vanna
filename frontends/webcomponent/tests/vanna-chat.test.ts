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

function progressFrame(
  stage: string,
  message: string,
  conversationId: string,
  requestId: string,
): string {
  return `data: ${JSON.stringify({
    progress: { stage, message },
    conversation_id: conversationId,
    request_id: requestId,
    timestamp: 1,
  })}\n\n`;
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

  it('replaces one transient progress status without adding chat messages', async () => {
    const encoder = new TextEncoder();
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    const progressEvents: unknown[] = [];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (_input, init) => {
        const request = JSON.parse(String(init?.body)) as {
          conversation_id: string;
          request_id: string;
          metadata?: { starter_ui_request?: boolean };
        };
        if (request.metadata?.starter_ui_request) {
          return streamResponse('Welcome', request.conversation_id, request.request_id);
        }
        const body = new ReadableStream<Uint8Array>({
          start(streamController) {
            controller = streamController;
          },
        });
        return new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        });
      },
    );

    const chat = document.createElement('vanna-chat') as VannaChat;
    chat.addEventListener('progress-received', (event) => {
      progressEvents.push((event as CustomEvent).detail);
    });
    document.body.append(chat);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const sending = chat.sendMessage('hello');
    await vi.waitFor(() => expect(controller).toBeDefined());
    const request = JSON.parse(String(fetchMock.mock.calls[1][1]?.body)) as {
      conversation_id: string;
      request_id: string;
    };
    controller?.enqueue(encoder.encode(progressFrame(
      'analyzing',
      '正在分析问题…',
      request.conversation_id,
      request.request_id,
    )));

    await vi.waitFor(() => {
      expect(chat.shadowRoot?.querySelectorAll('.busy')).toHaveLength(1);
      expect(chat.shadowRoot?.querySelector('.busy')?.textContent).toContain('正在分析问题…');
    });
    expect(renderedMessageText(chat)).not.toContain('正在分析问题…');

    controller?.enqueue(encoder.encode(progressFrame(
      'executing',
      '正在执行只读查询…',
      request.conversation_id,
      request.request_id,
    )));
    await vi.waitFor(() => {
      expect(chat.shadowRoot?.querySelectorAll('.busy')).toHaveLength(1);
      expect(chat.shadowRoot?.querySelector('.busy')?.textContent).toContain('正在执行只读查询…');
    });

    const answer = JSON.stringify({
      component: { type: 'text', text: 'Visible answer' },
      conversation_id: request.conversation_id,
      request_id: request.request_id,
      timestamp: 2,
    });
    controller?.enqueue(encoder.encode(`data: ${answer}\n\ndata: [DONE]\n\n`));
    controller?.close();
    await sending;
    await chat.updateComplete;

    expect(progressEvents).toHaveLength(2);
    expect(renderedMessageText(chat)).toContain('Visible answer');
    expect(renderedMessageText(chat)).not.toContain('正在执行只读查询…');
    expect(chat.shadowRoot?.querySelector('.busy')).toBeNull();
  });

  it('does not replay through polling after progress has started execution', async () => {
    const encoder = new TextEncoder();
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (_input, init) => {
        const request = JSON.parse(String(init?.body)) as {
          conversation_id: string;
          request_id: string;
          metadata?: { starter_ui_request?: boolean };
        };
        if (request.metadata?.starter_ui_request) {
          return streamResponse('Welcome', request.conversation_id, request.request_id);
        }
        const body = new ReadableStream<Uint8Array>({
          start(streamController) {
            controller = streamController;
          },
        });
        return new Response(body, { status: 200 });
      },
    );

    const chat = document.createElement('vanna-chat') as VannaChat;
    document.body.append(chat);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const sending = chat.sendMessage('hello');
    await vi.waitFor(() => expect(controller).toBeDefined());
    const request = JSON.parse(String(fetchMock.mock.calls[1][1]?.body)) as {
      conversation_id: string;
      request_id: string;
    };
    controller?.enqueue(encoder.encode(progressFrame(
      'analyzing',
      '正在分析问题…',
      request.conversation_id,
      request.request_id,
    )));
    await vi.waitFor(() => {
      expect(chat.shadowRoot?.textContent).toContain('正在分析问题…');
    });
    controller?.error(new Error('connection lost'));
    await sending;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(renderedMessageText(chat)).toContain('The request could not be completed');
  });
});
