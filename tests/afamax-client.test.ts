import { describe, expect, it, vi } from 'vitest';
import { AfamaxClient } from '../src/providers/afamax/afamax.client.js';
import { AppraisalProviderError } from '../src/providers/appraisal-provider.js';
import { validInput, validOutput } from './fixtures.js';

describe('AfamaxClient', () => {
  it('forwards the service identity and validated client address', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('x-afamax-service-token')).toBe('x'.repeat(32));
      expect(headers.get('x-afamax-client-ip')).toBe('203.0.113.10');
      return Response.json(validOutput);
    });
    const client = new AfamaxClient({
      apiUrl: new URL('https://afamax.de/api/v1/afa-calculation'),
      timeoutMs: 1000,
      serviceToken: 'x'.repeat(32),
      fetch: fetchMock,
    });

    await expect(client.calculate(validInput, { clientIp: '203.0.113.10' })).resolves.toEqual(validOutput);
  });

  it('does not send trusted headers in stdio/direct mode', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.has('x-afamax-service-token')).toBe(false);
      expect(headers.has('x-afamax-client-ip')).toBe(false);
      return Response.json(validOutput);
    });
    const client = new AfamaxClient({
      apiUrl: new URL('https://afamax.de/api/v1/afa-calculation'),
      timeoutMs: 1000,
      fetch: fetchMock,
    });

    await client.calculate(validInput);
  });

  it('maps rate limits without leaking an upstream body', async () => {
    const client = new AfamaxClient({
      apiUrl: new URL('https://afamax.de/api/v1/afa-calculation'),
      timeoutMs: 1000,
      fetch: async () => Response.json(
        { errorCode: 'RATE_LIMITED', errorMessage: 'private diagnostics' },
        { status: 429, headers: { 'retry-after': '42' } },
      ),
    });

    try {
      await client.calculate(validInput);
      expect.fail('Expected the request to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(AppraisalProviderError);
      expect(error).toMatchObject({ code: 'rate_limited', retryAfterSeconds: 42 });
      expect((error as Error).message).not.toContain('private diagnostics');
    }
  });

  it('rejects an invalid upstream success response', async () => {
    const client = new AfamaxClient({
      apiUrl: new URL('https://afamax.de/api/v1/afa-calculation'),
      timeoutMs: 1000,
      fetch: async () => Response.json({ calculationId: 'incomplete' }),
    });

    await expect(client.calculate(validInput)).rejects.toMatchObject({ code: 'invalid_response' });
  });
});
