import { afterEach, describe, expect, it, vi } from 'vitest';

import type { VannaChat } from '../src/components/vanna-chat.js';
import '../src/components/vanna-chat.js';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

interface CapturedRequest {
  conversation_id: string;
  metadata?: { starter_ui_request?: boolean };
  requestId: string;
  traceId: string;
  userId: string;
}

function captureRequest(init?: RequestInit): CapturedRequest {
  const body = JSON.parse(String(init?.body)) as {
    conversation_id: string;
    metadata?: { starter_ui_request?: boolean };
  };
  const headers = new Headers(init?.headers);
  return {
    ...body,
    requestId: headers.get('X-Request-Id') ?? '',
    traceId: headers.get('X-Trace-Id') ?? '',
    userId: headers.get('X-User-Id') ?? '',
  };
}

function correlationHeaders(request: CapturedRequest): HeadersInit {
  return {
    'Content-Type': 'text/event-stream',
    'X-Request-Id': request.requestId,
    'X-Trace-Id': request.traceId,
  };
}

function streamResponse(text: string, request: CapturedRequest): Response {
  const frame = JSON.stringify({
    component: { type: 'text', text },
    conversation_id: request.conversation_id,
    request_id: request.requestId,
    timestamp: 1,
  });
  return new Response(`data: ${frame}\n\ndata: [DONE]\n\n`, {
    status: 200,
    headers: correlationHeaders(request),
  });
}

function renderedMessageText(chat: VannaChat): string {
  return Array.from(chat.shadowRoot?.querySelectorAll('vanna-message') ?? [])
    .map((message) => message.shadowRoot?.textContent ?? '')
    .join('\n');
}

