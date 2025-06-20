# 📚 API Reference

Complete API documentation for the Scraping MCP Agent.

## 🛠️ MCP Tools

### Basic Scraping Tools

#### `scrape_url`

Scrape a single URL with custom selectors and options.

**Parameters:**
```typescript
{
  url: string;                    // Required: Target URL
  selectors?: {                   // Optional: CSS selectors
    [key: string]: string;
  };
  options?: {                     // Optional: Scraping options
    headless?: boolean;           // Default: true
    timeout?: number;             // Default: 30000ms
    waitFor?: 'load' | 'domcontentloaded' | 'networkidle'; // Default: 'load'
    useRandomUserAgent?: boolean; // Default: true
    stealth?: boolean;           // Default: true
    extractImages?: boolean;      // Default: false
    extractLinks?: boolean;       // Default: false
    cleanData?: boolean;         // Default: true
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: any;                     // Scraped data
  metadata: {
    toolName: string;
    executionTime: number;        // ms
    timestamp: string;
    version: string;
  };
  error?: string;
}
```

**Example:**
```json
{
  "name": "scrape_url",
  "arguments": {
    "url": "https://example.com",
    "selectors": {
      "title": "h1",
      "price": ".price",
      "description": ".description"
    },
    "options": {
      "timeout": 30000,
      "stealth": true,
      "cleanData": true
    }
  }
}
```

#### `batch_scrape`

Scrape multiple URLs efficiently with rate limiting.

**Parameters:**
```typescript
{
  urls: string[];                 // Required: Array of URLs (max 50)
  selectors?: {                   // Optional: CSS selectors
    [key: string]: string;
  };
  options?: {                     // Optional: Batch options
    maxConcurrent?: number;       // Default: 2, max: 5
    delayBetweenRequests?: number; // Default: 1000ms
    timeout?: number;             // Default: 30000ms
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  results: Array<{
    url: string;
    success: boolean;
    data?: any;
    error?: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalTime: number;
    averageResponseTime: number;
  };
}
```

### Specialized Scraping Tools

#### `scrape_ecommerce`

Specialized tool for e-commerce product scraping.

**Parameters:**
```typescript
{
  url: string;                    // Required: Product URL
  extractReviews?: boolean;       // Default: false
  extractVariants?: boolean;      // Default: false
  extractRelated?: boolean;       // Default: false
  maxReviews?: number;           // Default: 50, max: 200
  maxVariants?: number;          // Default: 20, max: 50
  maxRelatedProducts?: number;   // Default: 10, max: 50
  options?: ScrapingOptions;     // Optional: Scraping options
}
```

**Response:**
```typescript
{
  success: boolean;
  product?: {
    name: string;
    price: number;
    currency: string;
    originalPrice?: number;
    discount?: number;
    availability: 'in-stock' | 'out-of-stock' | 'limited';
    rating?: number;
    reviewCount?: number;
    description?: string;
    images: string[];
    brand?: string;
    category?: string;
    sku?: string;
    url: string;
  };
  reviews?: Array<{
    rating: number;
    text: string;
    author?: string;
    date?: string;
    verified?: boolean;
  }>;
  variants?: Array<{
    name: string;
    price: number;
    availability: string;
    sku?: string;
  }>;
  relatedProducts?: Array<{
    name: string;
    price: number;
    url: string;
  }>;
  error?: string;
}
```

#### `scrape_jobs`

Specialized tool for job listing scraping.

**Parameters:**
```typescript
{
  url: string;                    // Required: Job board URL
  extractDescription?: boolean;   // Default: true
  extractRequirements?: boolean;  // Default: true
  extractBenefits?: boolean;      // Default: false
  extractCompanyInfo?: boolean;   // Default: false
  followPagination?: boolean;     // Default: true
  maxPages?: number;             // Default: 5, max: 20
  maxJobsPerPage?: number;       // Default: 50, max: 100
  filters?: {                    // Optional: Job filters
    location?: string;
    jobType?: 'full-time' | 'part-time' | 'contract' | 'internship';
    remote?: boolean;
    salaryMin?: number;
    salaryMax?: number;
    keywords?: string[];
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  jobs: Array<{
    title: string;
    company: string;
    location: string;
    salary?: {
      min?: number;
      max?: number;
      currency: string;
      period: 'hour' | 'day' | 'month' | 'year';
    };
    description: string;
    requirements: string[];
    benefits?: string[];
    jobType: 'full-time' | 'part-time' | 'contract' | 'internship';
    remote: boolean;
    postedDate: Date;
    url: string;
  }>;
  pagination?: {
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
  };
  error?: string;
}
```

