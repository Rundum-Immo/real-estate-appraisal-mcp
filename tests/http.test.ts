import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env.js';
import { getClientIp } from '../src/transports/http.js';

describe('HTTP configuration', () => {
  it('requires the service token only for hosted HTTP', () => {
    expect(() => loadConfig('http', {})).toThrow(/AFAMAX_SERVICE_TOKEN/);
    expect(loadConfig('stdio', {}).afamaxServiceToken).toBeUndefined();
  });

  it('uses the rightmost valid forwarded address', () => {
    const request = new Request('https://mcp.rundum.immo/mcp', {
      headers: { 'x-forwarded-for': '198.51.100.20, 203.0.113.30' },
    });
    expect(getClientIp(request)).toBe('203.0.113.30');
  });

  it('rejects non-IP forwarding values', () => {
    const request = new Request('https://mcp.rundum.immo/mcp', { headers: { 'x-real-ip': 'attacker.invalid' } });
    expect(getClientIp(request)).toBeUndefined();
  });
});
