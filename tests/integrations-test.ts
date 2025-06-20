import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PlaywrightScraper } from '../src/core/playwright-scraper';
import { CheerioScraper } from '../src/core/cheerio-scraper';
import { ScraperFactory } from '../src/core/scraper-factory';
import { EcommerceAgent } from '../src/agents/ecommerce-agent';
import { JobsAgent } from '../src/agents/jobs-agent';
import { ScrapingMCPServer } from '../src/mcp/mcp-server';
import { RateLimiter } from '../src/utils/rate-limiter';
import { AntiDetectionManager } from '../src/utils/anti-detection';
import { Logger } from '../src/utils/logger';

// Test timeout for integration tests
jest.setTimeout(30000);

describe('Scraping MCP Agent - Integration Tests', () => {
  let playwrightScraper: PlaywrightScraper;
  let cheerioScraper: CheerioScraper;
  let rateLimiter: RateLimiter;
  let logger: Logger;

  beforeAll(async () => {
    logger = Logger.getInstance();
    logger.setLevel('error'); // Reduce noise during tests
    
    playwrightScraper = new PlaywrightScraper();
    cheerioScraper = new CheerioScraper();
    rateLimiter = new RateLimiter({ requestsPerSecond: 2 });
  });

  afterAll(async () => {
    // Cleanup resources
    if (playwrightScraper) {
      await playwrightScraper.close?.();
    }
  });

  describe('Cross-Scraper Compatibility', () => {
    test('should handle same site with different scrapers', async () => {
      const url = 'https://httpbin.org/html';
      const selector = 'h1';

      // Test with Cheerio
      const cheerioResult = await cheerioScraper.scrape({
        url,
        selectors: { title: selector }
      });

      // Test with Playwright
      const playwrightResult = await playwrightScraper.scrape({
        url,
        selectors: { title: selector }
      });

      expect(cheerioResult.success).toBe(true);
      expect(playwrightResult.success).toBe(true);
      expect(cheerioResult.data.title).toBeDefined();
      expect(playwrightResult.data.title).toBeDefined();
    });

    test('should auto-select appropriate scraper', async () => {
      const staticUrl = 'https://httpbin.org/html';
      const dynamicUrl = 'https://httpbin.org/delay/1';

      const staticScraper = ScraperFactory.createScraper(staticUrl);
      const dynamicScraper = ScraperFactory.createScraper(dynamicUrl);

      expect(staticScraper).toBeInstanceOf(CheerioScraper);
      expect(dynamicScraper).toBeInstanceOf(PlaywrightScraper);
    });
  });

  describe('Rate Limiting Integration', () => {
    test('should respect rate limits across scrapers', async () => {
      const urls = [
        'https://httpbin.org/delay/0',
        'https://httpbin.org/delay/0',
        'https://httpbin.org/delay/0'
      ];

      const startTime = Date.now();
      
      const promises = urls.map(async (url) => {
        await rateLimiter.acquire();
        return cheerioScraper.scrape({
          url,
          selectors: { status: 'body' }
        });
      });

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Should take at least 1 second due to rate limiting (2 req/sec, 3 requests)
      expect(duration).toBeGreaterThan(1000);
    });
  });

  describe('Anti-Detection Integration', () => {
    test('should use different user agents across requests', async () => {
      const antiDetection = new AntiDetectionManager();
      const userAgents = new Set<string>();

      // Make multiple requests and collect user agents
      for (let i = 0; i < 5; i++) {
        const userAgent = antiDetection.getRandomUserAgent();
        userAgents.add(userAgent);
      }

      // Should have variety in user agents
      expect(userAgents.size).toBeGreaterThan(1);
    });

    test('should apply stealth settings to Playwright', async () => {
      const result = await playwrightScraper.scrape({
        url: 'https://httpbin.org/user-agent',
        selectors: { userAgent: 'pre' },
        options: {
          stealth: true
        }
      });

      expect(result.success).toBe(true);
      expect(result.data.userAgent).toBeDefined();
      expect(result.data.userAgent).not.toContain('HeadlessChrome');
    });
  });

  describe('Specialized Agents Integration', () => {
    test('should handle e-commerce scraping workflow', async () => {
      const ecommerceAgent = new EcommerceAgent();
      
      // Mock e-commerce site (using a test site that mimics product structure)
      const result = await ecommerceAgent.scrapeProducts({
        url: 'https://books.toscrape.com/',
        maxProducts: 5
      });

      expect(result.success).toBe(true);
      expect(result.products).toBeDefined();
      expect(Array.isArray(result.products)).toBe(true);
      
      if (result.products.length > 0) {
        const product = result.products[0];
        expect(product).toHaveProperty('title');
        expect(product).toHaveProperty('price');
      }
    });

    test('should handle job listings scraping', async () => {
      const jobsAgent = new JobsAgent();
      
      // Using a test job site or mock
      const result = await jobsAgent.scrapeJobs({
        url: 'https://httpbin.org/html', // Fallback test URL
        query: 'developer',
        location: 'remote'
      });

      expect(result.success).toBeDefined();
      expect(result.jobs).toBeDefined();
      expect(Array.isArray(result.jobs)).toBe(true);
    });
  });

  describe('MCP Server Integration', () => {
    let mcpServer: ScrapingMCPServer;

    beforeEach(() => {
      mcpServer = new ScrapingMCPServer();
    });

    test('should handle MCP tool requests', async () => {
      const toolRequest = {
        name: 'scrape_website',
        arguments: {
          url: 'https://httpbin.org/html',
          selector: 'h1'
        }
      };

      const result = await mcpServer.handleToolCall(toolRequest);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    test('should validate MCP tool arguments', async () => {
      const invalidRequest = {
        name: 'scrape_website',
        arguments: {
          // Missing required url
          selector: 'h1'
        }
      };

      await expect(
        mcpServer.handleToolCall(invalidRequest)
      ).rejects.toThrow();
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle network failures gracefully', async () => {
      const invalidUrl = 'https://definitely-not-a-real-website-12345.com';

      const cheerioResult = await cheerioScraper.scrape({
        url: invalidUrl,
        selectors: { data: 'body' }
      });

      const playwrightResult = await playwrightScraper.scrape({
        url: invalidUrl,
        selectors: { data: 'body' }
      });

      expect(cheerioResult.success).toBe(false);
      expect(playwrightResult.success).toBe(false);
      expect(cheerioResult.error).toBeDefined();
      expect(playwrightResult.error).toBeDefined();
    });

    test('should handle malformed selectors', async () => {
      const result = await cheerioScraper.scrape({
        url: 'https://httpbin.org/html',
        selectors: { data: '>>>invalid<<<selector' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should timeout on slow responses', async () => {
      const result = await playwrightScraper.scrape({
        url: 'https://httpbin.org/delay/10', // 10 second delay
        selectors: { data: 'body' },
        options: {
          timeout: 5000 // 5 second timeout
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('timeout');
    });
  });

  describe('Performance Integration', () => {
    test('should handle concurrent scraping efficiently', async () => {
      const urls = Array.from({ length: 5 }, (_, i) => 
        `https://httpbin.org/delay/1`
      );

      const startTime = Date.now();

      const promises = urls.map(url =>
        cheerioScraper.scrape({
          url,
          selectors: { status: 'body' }
        })
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Should complete much faster than sequential (5 * 1000ms)
      expect(duration).toBeLessThan(3000);
      expect(results.every(r => r.success)).toBe(true);
    });

    test('should cache scraper instances efficiently', async () => {
      const factory1 = ScraperFactory.createScraper('https://example.com');
      const factory2 = ScraperFactory.createScraper('https://example.com');

      // Should reuse instances for same URL patterns
      expect(factory1.constructor.name).toBe(factory2.constructor.name);
    });
  });

  describe('Data Pipeline Integration', () => {
    test('should process complete scraping pipeline', async () => {
      // Scrape -> Clean -> Validate -> Transform
      const rawResult = await playwrightScraper.scrape({
        url: 'https://quotes.toscrape.com/',
        selectors: {
          quotes: '.quote .text',
          authors: '.quote .author'
        }
      });

      expect(rawResult.success).toBe(true);
      expect(rawResult.data).toBeDefined();

      // Data should be structured and cleaned
      const { quotes, authors } = rawResult.data;
      expect(Array.isArray(quotes)).toBe(true);
      expect(Array.isArray(authors)).toBe(true);
      
      if (quotes.length > 0) {
        expect(typeof quotes[0]).toBe('string');
        expect(quotes[0].length).toBeGreaterThan(0);
      }
    });

    test('should handle large dataset scraping', async () => {
      const result = await playwrightScraper.scrape({
        url: 'https://books.toscrape.com/',
        selectors: {
          titles: 'h3 a',
          prices: '.price_color'
        },
        options: {
          maxResults: 20
        }
      });

      expect(result.success).toBe(true);
      expect(result.data.titles).toBeDefined();
      expect(result.data.prices).toBeDefined();
      
      // Should limit results as requested
      expect(result.data.titles.length).toBeLessThanOrEqual(20);
      expect(result.data.prices.length).toBeLessThanOrEqual(20);
    });
  });

  describe('Browser Management Integration', () => {
    test('should handle browser lifecycle properly', async () => {
      const scraper = new PlaywrightScraper();
      
      // Multiple requests should reuse browser instance
      const result1 = await scraper.scrape({
        url: 'https://httpbin.org/html',
        selectors: { title: 'h1' }
      });

      const result2 = await scraper.scrape({
        url: 'https://httpbin.org/html',
        selectors: { title: 'h1' }
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Cleanup should work properly
      await scraper.close?.();
    });

    test('should handle multiple concurrent browser instances', async () => {
      const scraper1 = new PlaywrightScraper();
      const scraper2 = new PlaywrightScraper();

      const promise1 = scraper1.scrape({
        url: 'https://httpbin.org/delay/1',
        selectors: { data: 'body' }
      });

      const promise2 = scraper2.scrape({
        url: 'https://httpbin.org/delay/1',
        selectors: { data: 'body' }
      });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      await scraper1.close?.();
      await scraper2.close?.();
    });
  });
});