#### `scrape_news`

Specialized tool for news article scraping.

**Parameters:**
```typescript
{
  url: string;                    // Required: News site URL
  extractContent?: boolean;       // Default: true
  extractAuthor?: boolean;        // Default: true
  extractTags?: boolean;          // Default: true
  extractComments?: boolean;      // Default: false
  maxArticlesPerPage?: number;    // Default: 20, max: 100
  dateRange?: {                   // Optional: Date filtering
    from?: string;                // ISO date string
    to?: string;                  // ISO date string
  };
  categories?: string[];          // Optional: Category filter
  contentMinLength?: number;      // Default: 100 characters
}
```

**Response:**
```typescript
{
  success: boolean;
  articles: Array<{
    title: string;
    author?: string;
    publishedDate: Date;
    content: string;
    summary?: string;
    category?: string;
    tags: string[];
    url: string;
    imageUrl?: string;
    source: string;
  }>;
  searchMetadata?: {
    category?: string;
    resultsCount: number;
    source: string;
  };
  error?: string;
}
```

#### `scrape_leads`

Specialized tool for lead generation and contact extraction.

**Parameters:**
```typescript
{
  url: string;                    // Required: Directory/listing URL
  extractEmails?: boolean;        // Default: true
  extractPhones?: boolean;        // Default: false
  extractSocialMedia?: boolean;   // Default: true
  validateContacts?: boolean;     // Default: false
  maxLeadsPerPage?: number;       // Default: 50, max: 200
  criteria?: {                    // Optional: Lead criteria
    industry?: string;
    location?: string;
    companySize?: 'startup' | 'small' | 'medium' | 'large';
    jobTitles?: string[];
    keywords?: string[];
  };
  contactTypes?: Array<'email' | 'phone' | 'linkedin' | 'website'>;
}
```

**Response:**
```typescript
{
  success: boolean;
  leads: Array<{
    name: string;
    title?: string;
    company: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    industry?: string;
    linkedinUrl?: string;
    socialMedia?: Record<string, string>;
  }>;
  qualityMetrics?: {
    averageScore: number;
    emailsFound: number;
    phonesFound: number;
    linkedinProfilesFound: number;
    verifiedContacts: number;
  };
  error?: string;
}
```

### Advanced Tools

#### `monitor_url`

Monitor a URL for changes with alerting.

**Parameters:**
```typescript
{
  url: string;                    // Required: URL to monitor
  interval: number;               // Required: Check interval (60-86400 seconds)
  selectors?: {                   // Optional: Specific selectors to monitor
    [key: string]: string;
  };
  alertThreshold?: number;        // Default: 10% change threshold
  webhook?: string;               // Optional: Webhook URL for alerts
  emailAlert?: string;            // Optional: Email for alerts
  options?: {
    compareMode?: 'content' | 'structure' | 'specific-elements';
    ignoreWhitespace?: boolean;   // Default: true
    maxHistory?: number;          // Default: 10
  };
}
```

#### `competitor_analysis`

Analyze and compare multiple competitor websites.

**Parameters:**
```typescript
{
  urls: string[];                 // Required: Competitor URLs (max 10)
  analysisType?: 'pricing' | 'features' | 'content' | 'seo'; // Default: 'pricing'
  extractPricing?: boolean;       // Default: true
  extractFeatures?: boolean;      // Default: true
  extractContent?: boolean;       // Default: false
  compareAgainst?: string;        // Optional: Base URL for comparison
}
```

#### `bulk_processing`

Process large batches of URLs asynchronously.

**Parameters:**
```typescript
{
  urls: string[];                 // Required: URLs to process (max 1000)
  processingType: 'ecommerce' | 'jobs' | 'news' | 'leads' | 'general';
  batchSize?: number;             // Default: 10, max: 50
  concurrency?: number;           // Default: 2, max: 5
  delayBetweenBatches?: number;   // Default: 5000ms
  exportFormat?: 'json' | 'csv' | 'xlsx'; // Default: 'json'
  webhook?: string;               // Optional: Progress webhook
}
```

### Management Tools

#### `job_management`

Manage scraping jobs and monitor progress.

**Parameters:**
```typescript
{
  action: 'list' | 'status' | 'cancel' | 'pause' | 'resume';
  jobId?: string;                 // Required for status/cancel/pause/resume
  filters?: {                     // Optional for list action
    status?: Array<'pending' | 'running' | 'completed' | 'failed'>;
    dateFrom?: string;            // ISO date string
    dateTo?: string;              // ISO date string
  };
}
```

