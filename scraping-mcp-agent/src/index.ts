#!/usr/bin/env node

/**
 * Main entry point for the Scraping MCP Agent
 */

import { createScrapingMCPServer } from './mcp/mcp-server.js';
import logger from './utils/logger.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Get version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
let version = '1.0.0';

try {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  version = packageJson.version;
} catch (error) {
  logger.warn('Could not read version from package.json', { error: (error as Error).message });
}

// Configuration from environment variables
const config = {
  name: process.env.MCP_SERVER_NAME || 'scraping-mcp-agent',
  version,
  description: process.env.MCP_SERVER_DESCRIPTION || 'Advanced web scraping MCP agent with specialized tools',
  maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '10'),
  timeout: parseInt(process.env.TOOL_TIMEOUT || '300000'), // 5 minutes
  enableLogging: process.env.ENABLE_LOGGING !== 'false',
  enableMetrics: process.env.ENABLE_METRICS !== 'false',
  enableRateLimit: process.env.ENABLE_RATE_LIMIT !== 'false',
  rateLimitConfig: {
    maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '30'),
    maxRequestsPerHour: parseInt(process.env.MAX_REQUESTS_PER_HOUR || '500')
  }
};

async function main() {
  try {
    // Log startup information
    logger.info('Starting Scraping MCP Agent', {
      version: config.version,
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      env: process.env.NODE_ENV || 'production',
      config: {
        ...config,
        // Don't log sensitive information
        rateLimitConfig: config.rateLimitConfig
      }
    });

    // Create and start the MCP server
    const server = createScrapingMCPServer(config);
    
    // Start the server
    await server.start();
    
    // The server will run indefinitely, handling MCP requests
    // It will be terminated by SIGINT/SIGTERM or process exit
    
  } catch (error) {
    logger.error('Failed to start Scraping MCP Agent', error as Error);
    process.exit(1);
  }
}

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', reason as Error, { promise });
  process.exit(1);
});

// Start the application
main().catch((error) => {
  logger.error('Application startup failed', error);
  process.exit(1);
});

// Export for programmatic use
export { createScrapingMCPServer };
export type { MCPServerConfig } from './mcp/mcp-server.js';

// Export main components for library use
export { ScrapingMCPServer } from './mcp/mcp-server.js';
export { ToolsHandler } from './mcp/tools-handler.js';

// Export scrapers
export { PlaywrightScraper } from './core/playwright-scraper.js';
export { CheerioScraper } from './core/cheerio-scraper.js';
export { ScraperFactory, scraperFactory } from './core/scraper-factory.js';

// Export agents
export { EcommerceAgent } from './agents/ecommerce-agent.js';
export { JobsAgent } from './agents/jobs-agent.js';
export { NewsAgent } from './agents/news-agent.js';
export { LeadsAgent } from './agents/leads-agent.js';

// Export utilities
export { AntiDetectionManager } from './utils/anti-detection.js';
export { RateLimiter } from './utils/rate-limiter.js';
export { DataCleaner } from './utils/data-cleaner.js';
export { logger } from './utils/logger.js';

// Export types
export type * from './types/scraping-types.js';
export type * from './types/mcp-types.js';

// Export schemas
export * from './mcp/schemas.js';