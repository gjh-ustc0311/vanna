import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  VannaApiClient,
  VannaApiError,
  isChatStreamError,
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
});

describe('isSafeLink', () => {
  it('accepts relative and HTTP(S) URLs only', () => {
    expect(isSafeLink('/report/1')).toBe(true);
    expect(isSafeLink('https://example.com/report')).toBe(true);
    expect(isSafeLink('javascript:alert(1)')).toBe(false);
    expect(isSafeLink('//example.com/report')).toBe(false);
  });
});