#### `performance_analytics`

Get performance metrics and analytics.

**Parameters:**
```typescript
{
  timeRange?: 'hour' | 'day' | 'week' | 'month'; // Default: 'day'
  metrics?: Array<'requests' | 'success_rate' | 'response_time' | 'errors'>;
  groupBy?: 'url' | 'site_type' | 'scraper_type';
  includeDetails?: boolean;       // Default: false
}
```

#### `system_status`

Get system health and status information.

**Parameters:**
```typescript
{
  component?: 'all' | 'scrapers' | 'memory' | 'proxies'; // Default: 'all'
  includeMetrics?: boolean;       // Default: true
  includeHealth?: boolean;        // Default: true
}
```

## 📦 Programmatic API

### Core Classes

#### `PlaywrightScraper`

Advanced browser-based scraping with anti-detection.

```typescript
import { PlaywrightScraper } from 'scraping-mcp-agent';

const scraper = new PlaywrightScraper({
  browserType: 'chromium',
  headless: true,
  enableStealth: true,
  maxConcurrentTabs: 3
});

await scraper.initialize();

const result = await scraper.scrape({
  url: 'https://example.com',
  selectors: { title: 'h1' },
  options: { waitFor: 'networkidle' }
});

await scraper.dispose();
```

#### `CheerioScraper`

Fast static HTML scraping.

```typescript
import { CheerioScraper } from 'scraping-mcp-agent';

const scraper = new CheerioScraper({
  timeout: 15000,
  userAgentRotation: true,
  retryOnFailure: true
});

const result = await scraper.scrape({
  url: 'https://example.com',
  selectors: { 
    title: 'h1',
    links: 'a[href]'
  }
});

await scraper.dispose();
```

#### `ScraperFactory`

Intelligent scraper selection.

```typescript
import { scraperFactory } from 'scraping-mcp-agent';

// Auto-select best scraper
const scraper = await scraperFactory.createScraper('auto', {
  url: 'https://example.com'
});

// Or specify type
const playwrightScraper = await scraperFactory.createScraper('playwright');
const cheerioScraper = await scraperFactory.createScraper('cheerio');
```

### Specialized Agents

#### `EcommerceAgent`

```typescript
import { EcommerceAgent } from 'scraping-mcp-agent';

const agent = new EcommerceAgent();

const result = await agent.scrapeProduct('https://shop.example.com/product', {
  extractReviews: true,
  extractVariants: true,
  maxReviews: 50
});

// Batch processing
const results = await agent.scrapeMultipleProducts([
  'https://shop.example.com/product1',
  'https://shop.example.com/product2'
], { extractReviews: false });

await agent.dispose();
```

#### `JobsAgent`

```typescript
import { JobsAgent } from 'scraping-mcp-agent';

const agent = new JobsAgent();

const result = await agent.scrapeJobs('https://jobs.example.com/search', {
  extractDescription: true,
  maxJobsPerPage: 50,
  filters: {
    jobType: 'full-time',
    remote: true,
    location: 'San Francisco'
  }
});

await agent.dispose();
```

#### `NewsAgent`

```typescript
import { NewsAgent } from 'scraping-mcp-agent';

const agent = new NewsAgent();

const result = await agent.scrapeNews('https://news.example.com', {
  extractContent: true,
  extractAuthor: true,
  maxArticlesPerPage: 20,
  dateRange: {
    from: new Date('2023-01-01'),
    to: new Date('2023-12-31')
  }
});

await agent.dispose();
```

#### `LeadsAgent`

```typescript
import { LeadsAgent } from 'scraping-mcp-agent';

const agent = new LeadsAgent();

const result = await agent.scrapeLeads('https://directory.example.com', {
  extractEmails: true,
  extractPhones: false,
  validateContacts: true,
  criteria: {
    industry: 'technology',
    companySize: 'medium'
  }
});

await agent.dispose();
```

### Utility Classes

#### `RateLimiter`

```typescript
import { RateLimiter } from 'scraping-mcp-agent';

const rateLimiter = new RateLimiter({
  maxConcurrent: 3,
  delayMs: 1000,
  burstLimit: 5
});

await rateLimiter.addTask({
  id: 'task-1',
  url: 'https://example.com',
  task: async () => {
    // Your scraping logic
    return { success: true };
  }
});
```

#### `DataCleaner`

