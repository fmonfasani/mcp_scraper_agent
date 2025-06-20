/**
 * Core Scraper Tests
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { CheerioScraper, PlaywrightScraper, scraperFactory } from '../scraping-mcp-agent/src/index.js';

describe('CheerioScraper', () => {
  let scraper: CheerioScraper;

  beforeEach(() => {
    scraper = new CheerioScraper();
  });

  afterEach(async () => {
    await scraper.dispose();
  });

  test('should scrape basic HTML successfully', async () => {
    const result = await scraper.scrape({
      url: 'https://httpbin.org/html',
      selectors: {
        title: 'title',
        heading: 'h1'
      },
      options: {
        timeout: 10000
      }
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('title');
    expect(result.metadata.responseTime).toBeGreaterThan(0);
  });

  test('should handle invalid URLs gracefully', async () => {
    const result = await scraper.scrape({
      url: 'https://invalid-url-that-does-not-exist.com',
      selectors: {
        title: 'title'
      }
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should respect timeout settings', async () => {
    const startTime = Date.now();
    
    const result = await scraper.scrape({
      url: 'https://httpbin.org/delay/5',
      selectors: { data: 'body' },
      options: {
        timeout: 2000 // 2 second timeout
      }
    });

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(4000); // Should timeout before 4 seconds
    expect(result.success).toBe(false);
  });

  test('should extract multiple selectors correctly', async () => {
    const result = await scraper.scrape({
      url: 'https://httpbin.org/html',
      selectors: {
        title: 'title',
        paragraphs: 'p',
        links: 'a'
      }
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('title');
    expect(result.data).toHaveProperty('paragraphs');
    expect(result.data).toHaveProperty('links');
  });
});

describe('PlaywrightScraper', () => {
  let scraper: PlaywrightScraper;

  beforeEach(async () => {
    scraper = new PlaywrightScraper({
      browserType: 'chromium',
      headless: true,
      enableStealth: false, // Disable for faster tests
      enableRateLimiting: false
    });
    await scraper.initialize();
  });

  afterEach(async () => {
    await scraper.dispose();
  });

  test('should scrape dynamic content', async () => {
    const result = await scraper.scrape({
      url: 'https://httpbin.org/html',
      selectors: {
        title: 'title',
        content: 'body'
      },
      options: {
        waitFor: 'load',
        timeout: 15000
      }
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('title');
    expect(result.metadata.responseTime).toBeGreaterThan(0);
  });

  test('should handle JavaScript-heavy pages', async () => {
    const result = await scraper.scrape({
      url: 'https://httpbin.org/json',
      selectors: {
        content: 'body'
      },
      options: {
        waitFor: 'networkidle',
        timeout: 20000
      }
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('content');
  }, 30000); // Longer timeout for this test

  test('should apply stealth mode correctly', async () => {
    // Create a new scraper with stealth enabled
    const stealthScraper = new PlaywrightScraper({
      browserType: 'chromium',
      headless: true,
      enableStealth: true,
      enableRateLimiting: false
    });

    await stealthScraper.initialize();

    try {
      const result = await stealthScraper.scrape({
        url: 'https://httpbin.org/user-agent',
        selectors: {
          userAgent: 'body'
        },
        options: {
          stealth: true
        }
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('userAgent');
    } finally {
      await stealthScraper.dispose();
    }
  });
});

describe('ScraperFactory', () => {
  test('should create Cheerio scraper for static content', async () => {
    const scraper = await scraperFactory.createScraper('cheerio');
    expect(scraper).toBeInstanceOf(CheerioScraper);
    await scraper.dispose();
  });

  test('should create Playwright scraper when requested', async () => {
    const scraper = await scraperFactory.createScraper('playwright');
    expect(scraper).toBeInstanceOf(PlaywrightScraper);
    await scraper.dispose();
  });

  test('should auto-select appropriate scraper', async () => {
    // Test with a simple static URL
    const scraper1 = await scraperFactory.createScraper('auto', {
      url: 'https://httpbin.org/html'
    });
    
    // Should work regardless of which scraper is selected
    const result = await scraper1.scrape({
      url: 'https://httpbin.org/html',
      selectors: { title: 'title' }
    });

    expect(result.success).toBe(true);
    await scraper1.dispose();
  });

  test('should handle batch scraping', async () => {
    const scraper = await scraperFactory.createScraper('cheerio');
    
    const configs = [
      {
        url: 'https://httpbin.org/json',
        selectors: { data: 'body' }
      },
      {
        url: 'https://httpbin.org/html',
        selectors: { title: 'title' }
      }
    ];

    const results = await scraper.batchScrape(configs);
    
    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
    
    await scraper.dispose();
  });
});

describe('Error Handling', () => {
  test('should handle network errors gracefully', async () => {
    const scraper = new CheerioScraper();
    
    const result = await scraper.scrape({
      url: 'https://this-domain-absolutely-does-not-exist-12345.com',
      selectors: { title: 'title' }
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe('string');
    
    await scraper.dispose();
  });

  test('should handle invalid selectors', async () => {
    const scraper = new CheerioScraper();
    
    const result = await scraper.scrape({
      url: 'https://httpbin.org/html',
      selectors: {
        nonexistent: '.this-class-does-not-exist'
      }
    });

    expect(result.success).toBe(true); // Should succeed but with empty data
    expect(result.data.nonexistent).toBeUndefined();
    
    await scraper.dispose();
  });
});

describe('Performance', () => {
  test('should complete requests within reasonable time', async () => {
    const scraper = new CheerioScraper();
    const startTime = Date.now();
    
    const result = await scraper.scrape({
      url: 'https://httpbin.org/json',
      selectors: { data: 'body' },
      options: { timeout: 10000 }
    });

    const duration = Date.now() - startTime;
    
    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    expect(result.metadata.responseTime).toBeLessThan(5000);
    
    await scraper.dispose();
  });

  test('should handle multiple concurrent requests', async () => {
    const scraper = new CheerioScraper();
    
    const promises = Array.from({ length: 3 }, () =>
      scraper.scrape({
        url: 'https://httpbin.org/json',
        selectors: { data: 'body' }
      })
    );

    const results = await Promise.all(promises);
    
    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result.success).toBe(true);
    });
    
    await scraper.dispose();
  });
});

describe('Data Extraction', () => {
  test('should extract text content correctly', async () => {
    const scraper = new CheerioScraper();
    
    const result = await scraper.scrape({
      url: 'https://httpbin.org/html',
      selectors: {
        title: 'title',
        headings: 'h1'
      }
    });

    expect(result.success).toBe(true);
    expect(typeof result.data.title).toBe('string');
    expect(result.data.title.length).toBeGreaterThan(0);
    
    await scraper.dispose();
  });

  test('should extract attributes correctly', async () => {
    const scraper = new CheerioScraper();
    
    const result = await scraper.scrape({
      url: 'https://httpbin.org/html',
      selectors: {
        links: 'a'
      },
      options: {
        extractLinks: true
      }
    });

    expect(result.success).toBe(true);
    
    await scraper.dispose();
  });
});

describe('Configuration', () => {
  test('should respect custom timeout settings', async () => {
    const scraper = new CheerioScraper({
      timeout: 5000,
      maxRedirects: 3,
      retryAttempts: 1
    });

    const result = await scraper.scrape({
      url: 'https://httpbin.org/json',
      selectors: { data: 'body' }
    });

    expect(result.success).toBe(true);
    
    await scraper.dispose();
  });

  test('should handle custom headers', async () => {
    const scraper = new CheerioScraper();
    
    const result = await scraper.scrape({
      url: 'https://httpbin.org/headers',
      selectors: { headers: 'body' }
    });

    expect(result.success).toBe(true);
    
    await scraper.dispose();
  });
});