# 🕷️ Scraping MCP Agent

**Advanced Web Scraping MCP Agent with AI-Powered Tools**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/your-repo/scraping-mcp-agent)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

A comprehensive **Model Context Protocol (MCP)** agent designed for intelligent web scraping with specialized tools for e-commerce, job listings, news articles, and lead generation. Built with TypeScript, Playwright, and advanced anti-detection techniques.

## 🌟 Features

### 🚀 **Core Capabilities**
- **Multi-Engine Scraping**: Playwright for dynamic content, Cheerio for static HTML
- **Auto-Detection**: Intelligent scraper selection based on website requirements
- **Anti-Bot Protection**: Stealth mode, user agent rotation, human-like behavior
- **Rate Limiting**: Smart throttling to avoid being blocked
- **Data Cleaning**: Automatic data validation and cleaning

### 🛍️ **Specialized Agents**
- **E-commerce Agent**: Products, prices, reviews, variants, competitor analysis
- **Jobs Agent**: Job listings, salaries, requirements, company info
- **News Agent**: Articles, headlines, content extraction, sentiment analysis
- **Leads Agent**: Contact extraction, email/phone validation, enrichment

### 🔧 **Advanced Features**
- **Batch Processing**: Handle thousands of URLs efficiently
- **Real-time Monitoring**: Track website changes and get alerts
- **Competitor Analysis**: Compare multiple sites automatically
- **Export Formats**: JSON, CSV, Excel with compression support
- **Performance Analytics**: Detailed metrics and recommendations

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+**
- **TypeScript 5.3+**
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/scraping-mcp-agent.git
cd scraping-mcp-agent

# Install dependencies
npm install

# Install Playwright browsers
npm run install-browsers

# Copy environment configuration
cp .env.example .env

# Run quick start demo
npm run example:quick
```

### MCP Server Usage

```bash
# Start the MCP server
npm start

# The server will accept MCP tool calls via stdio
# Integrate with Claude Desktop or other MCP clients
```

### Programmatic Usage

```typescript
import { EcommerceAgent, JobsAgent, scraperFactory } from 'scraping-mcp-agent';

// Quick scraping with auto-detection
const scraper = await scraperFactory.createScraper('auto');
const result = await scraper.scrape({
  url: 'https://example.com',
  selectors: {
    title: 'h1',
    price: '.price',
    description: '.description'
  }
});

// E-commerce specialized scraping
const ecommerce = new EcommerceAgent();
const product = await ecommerce.scrapeProduct('https://shop.example.com/product', {
  extractReviews: true,
  extractVariants: true,
  maxReviews: 50
});

