# 🎯 Best Practices - Scraping MCP Agent

## 📋 Table of Contents
- [General Scraping Guidelines](#general-scraping-guidelines)
- [Performance Optimization](#performance-optimization)
- [Anti-Detection Strategies](#anti-detection-strategies)
- [Error Handling](#error-handling)
- [Code Organization](#code-organization)
- [Testing Strategies](#testing-strategies)
- [Deployment & Production](#deployment--production)
- [Legal & Ethical Considerations](#legal--ethical-considerations)

---

## 🌐 General Scraping Guidelines

### ✅ DO's

**Respect robots.txt**
```typescript
// Always check robots.txt before scraping
const robotsChecker = new RobotsChecker();
const canScrape = await robotsChecker.isAllowed(url, userAgent);
if (!canScrape) {
  throw new Error('Scraping not allowed by robots.txt');
}
```

**Use appropriate selectors**
```typescript
// Prefer semantic selectors over positioning
const goodSelectors = {
  title: 'h1[data-testid="product-title"]',    // ✅ Semantic
  price: '[data-cy="price"]',                   // ✅ Test attributes
  description: '.product-description'           // ✅ Semantic class
};

// Avoid fragile selectors
const badSelectors = {
  title: 'div:nth-child(3) > span:first-child', // ❌ Position-based
  price: '#content > div > div > div > span',   // ❌ Deep nesting
  description: 'p'                              // ❌ Too generic
};
```

**Handle dynamic content properly**
```typescript
// Wait for dynamic content to load
await scraper.scrape({
  url: 'https://spa-website.com',
  selectors: { data: '.dynamic-content' },
  options: {
    waitFor: '.loading-spinner', // Wait for spinner to disappear
    waitUntil: 'networkidle',    // Wait for network to be idle
    timeout: 15000               // Reasonable timeout
  }
});
```

### ❌ DON'Ts

**Don't overwhelm servers**
```typescript
// ❌ Bad: No rate limiting
for (const url of urls) {
  await scraper.scrape({ url, selectors });
}

// ✅ Good: Proper rate limiting
const rateLimiter = new RateLimiter({ requestsPerSecond: 2 });
for (const url of urls) {
  await rateLimiter.acquire();
  await scraper.scrape({ url, selectors });
}
```

**Don't ignore error handling**
```typescript
// ❌ Bad: No error handling
const result = await scraper.scrape(config);
return result.data; // Could throw if result is null

// ✅ Good: Proper error handling
try {
  const result = await scraper.scrape(config);
  if (!result.success) {
    logger.warn(`Scraping failed: ${result.error}`);
    return fallbackData;
  }
  return result.data;
} catch (error) {
  logger.error('Scraping error:', error);
  throw new ScrapingError('Failed to scrape data', { cause: error });
}
```

---

## ⚡ Performance Optimization

### Concurrent Processing
```typescript
// Process multiple URLs concurrently with limits
async function scrapeConcurrently(urls: string[], concurrency = 3) {
  const chunks = chunkArray(urls, concurrency);
  const results = [];

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(url => scrapeWithRetry(url))
    );
    results.push(...chunkResults);
    
    // Brief pause between chunks
    await delay(1000);
  }

  return results;
}
```

### Browser Reuse
```typescript
// ✅ Good: Reuse browser instance
class OptimizedScraper {
  private browser?: Browser;

  async scrape(config: ScrapeConfig) {
    if (!this.browser) {
      this.browser = await playwright.chromium.launch();
    }
    
    const context = await this.browser.newContext();
    const page = await context.newPage();
    
    try {
      // Scraping logic
      return await this.performScrape(page, config);
    } finally {
      await context.close(); // Close context, keep browser
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}
```

### Resource Management
```typescript
// Optimize resource usage
const browserOptions = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-extensions',
    '--disable-images', // Skip images if not needed
    '--disable-javascript' // For static content only
  ]
};
```

### Caching Strategy
```typescript
// Implement intelligent caching
class CachingScraper {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async scrape(config: ScrapeConfig) {
    const cacheKey = this.getCacheKey(config);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return { success: true, data: cached.data, cached: true };
    }

    const result = await this.performScrape(config);
    
    if (result.success) {
      this.cache.set(cacheKey, {
        data: result.data,
        timestamp: Date.now()
      });
    }

    return result;
  }
}
```

---

## 🕵️ Anti-Detection Strategies

### User Agent Rotation
```typescript
// Rotate user agents realistically
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',