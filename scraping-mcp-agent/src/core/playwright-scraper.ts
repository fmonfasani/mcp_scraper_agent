/**
 * Advanced Playwright-based web scraper with anti-detection and performance optimization
 */

import { chromium, firefox, webkit, Browser, BrowserContext, Page, Response } from 'playwright';
import type { 
  ScrapingConfig, 
  ScrapingResult, 
  ScrapingOptions, 
  ScrapingMetadata, 
  IScraper, 
  ScraperStats,
  ScrapingEventListener,
  ScrapingEvent
} from '@/types/scraping-types.js';
import AntiDetectionManager, { type StealthConfig } from '@/utils/anti-detection.js';
import RateLimiter from '@/utils/rate-limiter.js';
import DataCleaner from '@/utils/data-cleaner.js';
import logger from '@/utils/logger.js';

export interface PlaywrightScraperConfig {
  browserType: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  enableStealth: boolean;
  enableRateLimiting: boolean;
  maxConcurrentTabs: number;
  defaultTimeout: number;
  enableScreenshots: boolean;
  screenshotsPath?: string;
  userDataDir?: string;
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
}

export class PlaywrightScraper implements IScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private antiDetection: AntiDetectionManager;
  private rateLimiter: RateLimiter;
  private dataCleaner: DataCleaner;
  private stats: ScraperStats;
  private eventListeners: ScrapingEventListener[] = [];
  private activeTabs: Set<Page> = new Set();

  constructor(
    private config: PlaywrightScraperConfig = this.getDefaultConfig(),
    stealthConfig?: StealthConfig
  ) {
    this.antiDetection = new AntiDetectionManager(stealthConfig);
    this.rateLimiter = new RateLimiter({
      maxConcurrent: config.maxConcurrentTabs,
      delayMs: 1000,
      burstLimit: 5,
      timeWindow: 60000
    });
    this.dataCleaner = new DataCleaner();
    this.stats = this.initializeStats();
  }

  private getDefaultConfig(): PlaywrightScraperConfig {
    return {
      browserType: 'chromium',
      headless: true,
      enableStealth: true,
      enableRateLimiting: true,
      maxConcurrentTabs: 3,
      defaultTimeout: 30000,
      enableScreenshots: false,
      screenshotsPath: './screenshots'
    };
  }

  private initializeStats(): ScraperStats {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      bytesDownloaded: 0,
      pagesScraped: 0,
      errorsCount: {},
      lastUpdated: new Date()
    };
  }

  async initialize(): Promise<void> {
    if (this.browser) {
      await this.dispose();
    }

    try {
      logger.info('Initializing Playwright scraper', {
        browserType: this.config.browserType,
        headless: this.config.headless,
        enableStealth: this.config.enableStealth
      });

      // Launch browser
      const browserOptions = {
        headless: this.config.headless,
        timeout: this.config.defaultTimeout,
        args: this.getBrowserArgs(),
        proxy: this.config.proxy
      };

      switch (this.config.browserType) {
        case 'firefox':
          this.browser = await firefox.launch(browserOptions);
          break;
        case 'webkit':
          this.browser = await webkit.launch(browserOptions);
          break;
        default:
          this.browser = await chromium.launch(browserOptions);
      }

      // Create context
      const contextOptions = {
        viewport: this.antiDetection.getRandomViewport(),
        userAgent: this.antiDetection.getRandomUserAgent(),
        extraHTTPHeaders: this.config.enableStealth ? this.antiDetection.getStealthHeaders('') : {},
        ignoreHTTPSErrors: true,
        bypassCSP: true,
        timezoneId: 'America/New_York',
        locale: 'en-US',
        permissions: ['geolocation']
      };

      if (this.config.userDataDir) {
        contextOptions.userDataDir = this.config.userDataDir;
      }

      this.context = await this.browser.newContext(contextOptions);

      // Setup context-level event handlers
      this.context.on('page', (page) => {
        this.setupPageEventHandlers(page);
      });

      logger.info('Playwright scraper initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Playwright scraper', error);
      throw error;
    }
  }

  private getBrowserArgs(): string[] {
    const args = [
      '--no-first-run',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=VizDisplayCompositor',
      '--disable-ipc-flooding-protection',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-features=TranslateUI',
      '--disable-extensions',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-zygote',
      '--disable-gpu-sandbox',
      '--disable-software-rasterizer'
    ];

    if (this.config.enableStealth) {
      args.push(
        '--disable-web-security',
        '--disable-features=site-per-process',
        '--disable-hang-monitor',
        '--disable-prompt-on-repost',
        '--disable-background-timer-throttling',
        '--disable-background-networking',
        '--disable-client-side-phishing-detection',
        '--disable-default-apps',
        '--disable-sync'
      );
    }

    return args;
  }

  private setupPageEventHandlers(page: Page): void {
    page.on('response', (response: Response) => {
      this.stats.bytesDownloaded += response.headers()['content-length'] ? 
        parseInt(response.headers()['content-length']) : 0;
    });

    page.on('pageerror', (error) => {
      logger.warn('Page error encountered', { error: error.message });
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        logger.debug('Console error', { message: msg.text() });
      }
    });
  }

  async scrape(config: ScrapingConfig): Promise<ScrapingResult> {
    if (!this.context) {
      await this.initialize();
    }

    const startTime = Date.now();
    const jobId = this.generateJobId();
    
    this.stats.totalRequests++;
    logger.logScrapingStart(jobId, config.url);
    this.emitEvent({ type: 'started', jobId, timestamp: new Date() });

    let page: Page | null = null;
    
    try {
      // Rate limiting
      if (this.config.enableRateLimiting) {
        await this.rateLimiter.addTask({
          id: jobId,
          url: config.url,
          task: async () => {
            // Just a placeholder - actual scraping happens below
            return Promise.resolve();
          }
        });
      }

      // Create new page
      page = await this.context!.newPage();
      this.activeTabs.add(page);

      // Apply anti-detection measures
      if (this.config.enableStealth) {
        await this.antiDetection.applyStealthMode(page, config.url);
      }

      // Set default timeout
      page.setDefaultTimeout(config.options?.timeout || this.config.defaultTimeout);

      // Navigate to URL
      const response = await page.goto(config.url, {
        waitUntil: config.options?.waitFor || 'load',
        timeout: config.options?.timeout || this.config.defaultTimeout
      });

      if (!response || !response.ok()) {
        throw new Error(`Failed to load page: ${response?.status()} ${response?.statusText()}`);
      }

      // Wait for additional conditions if specified
      if (config.options?.waitFor && typeof config.options.waitFor === 'string' && 
          !['load', 'domcontentloaded', 'networkidle'].includes(config.options.waitFor)) {
        await page.waitForSelector(config.options.waitFor, { timeout: 10000 });
      }

      // Human-like delay
      const delay = await this.antiDetection.getHumanLikeDelay();
      await page.waitForTimeout(delay);

      // Extract data
      const extractedData = await this.extractData(page, config);

      // Clean data if enabled
      let cleanedData = extractedData;
      if (config.options?.cleanData !== false) {
        const cleaningResult = await this.dataCleaner.cleanData(extractedData);
        cleanedData = cleaningResult.data;
      }

      // Take screenshot if enabled
      if (this.config.enableScreenshots) {
        await this.takeScreenshot(page, jobId);
      }

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Create metadata
      const metadata: ScrapingMetadata = {
        title: await page.title(),
        responseTime,
        statusCode: response.status(),
        finalUrl: page.url(),
        userAgent: this.antiDetection.getRandomUserAgent(),
        timestamp: new Date(),
        extractedCount: Array.isArray(cleanedData) ? cleanedData.length : 1
      };

      const result: ScrapingResult = {
        url: config.url,
        data: cleanedData,
        metadata,
        success: true,
        timestamp: new Date()
      };

      this.stats.successfulRequests++;
      this.stats.pagesScraped++;
      this.updateAverageResponseTime(responseTime);
      
      logger.logScrapingSuccess(jobId, config.url, responseTime, metadata.extractedCount);
      this.emitEvent({ type: 'completed', jobId, results: [result], timestamp: new Date() });

      return result;

    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      this.stats.failedRequests++;
      this.recordError(error);
      
      logger.logScrapingError(jobId, config.url, error as Error, responseTime);
      this.emitEvent({ type: 'error', jobId, error: (error as Error).message, timestamp: new Date() });

      return {
        url: config.url,
        data: {},
        metadata: {
          responseTime,
          statusCode: 0,
          finalUrl: config.url,
          userAgent: this.antiDetection.getRandomUserAgent(),
          timestamp: new Date(),
          extractedCount: 0
        },
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      };
    } finally {
      if (page) {
        this.activeTabs.delete(page);
        await page.close();
      }
      this.stats.lastUpdated = new Date();
    }
  }

  async batchScrape(configs: ScrapingConfig[]): Promise<ScrapingResult[]> {
    const jobId = this.generateJobId();
    logger.info(`Starting batch scrape with ${configs.length} URLs`, { jobId });
    
    const results: ScrapingResult[] = [];
    let completed = 0;

    // Process in batches to avoid overwhelming the browser
    const batchSize = this.config.maxConcurrentTabs;
    
    for (let i = 0; i < configs.length; i += batchSize) {
      const batch = configs.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (config) => {
        try {
          const result = await this.scrape(config);
          completed++;
          logger.logBatchProgress(jobId, completed, configs.length);
          this.emitEvent({ 
            type: 'progress', 
            jobId, 
            progress: Math.round((completed / configs.length) * 100), 
            timestamp: new Date() 
          });
          return result;
        } catch (error) {
          logger.error(`Batch item failed`, error, { url: config.url, jobId });
          completed++;
          return {
            url: config.url,
            data: {},
            metadata: {
              responseTime: 0,
              statusCode: 0,
              finalUrl: config.url,
              userAgent: this.antiDetection.getRandomUserAgent(),
              timestamp: new Date(),
              extractedCount: 0
            },
            success: false,
            error: (error as Error).message,
            timestamp: new Date()
          } as ScrapingResult;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Adaptive rate limiting between batches
      if (this.config.enableRateLimiting && i + batchSize < configs.length) {
        this.rateLimiter.adjustRateLimit();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    logger.info(`Batch scrape completed`, { 
      jobId, 
      total: configs.length, 
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

    return results;
  }

  private async extractData(page: Page, config: ScrapingConfig): Promise<any> {
    const selectors = config.selectors || {};
    
    if (Object.keys(selectors).length === 0) {
      // No specific selectors - extract common elements
      return this.extractDefaultElements(page, config.options);
    }

    const extractedData: Record<string, any> = {};

    for (const [key, selector] of Object.entries(selectors)) {
      try {
        if (selector.startsWith('//')) {
          // XPath selector
          const elements = await page.$$(selector);
          if (elements.length > 1) {
            extractedData[key] = await Promise.all(
              elements.map(el => this.extractElementData(el, config.options))
            );
          } else if (elements.length === 1) {
            extractedData[key] = await this.extractElementData(elements[0], config.options);
          }
        } else {
          // CSS selector
          const elements = await page.$$(selector);
          if (elements.length > 1) {
            extractedData[key] = await Promise.all(
              elements.map(el => this.extractElementData(el, config.options))
            );
          } else if (elements.length === 1) {
            extractedData[key] = await this.extractElementData(elements[0], config.options);
          }
        }
      } catch (error) {
        logger.warn(`Failed to extract data for selector ${key}: ${selector}`, { 
          error: (error as Error).message 
        });
      }
    }

    return extractedData;
  }

  private async extractDefaultElements(page: Page, options?: ScrapingOptions): Promise<any> {
    const data: Record<string, any> = {
      title: await page.title(),
      url: page.url(),
      timestamp: new Date().toISOString()
    };

    try {
      // Extract meta description
      const metaDescription = await page.$eval('meta[name="description"]', 
        el => el.getAttribute('content')).catch(() => null);
      if (metaDescription) data.description = metaDescription;

      // Extract headings
      const headings = await page.$$eval('h1, h2, h3', 
        elements => elements.map(el => ({ tag: el.tagName, text: el.textContent?.trim() }))
      ).catch(() => []);
      if (headings.length > 0) data.headings = headings;

      // Extract paragraphs
      const paragraphs = await page.$$eval('p', 
        elements => elements.map(el => el.textContent?.trim()).filter(text => text && text.length > 20)
      ).catch(() => []);
      if (paragraphs.length > 0) data.paragraphs = paragraphs.slice(0, 10); // Limit to first 10

      // Extract links if requested
      if (options?.extractLinks) {
        const links = await page.$$eval('a[href]', 
          elements => elements.map(el => ({
            text: el.textContent?.trim(),
            href: el.href,
            title: el.title
          }))
        ).catch(() => []);
        data.links = links.slice(0, 50); // Limit to first 50
      }

      // Extract images if requested
      if (options?.extractImages) {
        const images = await page.$$eval('img[src]', 
          elements => elements.map(el => ({
            src: el.src,
            alt: el.alt,
            title: el.title
          }))
        ).catch(() => []);
        data.images = images.slice(0, 20); // Limit to first 20
      }

    } catch (error) {
      logger.warn('Error extracting default elements', { error: (error as Error).message });
    }

    return data;
  }

  private async extractElementData(element: any, options?: ScrapingOptions): Promise<any> {
    try {
      const data: Record<string, any> = {};

      // Get text content
      const textContent = await element.textContent();
      if (textContent?.trim()) {
        data.text = textContent.trim();
      }

      // Get inner HTML if needed
      const innerHTML = await element.innerHTML();
      if (innerHTML && options?.extractImages) {
        data.html = innerHTML;
      }

      // Get common attributes
      const href = await element.getAttribute('href');
      if (href) data.href = href;

      const src = await element.getAttribute('src');
      if (src) data.src = src;

      const alt = await element.getAttribute('alt');
      if (alt) data.alt = alt;

      const title = await element.getAttribute('title');
      if (title) data.title = title;

      const className = await element.getAttribute('class');
      if (className) data.className = className;

      return Object.keys(data).length === 1 && data.text ? data.text : data;
    } catch (error) {
      logger.warn('Error extracting element data', { error: (error as Error).message });
      return null;
    }
  }

  private async takeScreenshot(page: Page, jobId: string): Promise<void> {
    try {
      const screenshotPath = `${this.config.screenshotsPath}/${jobId}-${Date.now()}.png`;
      await page.screenshot({ 
        path: screenshotPath,
        fullPage: true,
        type: 'png'
      });
      logger.debug(`Screenshot saved: ${screenshotPath}`);
    } catch (error) {
      logger.warn('Failed to take screenshot', { error: (error as Error).message });
    }
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateAverageResponseTime(responseTime: number): void {
    const totalTime = this.stats.averageResponseTime * this.stats.successfulRequests;
    this.stats.averageResponseTime = (totalTime + responseTime) / (this.stats.successfulRequests);
  }

  private recordError(error: any): void {
    const errorKey = error.message || 'Unknown error';
    this.stats.errorsCount[errorKey] = (this.stats.errorsCount[errorKey] || 0) + 1;
  }

  // Event management
  addEventListener(listener: ScrapingEventListener): void {
    this.eventListeners.push(listener);
  }

  removeEventListener(listener: ScrapingEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  private emitEvent(event: ScrapingEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener.onEvent(event);
      } catch (error) {
        logger.warn('Event listener error', { error: (error as Error).message });
      }
    });
  }

  // Public getters
  getStats(): ScraperStats {
    return { ...this.stats };
  }

  getRateLimitStatus() {
    return this.rateLimiter.getStatus();
  }

  getAntiDetectionStats() {
    return this.antiDetection.getStealthStats();
  }

  // Cleanup
  async dispose(): Promise<void> {
    logger.info('Disposing Playwright scraper');
    
    // Close all active tabs
    for (const page of this.activeTabs) {
      try {
        await page.close();
      } catch (error) {
        logger.warn('Error closing page', { error: (error as Error).message });
      }
    }
    this.activeTabs.clear();

    // Close context
    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    // Close browser
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    logger.info('Playwright scraper disposed');
  }
}

export default PlaywrightScraper;