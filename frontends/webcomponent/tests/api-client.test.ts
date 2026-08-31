import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  VannaApiClient,
  VannaApiError,
  isChatStreamError,
  isChatStreamProgress,
  isCanonicalUserId,
  isSafeLink,
} from '../src/services/api-client.js';

afterEach(() => vi.restoreAllMocks());

const CHAT_HEADERS = { requestId: 'r1', traceId: 't1', userId: '123' };

function chatResponse(body: BodyInit | null, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('X-Request-Id', CHAT_HEADERS.requestId);
  headers.set('X-Trace-Id', CHAT_HEADERS.traceId);
  return new Response(body, { ...init, headers });
}

describe('VannaApiClient', () => {
  it('accepts only canonical decimal values in the full uint64 range', () => {
    for (const value of ['0', '1', '9223372036854775808', '18446744073709551615']) {
      expect(isCanonicalUserId(value)).toBe(true);
    }
    for (const value of [
      '', '-1', '+1', '00', '01', ' 1', '1 ', '1.0', '1e3', '18446744073709551616',
    ]) {
      expect(isCanonicalUserId(value)).toBe(false);
    }
  });

  it('uses the V3 endpoint and parses typed SSE chunks', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(chatResponse(
      'data: {"component":{"type":"text","text":"ok"},"conversation_id":"c1","request_id":"r1","timestamp":1}\n\ndata: [DONE]\n\n',
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
    ));
    const chunks = [];
    for await (const chunk of new VannaApiClient().streamChat(
      { message: 'hello' }, CHAT_HEADERS,
    )) {
      chunks.push(chunk);
    }

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/vanna/v3/chat_sse',
      expect.objectContaining({ method: 'POST' }),
    );
    const init = fetchMock.mock.calls[0][1];
    const headers = new Headers(init?.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Accept')).toBe('text/event-stream');
    expect(headers.get('X-Request-Id')).toBe('r1');
    expect(headers.get('X-Trace-Id')).toBe('t1');
    expect(headers.get('X-User-Id')).toBe('123');
    expect(JSON.parse(String(init?.body))).toEqual({ message: 'hello' });
    expect(chunks).toHaveLength(1);
    expect(isChatStreamError(chunks[0])).toBe(false);
    expect('component' in chunks[0] && chunks[0].component.type).toBe('text');
  });

  it('supports server trace fallback when the client omits X-Trace-Id', async () => {
    const headers = { requestId: 'r1', userId: '123' };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      'data: [DONE]\n\n',
      {
        status: 200,
        headers: {
          'X-Request-Id': 'r1',
          'X-Trace-Id': 'r1',
        },
      },
    ));

    for await (const payload of new VannaApiClient().streamChat({ message: 'hello' }, headers)) {
      void payload;
    }

    const requestHeaders = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(requestHeaders.get('X-Trace-Id')).toBeNull();
  });

  it('rejects unsupported components instead of guessing a renderer', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(chatResponse(
      'data: {"component":{"type":"chart"},"conversation_id":"c1","request_id":"r1","timestamp":1}\n\n',
      { status: 200 },
    ));
    const consume = async () => {
      for await (const chunk of new VannaApiClient().streamChat(
        { message: 'hello' }, CHAT_HEADERS,
      )) {
        void chunk;
      }
    };
    await expect(consume()).rejects.toBeInstanceOf(VannaApiError);
  });

  it('accepts strict File payloads and rejects legacy Link payloads', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockResolvedValueOnce(chatResponse(
      'data: {"component":{"type":"file","name":"result.xlsx","url":"/api/vanna/v3/files/123","media_type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","size_bytes":1024,"row_count":31,"truncated":false,"expires_at":"2026-09-01T00:00:00+08:00"},"conversation_id":"c1","request_id":"r1","timestamp":1}\n\ndata: [DONE]\n\n',
      { status: 200 },
    ));
    const payloads = [];
    for await (const payload of new VannaApiClient().streamChat(
      { message: 'export' }, CHAT_HEADERS,
    )) {
      payloads.push(payload);
    }
    expect('component' in payloads[0] && payloads[0].component.type).toBe('file');

    fetchMock.mockResolvedValueOnce(chatResponse(
      'data: {"component":{"type":"link","url":"/report"},"conversation_id":"c1","request_id":"r1","timestamp":1}\n\n',
      { status: 200 },
    ));
    const consumeLegacy = async () => {
      for await (const payload of new VannaApiClient().streamChat(
        { message: 'export' }, CHAT_HEADERS,
      )) {
        void payload;
      }
    };
    await expect(consumeLegacy()).rejects.toBeInstanceOf(VannaApiError);
  });

  it('rejects File payloads with dangerous URLs or naive expiry times', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(chatResponse(
      'data: {"component":{"type":"file","name":"result.xlsx","url":"javascript:alert(1)","media_type":"application/octet-stream","size_bytes":1,"row_count":1,"truncated":false,"expires_at":"2026-09-01T00:00:00"},"conversation_id":"c1","request_id":"r1","timestamp":1}\n\n',
      { status: 200 },
    ));
    const consume = async () => {
      for await (const payload of new VannaApiClient().streamChat(
        { message: 'export' }, CHAT_HEADERS,
      )) {
        void payload;
      }
    };
    await expect(consume()).rejects.toBeInstanceOf(VannaApiError);
  });

  it('parses strict progress envelopes alongside component chunks', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(chatResponse(
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
    for await (const payload of new VannaApiClient().streamChat(
      { message: 'hello' }, CHAT_HEADERS,
    )) {
      payloads.push(payload);
    }

    expect(payloads).toHaveLength(2);
    expect(isChatStreamProgress(payloads[0])).toBe(true);
    expect(isChatStreamProgress(payloads[1])).toBe(false);
  });

  it('rejects malformed progress and streams that end without DONE', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockResolvedValueOnce(chatResponse(
      'data: {"progress":{"stage":"tool","message":"unsafe"},"conversation_id":"c1","request_id":"r1","timestamp":1}\n\n',
      { status: 200 },
    ));
    const malformed = async () => {
      for await (const payload of new VannaApiClient().streamChat(
        { message: 'hello' }, CHAT_HEADERS,
      )) {
        void payload;
      }
    };
    await expect(malformed()).rejects.toBeInstanceOf(VannaApiError);

    fetchMock.mockResolvedValueOnce(chatResponse(
      'data: {"component":{"type":"text","text":"partial"},"conversation_id":"c1","request_id":"r1","timestamp":1}\n\n',
      { status: 200 },
    ));
    const incomplete = async () => {
      for await (const payload of new VannaApiClient().streamChat(
        { message: 'hello' }, CHAT_HEADERS,
      )) {
        void payload;
      }
    };
    await expect(incomplete()).rejects.toThrow('before [DONE]');
  });

  it('rejects reserved custom headers and mismatched response correlation', async () => {
    for (const name of [
      'cOnTeNt-TyPe',
      'ACCEPT',
      'x-request-id',
      'X-TrAcE-Id',
      'x-USER-id',
    ]) {
      expect(() => new VannaApiClient({
        customHeaders: { [name]: 'override' },
      })).toThrow('managed by the Vanna protocol');
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('data: [DONE]\n\n', {
      status: 200,
      headers: {
        'X-Request-Id': 'another-request',
        'X-Trace-Id': 't1',
      },
    }));
    const consume = async () => {
      for await (const payload of new VannaApiClient().streamChat(
        { message: 'hello' }, CHAT_HEADERS,
      )) {
        void payload;
      }
    };
    await expect(consume()).rejects.toThrow('mismatched request correlation');
  });

  it('downloads only relative files with the numeric user header', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('xlsx', { status: 200 }),
    );
    const client = new VannaApiClient();

    await expect(client.downloadLocalFile(
      '/api/vanna/v3/files/1',
      '18446744073709551615',
    ))
      .resolves.toBeInstanceOf(Blob);
    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.get('X-User-Id')).toBe('18446744073709551615');
    expect(headers.get('X-Request-Id')).toBeNull();
    await expect(client.downloadLocalFile('https://oss.example.test/file', '123'))
      .rejects.toThrow('local file request is invalid');
    await expect(client.downloadLocalFile('//oss.example.test/file', '123'))
      .rejects.toThrow('local file request is invalid');
    await expect(client.downloadLocalFile('data:text/plain,secret', '123'))
      .rejects.toThrow('local file request is invalid');
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