// Cleanup
await scraper.dispose();
await ecommerce.dispose();
```

## 🛠️ MCP Tools Reference

### Basic Scraping Tools

#### `scrape_url`
Scrape a single URL with custom selectors and options.

```json
{
  "name": "scrape_url",
  "arguments": {
    "url": "https://example.com",
    "selectors": {
      "title": "h1",
      "price": ".price"
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

```json
{
  "name": "batch_scrape",
  "arguments": {
    "urls": ["https://site1.com", "https://site2.com"],
    "options": {
      "maxConcurrent": 2,
      "delayBetweenRequests": 1000
    }
  }
}
```

### Specialized Tools

#### `scrape_ecommerce`
Extract product data including reviews and variants.

```json
{
  "name": "scrape_ecommerce",
  "arguments": {
    "url": "https://shop.example.com/product",
    "extractReviews": true,
    "extractVariants": true,
    "maxReviews": 50
  }
}
```

#### `scrape_jobs`
Extract job listings with filtering options.

```json
{
  "name": "scrape_jobs",
  "arguments": {
    "url": "https://jobs.example.com/search",
    "filters": {
      "jobType": "full-time",
      "remote": true,
      "salaryMin": 50000
    },
    "maxJobsPerPage": 50
  }
}
```

#### `scrape_news`
Extract news articles with content and metadata.

```json
{
  "name": "scrape_news",
  "arguments": {
    "url": "https://news.example.com",
    "extractContent": true,
    "extractAuthor": true,
    "maxArticlesPerPage": 20
  }
}
```

#### `scrape_leads`
Extract contact information and leads.

```json
{
  "name": "scrape_leads",
  "arguments": {
    "url": "https://directory.example.com",
    "extractEmails": true,
    "validateContacts": true,
    "criteria": {
      "industry": "technology",
      "location": "San Francisco"
    }
  }
}
```

### Advanced Tools

#### `monitor_url`
Monitor websites for changes with alerts.

```json
{
  "name": "monitor_url",
  "arguments": {
    "url": "https://example.com/pricing",
    "interval": 3600,
    "alertThreshold": 10,
    "webhook": "https://your-webhook.com/alert"
  }
}
```

#### `competitor_analysis`
Analyze and compare multiple competitor sites.

```json
{
  "name": "competitor_analysis",
  "arguments": {
    "urls": ["https://competitor1.com", "https://competitor2.com"],
    "analysisType": "pricing",
    "compareAgainst": "https://yoursite.com"
  }
}
```

#### `bulk_processing`
Process large batches of URLs asynchronously.

```json
{
  "name": "bulk_processing",
  "arguments": {
    "urls": ["...1000 URLs..."],
    "processingType": "ecommerce",
    "batchSize": 10,
    "exportFormat": "csv"
  }
}
```

## 📊 Management Tools

#### `job_management`
Manage scraping jobs and monitor progress.

```json
{
  "name": "job_management",
  "arguments": {
    "action": "list"
  }
}
```

#### `performance_analytics`
Get detailed performance metrics and insights.

```json
{
  "name": "performance_analytics",
  "arguments": {
    "timeRange": "day",
    "includeDetails": true
  }
}
```

#### `system_status`
Check system health and resource usage.

```json
{
  "name": "system_status",
  "arguments": {
    "component": "all",
    "includeMetrics": true
  }
}
```

## 🏗️ Architecture

```
scraping-mcp-agent/
├── 🧠 Core Engine
│   ├── Playwright Scraper (Dynamic content)
│   ├── Cheerio Scraper (Static HTML)
│   └── Factory Pattern (Auto-selection)
│
├── 🤖 Specialized Agents
│   ├── E-commerce Agent
│   ├── Jobs Agent
│   ├── News Agent
│   └── Leads Agent
│
├── 🛡️ Anti-Detection Layer
│   ├── Stealth Mode
│   ├── User Agent Rotation
│   ├── Human-like Behavior
│   └── Proxy Support
│
├── 📡 MCP Integration
│   ├── Tool Handlers
│   ├── Schema Validation
│   └── Response Formatting
│
└── 🔧 Utilities
    ├── Rate Limiting
    ├. Data Cleaning
    ├── Performance Monitoring
    └── Export Formats
```

## 🎯 Use Cases

### 💼 **Business Intelligence**
- Monitor competitor pricing and products
- Track market trends and news
- Generate leads from business directories
- Analyze job market data

### 🛒 **E-commerce**
- Price monitoring and comparison
- Product catalog synchronization
- Review and rating analysis
- Inventory tracking

### 📰 **Content Aggregation**
- News article collection
- Social media monitoring
- Blog content tracking
- Press release gathering

### 🎯 **Lead Generation**
- Contact information extraction
- Company data enrichment
- Industry research
- Sales prospecting

## ⚙️ Configuration

### Environment Variables

```bash
# Basic Configuration
NODE_ENV=production
MCP_SERVER_NAME=scraping-mcp-agent
MAX_CONCURRENT_REQUESTS=10

# Rate Limiting
MAX_REQUESTS_PER_MINUTE=30
MAX_REQUESTS_PER_HOUR=500

# Anti-Detection
ENABLE_STEALTH=true
ENABLE_USER_AGENT_ROTATION=true
HUMAN_LIKE_DELAY=true

# Performance
SCRAPING_TIMEOUT=30000
MAX_MEMORY_USAGE=2GB
ENABLE_GARBAGE_COLLECTION=true
```

### Custom Selectors

Customize selectors for specific websites in `config/selectors.json`:

```json
{
  "ecommerce": {
    "yoursite.com": {
      "name": ".product-title",
      "price": ".price-current",
      "rating": ".rating-stars"
    }
  }
}
```

## 🔒 Legal & Ethics

### ⚖️ **Important Legal Notice**

**Please read [LEGAL.md](LEGAL.md) before using this tool.**

- ✅ **Respect robots.txt** - Always check and follow robots.txt directives
- ✅ **Rate limiting** - Don't overwhelm servers with requests
- ✅ **Terms of Service** - Review and comply with website ToS
- ✅ **Data protection** - Handle scraped data according to privacy laws
- ✅ **Fair use** - Use scraped data responsibly and ethically

### 🛡️ **Built-in Protections**

- Automatic rate limiting and delays
- Respect for common crawling patterns
- Built-in robots.txt checking (optional)
- Data anonymization options
- Audit logging for compliance

## 🚦 Performance & Limits

### **Recommended Limits**

| Operation | Recommended Limit | Max Concurrent |
|-----------|------------------|----------------|
| Basic Scraping | 30 req/min | 3 tabs |
| E-commerce | 20 req/min | 2 tabs |
| Job Scraping | 25 req/min | 3 tabs |
| News Scraping | 40 req/min | 4 tabs |
| Lead Generation | 10 req/min | 1 tab |

### **Performance Tips**

1. **Use Cheerio for static content** - 10x faster than Playwright
2. **Enable rate limiting** - Prevents getting blocked
3. **Batch processing** - More efficient for large datasets
4. **Monitor memory usage** - Restart if memory usage > 90%
5. **Use selectors efficiently** - Specific selectors are faster

## 🧪 Examples

### Run Built-in Examples

```bash
# Quick start demo (10 minutes)
npm run example:quick

# E-commerce comprehensive demo
npm run example:ecommerce

# Competitive intelligence demo
npm run example:competitive

# Batch processing demo
npm run example:batch-scraping
```

### Custom Examples

See the `/examples` directory for more comprehensive examples:

- `quick-start.ts` - Basic functionality demo
- `ecommerce-example.ts` - Advanced e-commerce scraping
- `competitive-intel.ts` - Competitor analysis
- `batch-scraping.ts` - Large-scale data collection
- `site-analysis.ts` - Analyze a single site and summarize strengths

## 🛠️ Development

### Setup Development Environment

```bash
# Install dependencies
npm install

# Install browsers
npm run install-browsers

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Project Structure

```
src/
├── core/           # Core scraping engines
├── mcp/            # MCP server and tools
├── agents/         # Specialized scraping agents
├── utils/          # Utilities and helpers
└── types/          # TypeScript type definitions

examples/           # Usage examples
config/             # Configuration files
docs/               # Documentation
tests/              # Test files
scripts/            # Utility scripts
```

### Adding Custom Agents

```typescript
// src/agents/custom-agent.ts
import { IScraper, ScrapingResult } from '@/types/scraping-types.js';

export class CustomAgent {
  async scrapeCustom(url: string, options: any): Promise<ScrapingResult> {
    // Your custom scraping logic
  }
}
```

## 📚 Documentation

- [API Reference](docs/api-reference.md) - Complete API documentation
- [Best Practices](docs/best-practices.md) - Scraping best practices
- [Legal Guidelines](docs/legal-guidelines.md) - Legal considerations
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions
- [Contributing](docs/contributing.md) - How to contribute

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Run tests: `npm test`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Style

We use TypeScript with strict mode and follow these guidelines:

- **ESLint** for code linting
- **Prettier** for code formatting
- **Conventional Commits** for commit messages
- **JSDoc** for function documentation

## 🐛 Troubleshooting

### Common Issues

#### **Browser Installation Issues**

```bash
# Reinstall browsers
npx playwright install

# Install system dependencies (Linux)
npx playwright install-deps
```

#### **Memory Issues**

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable garbage collection
export ENABLE_GARBAGE_COLLECTION=true
```

#### **Rate Limiting Issues**

```bash
# Reduce concurrency
export MAX_CONCURRENT_REQUESTS=2

# Increase delays
export SCRAPING_DELAY=2000
```

### Getting Help

- 📖 Check the [Documentation](docs/)
- 🐛 Report bugs via [GitHub Issues](https://github.com/your-repo/scraping-mcp-agent/issues)
- 💬 Join our [Discord Community](https://discord.gg/your-discord)
- 📧 Email support: support@your-domain.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Playwright Team** - For the excellent browser automation library
- **Cheerio Team** - For the fast HTML parsing library
- **MCP Community** - For the Model Context Protocol specification
- **Contributors** - All the amazing people who contribute to this project

## ⭐ Support

If this project helps you, please consider:

- ⭐ **Starring** the repository
- 🐛 **Reporting** bugs and issues
- 💡 **Suggesting** new features
- 🤝 **Contributing** code or documentation
- 📢 **Sharing** with others who might find it useful

---

**Made with ❤️ by the Scraping MCP Agent team**

*This tool is designed for legitimate web scraping use cases. Please use responsibly and in compliance with applicable laws and website terms of service.*



----------------------------------------------------------------------------------------------------------
# 🚀 Scraping MCP Agent

Professional web scraping agent with Model Context Protocol (MCP) integration for AI-powered data extraction.

## ✨ Features

- 🎭 **Playwright Integration** - Dynamic content scraping with JavaScript support
- 🥄 **Cheerio Support** - Fast static HTML scraping
- 🔌 **MCP Integration** - Direct integration with AI models
- 🛒 **Specialized Agents** - E-commerce, Jobs, News, Lead Generation
- 🥷 **Anti-Detection** - Stealth mode, proxy support, user agent rotation
- ⚡ **Performance** - Rate limiting, concurrent processing, smart retries
- 🧹 **Data Cleaning** - Automatic data validation and cleaning
- 📝 **Comprehensive Logging** - Detailed logging and monitoring

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/scraping-mcp-agent.git
cd scraping-mcp-agent

# Install dependencies
npm install

# Install Playwright browsers
npm run install-browsers

# Copy environment variables
cp .env.example .env
```

### 2. Basic Usage

```typescript
import { PlaywrightScraper } from './src/core/playwright-scraper';

const scraper = new PlaywrightScraper();
await scraper.initialize();

const result = await scraper.scrape('https://example.com', {
  selectors: {
    title: 'h1',
    description: '.description'
  }
});

console.log(result.data);
```

### 3. Run Examples

```bash
# Quick start demo
npm run example:quick

# E-commerce scraping
npm run example:ecommerce

# Test scraper functionality
npm run test:scraper
```

## 📖 Documentation

### Core Components

- **PlaywrightScraper** - Main scraper for dynamic content
- **CheerioScraper** - Lightweight scraper for static content
- **ScraperFactory** - Smart scraper selection
- **MCPServer** - Model Context Protocol integration

### Specialized Agents

- **EcommerceAgent** - Product scraping (prices, reviews, stock)
- **JobsAgent** - Job listings from various boards
- **NewsAgent** - News articles and headlines
- **LeadsAgent** - Business directories and contact info

### Utilities

- **AntiDetection** - Stealth mode and bot detection evasion
- **RateLimiter** - Request rate control and queue management
- **DataCleaner** - Data validation and cleaning
- **Logger** - Comprehensive logging system

## 🛠️ Configuration

### Environment Variables

```bash
# Scraping settings
SCRAPING_TIMEOUT=30000
SCRAPING_DELAY_MIN=1000
SCRAPING_DELAY_MAX=3000
SCRAPING_CONCURRENT_LIMIT=5

# Anti-detection
USE_STEALTH_MODE=true
ROTATE_USER_AGENTS=true
USE_PROXY=false

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/scraper.log
```

### Custom Selectors

Edit `config/selectors.json` to add custom CSS selectors for different websites.

## 🎯 Use Cases

### E-commerce Monitoring
```typescript
const agent = new EcommerceAgent();
const product = await agent.scrapeProduct('https://store.com/product');
console.log(`${product.title}: ${product.price}`);
```

### Job Market Analysis
```typescript
const jobAgent = new JobsAgent();
const jobs = await jobAgent.scrapeJobListings('https://jobs.com/search');
```

### Competitive Intelligence
```typescript
const competitors = ['site1.com', 'site2.com', 'site3.com'];
const analysis = await Promise.all(
  competitors.map(url => scraper.scrape(url, options))
);
```

## 🔧 Development

### Scripts

```bash
npm run dev          # Development mode with watch
npm run build        # Build TypeScript
npm run test         # Run tests
npm run lint         # Lint code
npm run format       # Format code
npm run benchmark    # Performance benchmarks
```

### Project Structure

```
src/
├── core/           # Core scraping logic
├── mcp/            # MCP integration
├── agents/         # Specialized agents
├── utils/          # Utilities
└── types/          # TypeScript types
```

## ⚖️ Legal & Ethics

- Always respect robots.txt
- Implement proper rate limiting
- Don't overload servers
- Respect copyright and terms of service
- Use for legitimate purposes only

See [LEGAL.md](LEGAL.md) for detailed guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

- 📧 Email: support@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/scraping-mcp-agent/issues)
- 📖 Docs: [Documentation](https://github.com/yourusername/scraping-mcp-agent/wiki)

---

**Made with ❤️ for ethical web scraping**