```typescript
import { DataCleaner } from 'scraping-mcp-agent';

const cleaner = new DataCleaner();

const result = await cleaner.cleanData(rawData, {
  rules: [
    { field: 'email', type: 'email', required: true },
    { field: 'phone', type: 'string', pattern: '^\\+?[1-9]\\d{10,14}$' }
  ]
});
```

#### `AntiDetectionManager`

```typescript
import { AntiDetectionManager } from 'scraping-mcp-agent';

const antiDetection = new AntiDetectionManager({
  enableUserAgentRotation: true,
  enableViewportRandomization: true,
  enableTimingRandomization: true
});

const userAgent = antiDetection.getRandomUserAgent();
const viewport = antiDetection.getRandomViewport();
```

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
NODE_ENV=production
MCP_SERVER_NAME=scraping-mcp-agent
MAX_CONCURRENT_REQUESTS=10

# Rate Limiting
MAX_REQUESTS_PER_MINUTE=30
MAX_REQUESTS_PER_HOUR=500

# Scraping Options
ENABLE_STEALTH=true
SCRAPING_TIMEOUT=30000
MAX_CONCURRENT_TABS=3

# Logging
LOG_LEVEL=info
ENABLE_LOGGING=true
ENABLE_METRICS=true
```

### Configuration Files

#### `config/default.json`

```json
{
  "scraping": {
    "defaultTimeout": 30000,
    "maxRetries": 3,
    "enableStealth": true,
    "maxConcurrentTabs": 3
  },
  "rateLimit": {
    "maxRequestsPerMinute": 30,
    "maxRequestsPerHour": 500
  },
  "agents": {
    "ecommerce": {
      "maxReviews": 50,
      "maxVariants": 20
    }
  }
}
```

#### `config/selectors.json`

```json
{
  "ecommerce": {
    "amazon": {
      "name": "#productTitle",
      "price": ".a-price-whole",
      "rating": ".a-icon-alt"
    },
    "generic": {
      "name": "h1, .product-name",
      "price": ".price, [data-price]"
    }
  }
}
```

## 🔍 Error Handling

### Error Types

- **ValidationError**: Invalid parameters or configuration
- **ScrapingTimeoutError**: Request timeout
- **RateLimitError**: Rate limit exceeded
- **NetworkError**: Connection or network issues
- **ParsingError**: HTML parsing failures

### Error Response Format

```typescript
{
  success: false,
  error: string,              // Human-readable error message
  code?: string,              // Error code for programmatic handling
  details?: {                 // Additional error details
    url?: string,
    selector?: string,
    statusCode?: number
  },
  metadata: {
    toolName: string,
    executionTime: number,
    timestamp: string
  }
}
```

## 📊 Response Formats

### Success Response

```typescript
{
  success: true,
  data: any,                  // Extracted data
  metadata: {
    toolName: string,
    executionTime: number,    // Milliseconds
    timestamp: string,        // ISO string
    version: string,
    responseTime?: number,    // Individual request time
    statusCode?: number,      // HTTP status
    finalUrl?: string,        // Final URL after redirects
    extractedCount?: number   // Number of items extracted
  }
}
```

### Batch Response

```typescript
{
  success: boolean,
  results: Array<{
    url: string,
    success: boolean,
    data?: any,
    error?: string,
    responseTime: number
  }>,
  summary: {
    total: number,
    successful: number,
    failed: number,
    totalTime: number,
    averageResponseTime: number
  }
}
```

## 🚀 Performance Guidelines

### Rate Limiting Best Practices

1. **E-commerce**: 2-3 concurrent, 2000ms delay
2. **News Sites**: 3-4 concurrent, 1000ms delay  
3. **Job Boards**: 2-3 concurrent, 1500ms delay
4. **Lead Generation**: 1 concurrent, 3000ms delay

### Memory Management

- **Monitor memory usage** with `system_status`
- **Enable garbage collection** in production
- **Limit concurrent operations** to avoid memory spikes
- **Use streaming** for large datasets

### Performance Optimization

- **Use Cheerio for static content** (10x faster than Playwright)
- **Enable data cleaning** to reduce response size
- **Implement proper error handling** to avoid retries
- **Use connection pooling** for high-volume scraping

## 🔐 Security Considerations

### Input Validation

All parameters are validated using Zod schemas before processing.

### Rate Limiting

Built-in rate limiting prevents abuse and helps avoid being blocked.

### Data Sanitization

Automatic HTML sanitization and data cleaning for security.

### Proxy Support

Built-in proxy rotation support for enhanced anonymity.

---

*For more examples and advanced usage, see the `/examples` directory in the project repository.*