async function waitForStarter(chat: VannaChat): Promise<void> {
  await vi.waitFor(() => {
    expect(renderedMessageText(chat)).toContain('Welcome');
    expect(chat.shadowRoot?.querySelector('.shell')?.getAttribute('aria-busy')).toBe('false');
  });
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
        const request = captureRequest(init);
        const text = request.metadata?.starter_ui_request ? 'Welcome' : 'Visible answer';
        return streamResponse(text, request);
      },
    );

    const chat = document.createElement('vanna-chat') as VannaChat;
    document.body.append(chat);

    await waitForStarter(chat);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await expect(chat.sendMessage('hello')).resolves.toBe(true);
    await chat.updateComplete;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(renderedMessageText(chat)).toContain('Visible answer');
    expect(chat.shadowRoot?.textContent).not.toContain('Thinking…');
    expect(chat.shadowRoot?.querySelector('.shell')?.getAttribute('aria-busy')).toBe('false');
  });

  it('renders a 30-row preview followed by the File download card', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (_input, init) => {
        const request = captureRequest(init);
        if (request.metadata?.starter_ui_request) {
          return streamResponse('Welcome', request);
        }
        const rows = Array.from({ length: 30 }, (_, value) => ({ value }));
        const components = [
          {
            type: 'dataframe', columns: ['value'], rows, title: 'XPD 查询结果', truncated: true,
          },
          {
            type: 'file',
            name: 'xpd-query.xlsx',
            url: '/api/vanna/v3/files/123',
            media_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            size_bytes: 2048,
            row_count: 20_000,
            truncated: true,
            expires_at: '2026-09-01T00:00:00+08:00',
          },
        ];
        const frames = components.map((component, index) => `data: ${JSON.stringify({
          component,
          conversation_id: request.conversation_id,
          request_id: request.requestId,
          timestamp: index + 1,
        })}\n\n`).join('');
        return new Response(`${frames}data: [DONE]\n\n`, {
          status: 200,
          headers: correlationHeaders(request),
        });
      },
    );

    const chat = document.createElement('vanna-chat') as VannaChat;
    document.body.append(chat);
    await waitForStarter(chat);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await chat.sendMessage('export');
    await chat.updateComplete;

    const components = chat.shadowRoot?.querySelectorAll('.component') ?? [];
    expect(components).toHaveLength(2);
    expect(components[0].textContent).toContain('Showing the first 30 rows.');
    expect(components[1].textContent).toContain('下载查询结果');
    expect(components[1].textContent).toContain('20,000 行');
    expect(components[1].textContent).toContain('仅包含前 20,000 行');
  });

  it('replaces one transient progress status without adding chat messages', async () => {
    const encoder = new TextEncoder();
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    const progressEvents: unknown[] = [];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (_input, init) => {
        const request = captureRequest(init);
        if (request.metadata?.starter_ui_request) {
          return streamResponse('Welcome', request);
        }
        const body = new ReadableStream<Uint8Array>({
          start(streamController) {
            controller = streamController;
          },
        });
        return new Response(body, {
          status: 200,
          headers: correlationHeaders(request),
        });
      },
    );

    const chat = document.createElement('vanna-chat') as VannaChat;
    chat.addEventListener('progress-received', (event) => {
      progressEvents.push((event as CustomEvent).detail);
    });
    document.body.append(chat);
    await waitForStarter(chat);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const sending = chat.sendMessage('hello');
    await vi.waitFor(() => expect(controller).toBeDefined());
    const request = captureRequest(fetchMock.mock.calls[1][1]);
    controller?.enqueue(encoder.encode(progressFrame(
      'analyzing',
      '正在分析问题…',
      request.conversation_id,
      request.requestId,
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
      request.requestId,
    )));
    await vi.waitFor(() => {
      expect(chat.shadowRoot?.querySelectorAll('.busy')).toHaveLength(1);
      expect(chat.shadowRoot?.querySelector('.busy')?.textContent).toContain('正在执行只读查询…');
    });

    const answer = JSON.stringify({
      component: { type: 'text', text: 'Visible answer' },
      conversation_id: request.conversation_id,
      request_id: request.requestId,
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
        const request = captureRequest(init);
        if (request.metadata?.starter_ui_request) {
          return streamResponse('Welcome', request);
        }
        const body = new ReadableStream<Uint8Array>({
          start(streamController) {
            controller = streamController;
          },
        });
        return new Response(body, {
          status: 200,
          headers: correlationHeaders(request),
        });
      },
    );

    const chat = document.createElement('vanna-chat') as VannaChat;
    document.body.append(chat);
    await waitForStarter(chat);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const sending = chat.sendMessage('hello');
    await vi.waitFor(() => expect(controller).toBeDefined());
    const request = captureRequest(fetchMock.mock.calls[1][1]);
    controller?.enqueue(encoder.encode(progressFrame(
      'analyzing',
      '正在分析问题…',
      request.conversation_id,
      request.requestId,
    )));
    await vi.waitFor(() => {
      expect(chat.shadowRoot?.textContent).toContain('正在分析问题…');
    });
    controller?.error(new Error('connection lost'));
    await sending;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(renderedMessageText(chat)).toContain('The request could not be completed');
  });

  it('falls back after heartbeat-only EOF and preserves the turn request ID', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (input, init) => {
        const request = captureRequest(init);
        if (request.metadata?.starter_ui_request) {
          return streamResponse('Welcome', request);
        }
        if (String(input).endsWith('/chat_sse')) {
          return new Response(': heartbeat\n\n', {
            status: 200,
            headers: correlationHeaders(request),
          });
        }
        const chunk = {
          component: { type: 'text', text: 'Polling answer' },
          conversation_id: request.conversation_id,
          request_id: request.requestId,
          timestamp: 1,
        };
        return new Response(JSON.stringify({
          chunks: [chunk],
          conversation_id: request.conversation_id,
          request_id: request.requestId,
          total_chunks: 1,
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': request.requestId,
            'X-Trace-Id': request.traceId,
          },
        });
      },
    );

    const chat = document.createElement('vanna-chat') as VannaChat;
    chat.userId = '18446744073709551615';
    document.body.append(chat);
    await waitForStarter(chat);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await chat.sendMessage('hello');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const streamAttempt = captureRequest(fetchMock.mock.calls[1][1]);
    const pollAttempt = captureRequest(fetchMock.mock.calls[2][1]);
    expect(streamAttempt.requestId).toBe(pollAttempt.requestId);
    expect(streamAttempt.traceId).not.toBe(pollAttempt.traceId);
    expect(streamAttempt.userId).toBe('18446744073709551615');
    expect(chat.shadowRoot?.querySelector<HTMLInputElement>('.user-switch input')?.maxLength)
      .toBe(20);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).not.toHaveProperty('request_id');
    expect(renderedMessageText(chat)).toContain('Polling answer');
  });
});
