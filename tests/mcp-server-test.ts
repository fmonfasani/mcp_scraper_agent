import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createScrapingMCPServer } from '../scraping-mcp-agent/src/mcp/mcp-server.js';

/**
 * Basic tests for the Scraping MCP Server
 */

describe('ScrapingMCPServer', () => {
  let server: any;

  beforeAll(async () => {
    server = createScrapingMCPServer({
      enableLogging: false,
      enableMetrics: false,
      enableRateLimit: false,
    });
    if (server.start) {
      await server.start();
    }
  });

  afterAll(async () => {
    if (server) {
      await server['server']?.close?.();
      await server['toolsHandler']?.dispose?.();
    }
  });

  test('system_status tool responds with health information', async () => {
    const toolsHandler = server['toolsHandler'];
    const response = await toolsHandler.systemStatus({
      component: 'all',
      includeMetrics: false,
      includeHealth: true,
    });

    expect(response.success).toBe(true);
    expect(response.metadata.toolName).toBe('system_status');
    expect(response.data).toHaveProperty('uptime');
    expect(response.data).toHaveProperty('timestamp');
  });
});
