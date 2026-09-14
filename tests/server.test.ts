import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { describe, expect, it, vi } from 'vitest';
import { createLogger } from '../src/observability/logger.js';
import { createServer } from '../src/server.js';
import { validInput, validOutput } from './fixtures.js';

describe('MCP server', () => {
  it('advertises and calls calculate_property_depreciation', async () => {
    const provider = { calculatePropertyDepreciation: vi.fn(async () => validOutput) };
    const server = createServer({ provider, logger: createLogger('error') });
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    const listed = await client.listTools();
    expect(listed.tools.map((tool) => tool.name)).toEqual(['calculate_property_depreciation']);

    const result = await client.callTool({ name: 'calculate_property_depreciation', arguments: validInput });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual(validOutput);
    expect(result.content[0]).toMatchObject({ type: 'text', text: expect.stringContaining('3.33%') });
    expect(provider.calculatePropertyDepreciation).toHaveBeenCalledOnce();

    await client.close();
    await server.close();
  });
});
