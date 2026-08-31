import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  VannaApiClient,
  VannaApiError,
  isChatStreamError,
  isChatStreamProgress,
  isSafeLink,
} from '../src/services/api-client.js';

afterEach(() => vi.restoreAllMocks());

describe('VannaApiClient', () => {
  it('uses the V3 endpoint and parses typed SSE chunks', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      'data: {"component":{"type":"text","text":"ok"},"conversation_id":"c1","request_id":"r1","timestamp":1}\n\ndata: [DONE]\n\n',
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
    ));
    const chunks = [];
    for await (const chunk of new VannaApiClient().streamChat({ message: 'hello' })) {
      chunks.push(chunk);
    }

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/vanna/v3/chat_sse',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(chunks).toHaveLength(1);
    expect(isChatStreamError(chunks[0])).toBe(false);
    expect('component' in chunks[0] && chunks[0].component.type).toBe('text');
  });

  it('rejects unsupported components instead of guessing a renderer', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      'data: {"component":{"type":"chart"},"conversation_id":"c1","request_id":"r1","timestamp":1}\n\n',
      { status: 200 },
    ));
    const consume = async () => {
      for await (const chunk of new VannaApiClient().streamChat({ message: 'hello' })) {
        void chunk;
      }
    };
    await expect(consume()).rejects.toBeInstanceOf(VannaApiError);
  });

  it('parses strict progress envelopes alongside component chunks', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      [
        'data: {"progress":{"stage":"executing","message":"正在执行只读查询…"},"conversation_id":"c1","request_id":"r1","timestamp":1}',
        '',
        'data: {"component":{"type":"text","text":"ok"},"conversation_id":"c1","request_id":"r1","timestamp":2}',
        '',
        'data: [DONE]',
        '',
      ].join('\n'),
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
    ));

    const payloads = [];
    for await (const payload of new VannaApiClient().streamChat({ message: 'hello' })) {
      payloads.push(payload);
    }

    expect(payloads).toHaveLength(2);
    expect(isChatStreamProgress(payloads[0])).toBe(true);
    expect(isChatStreamProgress(payloads[1])).toBe(false);
  });

  it('rejects malformed progress and streams that end without DONE', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockResolvedValueOnce(new Response(
      'data: {"progress":{"stage":"tool","message":"unsafe"},"conversation_id":"c1","request_id":"r1","timestamp":1}\n\n',
      { status: 200 },
    ));
    const malformed = async () => {
      for await (const payload of new VannaApiClient().streamChat({ message: 'hello' })) {
        void payload;
      }
    };
    await expect(malformed()).rejects.toBeInstanceOf(VannaApiError);

    fetchMock.mockResolvedValueOnce(new Response(
      'data: {"component":{"type":"text","text":"partial"},"conversation_id":"c1","request_id":"r1","timestamp":1}\n\n',
      { status: 200 },
    ));
    const incomplete = async () => {
      for await (const payload of new VannaApiClient().streamChat({ message: 'hello' })) {
        void payload;
      }
    };
    await expect(incomplete()).rejects.toThrow('before [DONE]');
  });
});

describe('isSafeLink', () => {
  it('accepts relative and HTTP(S) URLs only', () => {
    expect(isSafeLink('/report/1')).toBe(true);
    expect(isSafeLink('https://example.com/report')).toBe(true);
    expect(isSafeLink('javascript:alert(1)')).toBe(false);
    expect(isSafeLink('//example.com/report')).toBe(false);
  });
});
