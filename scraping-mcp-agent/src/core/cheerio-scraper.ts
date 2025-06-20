/**
 * Fast static web scraper using Cheerio for simple HTML parsing
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import UserAgent from 'user-agents';
import type { 
  ScrapingConfig, 
  ScrapingResult, 
  ScrapingOptions, 
  ScrapingMetadata, 
  IScraper, 
  ScraperStats,
  ProxyConfig
} from '@/types/scraping-types.js';
import RateLimiter from '@/utils/rate-limiter.js';
import DataCleaner from '@/utils/data-cleaner.js';
import logger from '@/utils/logger.js';

export interface CheerioScraperConfig {
  timeout: number;
  maxRedirects: number;
  enableCompression: boolean;
  enableCookies: boolean;
  userAgentRotation: boolean;
  proxyRotation: boolean;
  retryOnFailure: boolean;
  maxRetries: number;
  retryDelay: number;
}

export class CheerioScraper implements IScraper {
  private httpClient: AxiosInstance;
  private rateLimiter: RateLimiter;
  private dataCleaner: DataCleaner;
  private userAgents: string[] = [];
  private proxies: ProxyConfig[] = [];
  private currentProxyIndex = 0;
  private stats: ScraperStats;

  constructor(
    private config: CheerioScraperConfig = this.getDefaultConfig(),
    proxies?: ProxyConfig[]
  ) {
    this.initializeUserAgents();
    this.initializeHttpClient();
    this.rateLimiter = new RateLimiter({
      maxConcurrent: 5,
      delayMs: 500,
      burstLimit: 10,
      timeWindow: 60000
    });
    this.dataCleaner = new DataCleaner();
    this.stats = this.initializeStats();

    if (proxies) {
      this.proxies = proxies;
    }
  }

  private getDefaultConfig(): CheerioScraperConfig {
    return {
      timeout: 15000,
      maxRedirects: 5,
      enableCompression: true,
      enableCookies: true,
      userAgentRotation: true,
      proxyRotation: false,
      retryOnFailure: true,
      maxRetries: 3,
      retryDelay: 1000
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

  private initializeUserAgents(): void {
    const userAgentGenerator = new UserAgent([
      /Chrome/,
      /Firefox/,
      /Safari/,
      /Edge/
    ]);

    this.userAgents = Array.from({ length: 20 }, () => 
      userAgentGenerator.random().toString()
    );

    // Add some specific high-quality user agents
    this.userAgents.push(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    );
  }

  private initializeHttpClient(): void {
    const baseConfig: AxiosRequestConfig = {
      timeout: this.config.timeout,
      maxRedirects: this.config.maxRedirects,
      decompress: this.config.enableCompression,
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    };

    if (this.config.userAgentRotation) {
      baseConfig.headers!['User-Agent'] = this.getRandomUserAgent();
    }

    this.httpClient = axios.create(baseConfig);

    // Setup interceptors
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.httpClient.interceptors.request.use(
      (config) => {
        // Rotate user agent if enabled
        if (this.config.userAgentRotation) {
          config.headers!['User-Agent'] = this.getRandomUserAgent();
        }

        // Setup proxy if enabled
        if (this.config.proxyRotation && this.proxies.length > 0) {
          const proxy = this.getCurrentProxy();
          if (proxy) {
            config.proxy = {
              protocol: proxy.type,
              host: proxy.host,
              port: proxy.port,
              auth: proxy.username ? {
                username: proxy.username,
                password: proxy.password || ''
              } : undefined
            };
          }
        }

        this.stats.totalRequests++;
        return config;
      },
      (error) => {
        this.stats.failedRequests++;
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        this.stats.successfulRequests++;
        this.stats.bytesDownloaded += this.estimateResponseSize(response);
        return response;
      },
      (error) => {
        this.stats.failedRequests++;
        this.recordError(error);
        return Promise.reject(error);
      }
    );
  }

  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  private getCurrentProxy(): ProxyConfig | null {
    if (this.proxies.length === 0) return null;
    return this.proxies[this.currentProxyIndex];
  }

  private rotateProxy(): void {
    if (this.proxies.length > 0) {
      this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
    }
  }

  private estimateResponseSize(response: AxiosResponse): number {
    const contentLength = response.headers['content-length'];
    if (contentLength) {
      return parseInt(contentLength, 10);
    }
    // Estimate based on response data
    return JSON.stringify(response.data).length;
  }

  private recordError(error: any): void {
    const errorKey = error.code || error.message || 'Unknown error';
    this.stats.errorsCount[errorKey] = (this.stats.errorsCount[errorKey] || 0) + 1;
  }

  async scrape(config: ScrapingConfig): Promise<ScrapingResult> {
    const startTime = Date.now();
    const jobId = this.generateJobId();
    
    logger.logScrapingStart(jobId, config.url);

    try {
      // Add rate limiting
      await this.rateLimiter.addTask({
        id: jobId,
        url: config.url,
        task: async () => {
          return this.performScrape(config, jobId);
        },
        maxRetries: this.config.maxRetries
      });

      const result = await this.performScrape(config, jobId);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      this.stats.pagesScraped++;
      this.updateAverageResponseTime(responseTime);
      
      logger.logScrapingSuccess(jobId, config.url, responseTime, 
        Array.isArray(result.data) ? result.data.length : 1);

      return result;

    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      logger.logScrapingError(jobId, config.url, error as Error, responseTime);

      return {
        url: config.url,
        data: {},
        metadata: {
          responseTime,
          statusCode: 0,
          finalUrl: config.url,
          userAgent: this.getRandomUserAgent(),
          timestamp: new Date(),
          extractedCount: 0
        },
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      };
    } finally {
      this.stats.lastUpdated = new Date();
    }
  }

  private async performScrape(config: ScrapingConfig, jobId: string): Promise<ScrapingResult> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.config.maxRetries) {
      try {
        const response = await this.httpClient.get(config.url);
        
        if (response.status >= 400) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Parse HTML with Cheerio
        const $ = cheerio.load(response.data);
        
        // Extract data based on selectors
        const extractedData = this.extractData($, config);

        // Clean data if enabled
        let cleanedData = extractedData;
        if (config.options?.cleanData !== false) {
          const cleaningResult = await this.dataCleaner.cleanData(extractedData);
          cleanedData = cleaningResult.data;
        }

        // Create metadata
        const metadata: ScrapingMetadata = {
          title: $('title').text().trim() || '',
          description: $('meta[name="description"]').attr('content') || '',
          responseTime: Date.now() - Date.now(), // Will be updated by caller
          statusCode: response.status,
          finalUrl: response.config.url || config.url,
          userAgent: response.config.headers?.['User-Agent'] || '',
          timestamp: new Date(),
          extractedCount: Array.isArray(cleanedData) ? cleanedData.length : 1,
          totalSize: this.estimateResponseSize(response)
        };

        return {
          url: config.url,
          data: cleanedData,
          metadata,
          success: true,
          timestamp: new Date()
        };

      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (attempt <= this.config.maxRetries) {
          // Wait before retry with exponential backoff
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          logger.info(`Retrying scrape attempt ${attempt}/${this.config.maxRetries}`, {
            jobId,
            url: config.url,
            delay,
            error: lastError.message
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Rotate proxy on retry if enabled
          if (this.config.proxyRotation) {
            this.rotateProxy();
          }
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  private extractData($: cheerio.CheerioAPI, config: ScrapingConfig): any {
    const selectors = config.selectors || {};
    
    if (Object.keys(selectors).length === 0) {
      // No specific selectors - extract common elements
      return this.extractDefaultElements($, config.options);
    }

    const extractedData: Record<string, any> = {};

    for (const [key, selector] of Object.entries(selectors)) {
      try {
        const elements = $(selector);
        
        if (elements.length > 1) {
          extractedData[key] = elements.map((_, el) => 
            this.extractElementData($(el), config.options)
          ).get();
        } else if (elements.length === 1) {
          extractedData[key] = this.extractElementData(elements.first(), config.options);
        }
      } catch (error) {
        logger.warn(`Failed to extract data for selector ${key}: ${selector}`, { 
          error: (error as Error).message 
        });
      }
    }

    return extractedData;
  }

  private extractDefaultElements($: cheerio.CheerioAPI, options?: ScrapingOptions): any {
    const data: Record<string, any> = {
      title: $('title').text().trim(),
      url: $.root().attr('data-url') || '',
      timestamp: new Date().toISOString()
    };

    // Extract meta description
    const metaDescription = $('meta[name="description"]').attr('content');
    if (metaDescription) data.description = metaDescription.trim();

    // Extract headings
    const headings: Array<{ tag: string; text: string }> = [];
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      if (text) {
        headings.push({
          tag: el.tagName.toLowerCase(),
          text
        });
      }
    });
    if (headings.length > 0) data.headings = headings;

    // Extract paragraphs
    const paragraphs: string[] = [];
    $('p').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 20) {
        paragraphs.push(text);
      }
    });
    if (paragraphs.length > 0) data.paragraphs = paragraphs.slice(0, 10);

    // Extract links if requested
    if (options?.extractLinks) {
      const links: Array<{ text: string; href: string; title?: string }> = [];
      $('a[href]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const text = $el.text().trim();
        const title = $el.attr('title');
        
        if (href && text) {
          links.push({ text, href, title });
        }
      });
      data.links = links.slice(0, 50);
    }

    // Extract images if requested
    if (options?.extractImages) {
      const images: Array<{ src: string; alt?: string; title?: string }> = [];
      $('img[src]').each((_, el) => {
        const $el = $(el);
        const src = $el.attr('src');
        const alt = $el.attr('alt');
        const title = $el.attr('title');
        
        if (src) {
          images.push({ src, alt, title });
        }
      });
      data.images = images.slice(0, 20);
    }

    return data;
  }

  private extractElementData($el: cheerio.Cheerio<cheerio.Element>, options?: ScrapingOptions): any {
    const data: Record<string, any> = {};

    // Get text content
    const textContent = $el.text().trim();
    if (textContent) {
      data.text = textContent;
    }

    // Get HTML if needed
    if (options?.extractImages) {
      const html = $el.html();
      if (html) data.html = html;
    }

    // Get common attributes
    const href = $el.attr('href');
    if (href) data.href = href;

    const src = $el.attr('src');
    if (src) data.src = src;

    const alt = $el.attr('alt');
    if (alt) data.alt = alt;

    const title = $el.attr('title');
    if (title) data.title = title;

    const className = $el.attr('class');
    if (className) data.className = className;

    const id = $el.attr('id');
    if (id) data.id = id;

    // Get data attributes
    const attributes = $el.get(0)?.attribs;
    if (attributes) {
      Object.keys(attributes).forEach(attr => {
        if (attr.startsWith('data-')) {
          data[attr] = attributes[attr];
        }
      });
    }

    return Object.keys(data).length === 1 && data.text ? data.text : data;
  }

  async batchScrape(configs: ScrapingConfig[]): Promise<ScrapingResult[]> {
    const jobId = this.generateJobId();
    logger.info(`Starting Cheerio batch scrape with ${configs.length} URLs`, { jobId });
    
    const results: ScrapingResult[] = [];
    let completed = 0;

    // Process with rate limiting
    const batchPromises = configs.map(async (config) => {
      try {
        const result = await this.scrape(config);
        completed++;
        logger.logBatchProgress(jobId, completed, configs.length);
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
            userAgent: this.getRandomUserAgent(),
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

    logger.info(`Cheerio batch scrape completed`, { 
      jobId, 
      total: configs.length, 
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

    return results;
  }

  private generateJobId(): string {
    return `cheerio_job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateAverageResponseTime(responseTime: number): void {
    const totalTime = this.stats.averageResponseTime * this.stats.successfulRequests;
    this.stats.averageResponseTime = (totalTime + responseTime) / this.stats.successfulRequests;
  }

  getStats(): ScraperStats {
    return { ...this.stats };
  }

  async dispose(): Promise<void> {
    logger.info('Disposing Cheerio scraper');
    // Cheerio scraper doesn't need special cleanup
    // Just clear any pending timers
    await this.rateLimiter.onIdle();
    logger.info('Cheerio scraper disposed');
  }

  // Utility methods for different content types
  static createForNews(): CheerioScraper {
    return new CheerioScraper({
      timeout: 10000,
      maxRedirects: 3,
      enableCompression: true,
      enableCookies: false,
      userAgentRotation: true,
      proxyRotation: false,
      retryOnFailure: true,
      maxRetries: 2,
      retryDelay: 500
    });
  }

  static createForAPI(): CheerioScraper {
    return new CheerioScraper({
      timeout: 5000,
      maxRedirects: 0,
      enableCompression: true,
      enableCookies: false,
      userAgentRotation: false,
      proxyRotation: false,
      retryOnFailure: true,
      maxRetries: 1,
      retryDelay: 200
    });
  }

  static createForEcommerce(): CheerioScraper {
    return new CheerioScraper({
      timeout: 15000,
      maxRedirects: 5,
      enableCompression: true,
      enableCookies: true,
      userAgentRotation: true,
      proxyRotation: true,
      retryOnFailure: true,
      maxRetries: 3,
      retryDelay: 2000
    });
  }
}

export default CheerioScraper;