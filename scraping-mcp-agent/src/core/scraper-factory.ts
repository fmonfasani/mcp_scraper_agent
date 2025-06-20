/**
 * Factory for selecting the appropriate scraper based on requirements
 */

import PlaywrightScraper, { type PlaywrightScraperConfig } from './playwright-scraper.js';
import CheerioScraper, { type CheerioScraperConfig } from './cheerio-scraper.js';
import type { IScraper, ScrapingConfig, ProxyConfig } from '@/types/scraping-types.js';
import type { StealthConfig } from '@/utils/anti-detection.js';
import logger from '@/utils/logger.js';

export type ScraperType = 'playwright' | 'cheerio' | 'auto';

export interface ScraperFactoryConfig {
  defaultScraperType: ScraperType;
  playwrightConfig?: Partial<PlaywrightScraperConfig>;
  cheerioConfig?: Partial<CheerioScraperConfig>;
  stealthConfig?: StealthConfig;
  proxies?: ProxyConfig[];
  autoDetectionRules?: AutoDetectionRules;
}

export interface AutoDetectionRules {
  // URLs that require JavaScript execution
  requiresJavaScript: string[];
  // URLs that are known to work well with static scraping
  staticFriendly: string[];
  // Domains that require stealth mode
  requiresStealth: string[];
  // E-commerce sites that need special handling
  ecommerceSites: string[];
  // News sites patterns
  newsSites: string[];
  // Job boards
  jobBoards: string[];
  // Social media sites (usually require Playwright)
  socialMedia: string[];
}

export class ScraperFactory {
  private static instance: ScraperFactory;
  private scraperInstances: Map<string, IScraper> = new Map();
  private defaultRules: AutoDetectionRules;

  constructor(private config: ScraperFactoryConfig = {}) {
    this.config.defaultScraperType = config.defaultScraperType || 'auto';
    this.defaultRules = this.getDefaultDetectionRules();
    
    if (config.autoDetectionRules) {
      this.mergeDetectionRules(config.autoDetectionRules);
    }
  }

  static getInstance(config?: ScraperFactoryConfig): ScraperFactory {
    if (!ScraperFactory.instance) {
      ScraperFactory.instance = new ScraperFactory(config);
    }
    return ScraperFactory.instance;
  }

  private getDefaultDetectionRules(): AutoDetectionRules {
    return {
      requiresJavaScript: [
        'spa-', 'app.', 'react.', 'angular.', 'vue.',
        'amazon.com', 'alibaba.com', 'shopify.com',
        'indeed.com', 'linkedin.com', 'glassdoor.com',
        'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
        'youtube.com', 'netflix.com', 'spotify.com'
      ],
      staticFriendly: [
        'wikipedia.org', 'stackoverflow.com', 'github.com',
        'reddit.com', 'news.ycombinator.com', 'medium.com',
        'blog.', 'docs.', 'help.', 'support.'
      ],
      requiresStealth: [
        'amazon.com', 'walmart.com', 'target.com',
        'linkedin.com', 'indeed.com', 'glassdoor.com',
        'cloudflare.com', 'akamai.com', 'incapsula.com'
      ],
      ecommerceSites: [
        'amazon.', 'ebay.', 'shopify.', 'woocommerce.',
        'magento.', 'prestashop.', 'opencart.',
        'walmart.', 'target.', 'bestbuy.', 'homedepot.'
      ],
      newsSites: [
        'cnn.com', 'bbc.com', 'reuters.com', 'bloomberg.com',
        'techcrunch.com', 'theverge.com', 'ars-technica.com',
        'news.', 'press.', 'herald.', 'times.', 'post.'
      ],
      jobBoards: [
        'indeed.com', 'linkedin.com', 'glassdoor.com',
        'monster.com', 'careerbuilder.com', 'ziprecruiter.com',
        'jobs.', 'careers.', 'hiring.', 'talent.'
      ],
      socialMedia: [
        'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
        'tiktok.com', 'snapchat.com', 'pinterest.com',
        'linkedin.com', 'youtube.com'
      ]
    };
  }

  private mergeDetectionRules(customRules: Partial<AutoDetectionRules>): void {
    Object.keys(customRules).forEach(key => {
      const ruleKey = key as keyof AutoDetectionRules;
      if (customRules[ruleKey]) {
        this.defaultRules[ruleKey] = [
          ...this.defaultRules[ruleKey],
          ...customRules[ruleKey]!
        ];
      }
    });
  }

  async createScraper(
    type: ScraperType = 'auto',
    config?: ScrapingConfig,
    options?: {
      reuseInstance?: boolean;
      instanceKey?: string;
    }
  ): Promise<IScraper> {
    const resolvedType = type === 'auto' ? this.detectScraperType(config) : type;
    const instanceKey = options?.instanceKey || `${resolvedType}_${Date.now()}`;

    // Return existing instance if requested and available
    if (options?.reuseInstance && this.scraperInstances.has(instanceKey)) {
      const existingInstance = this.scraperInstances.get(instanceKey)!;
      logger.debug(`Reusing scraper instance: ${instanceKey}`, { type: resolvedType });
      return existingInstance;
    }

    let scraper: IScraper;

    switch (resolvedType) {
      case 'playwright':
        scraper = await this.createPlaywrightScraper(config);
        break;
      case 'cheerio':
        scraper = this.createCheerioScraper(config);
        break;
      default:
        throw new Error(`Unknown scraper type: ${resolvedType}`);
    }

    if (options?.reuseInstance) {
      this.scraperInstances.set(instanceKey, scraper);
    }

    logger.info(`Created scraper instance`, { 
      type: resolvedType, 
      instanceKey,
      url: config?.url 
    });

    return scraper;
  }

  private detectScraperType(config?: ScrapingConfig): 'playwright' | 'cheerio' {
    if (!config?.url) {
      return this.config.defaultScraperType === 'cheerio' ? 'cheerio' : 'playwright';
    }

    const url = config.url.toLowerCase();
    const domain = this.extractDomain(url);

    // Check if explicit scraper type is specified in options
    if (config.options?.waitFor && 
        !['load', 'domcontentloaded', 'networkidle'].includes(config.options.waitFor)) {
      // Custom wait selector implies JavaScript is needed
      return 'playwright';
    }

    // Check for JavaScript requirements
    if (this.matchesPatterns(url, domain, this.defaultRules.requiresJavaScript) ||
        this.matchesPatterns(url, domain, this.defaultRules.socialMedia)) {
      logger.debug(`URL requires JavaScript execution: ${url}`);
      return 'playwright';
    }

    // Check for static-friendly sites
    if (this.matchesPatterns(url, domain, this.defaultRules.staticFriendly)) {
      logger.debug(`URL is static-friendly: ${url}`);
      return 'cheerio';
    }

    // Check for e-commerce sites (usually need JS for dynamic content)
    if (this.matchesPatterns(url, domain, this.defaultRules.ecommerceSites)) {
      logger.debug(`E-commerce site detected, using Playwright: ${url}`);
      return 'playwright';
    }

    // Check for job boards (often have dynamic loading)
    if (this.matchesPatterns(url, domain, this.defaultRules.jobBoards)) {
      logger.debug(`Job board detected, using Playwright: ${url}`);
      return 'playwright';
    }

    // Check for news sites (usually static-friendly)
    if (this.matchesPatterns(url, domain, this.defaultRules.newsSites)) {
      logger.debug(`News site detected, using Cheerio: ${url}`);
      return 'cheerio';
    }

    // Analyze URL patterns for hints
    if (this.hasJavaScriptIndicators(url)) {
      logger.debug(`JavaScript indicators found in URL: ${url}`);
      return 'playwright';
    }

    // Default fallback based on configuration
    const defaultType = this.config.defaultScraperType === 'cheerio' ? 'cheerio' : 'playwright';
    logger.debug(`Using default scraper type for URL: ${url}`, { defaultType });
    
    return defaultType;
  }

  private matchesPatterns(url: string, domain: string, patterns: string[]): boolean {
    return patterns.some(pattern => 
      url.includes(pattern.toLowerCase()) || 
      domain.includes(pattern.toLowerCase())
    );
  }

  private hasJavaScriptIndicators(url: string): boolean {
    const jsIndicators = [
      '#/', // Hash routing
      '?state=', // State parameters
      'app/', 'dashboard/', 'admin/',
      'search?', 'filter?', 'sort?'
    ];

    return jsIndicators.some(indicator => url.includes(indicator));
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  private async createPlaywrightScraper(config?: ScrapingConfig): Promise<PlaywrightScraper> {
    const playwrightConfig: PlaywrightScraperConfig = {
      browserType: 'chromium',
      headless: true,
      enableStealth: true,
      enableRateLimiting: true,
      maxConcurrentTabs: 3,
      defaultTimeout: 30000,
      enableScreenshots: false,
      ...this.config.playwrightConfig
    };

    // Enable stealth mode for sites that require it
    if (config?.url && this.requiresStealth(config.url)) {
      playwrightConfig.enableStealth = true;
      logger.debug(`Stealth mode enabled for URL: ${config.url}`);
    }

    const scraper = new PlaywrightScraper(playwrightConfig, this.config.stealthConfig);
    await scraper.initialize();
    return scraper;
  }

  private createCheerioScraper(config?: ScrapingConfig): CheerioScraper {
    const cheerioConfig: CheerioScraperConfig = {
      timeout: 15000,
      maxRedirects: 5,
      enableCompression: true,
      enableCookies: true,
      userAgentRotation: true,
      proxyRotation: false,
      retryOnFailure: true,
      maxRetries: 3,
      retryDelay: 1000,
      ...this.config.cheerioConfig
    };

    // Enable proxy rotation for sites that require it
    if (config?.url && this.requiresStealth(config.url) && this.config.proxies) {
      cheerioConfig.proxyRotation = true;
    }

    return new CheerioScraper(cheerioConfig, this.config.proxies);
  }

  private requiresStealth(url: string): boolean {
    const domain = this.extractDomain(url.toLowerCase());
    return this.matchesPatterns(url, domain, this.defaultRules.requiresStealth);
  }

  // Specialized factory methods for different use cases
  async createEcommerceScraper(): Promise<IScraper> {
    return this.createScraper('playwright', {
      url: 'https://example-ecommerce.com',
      options: {
        headless: true,
        timeout: 30000,
        waitFor: 'networkidle',
        useRandomUserAgent: true,
        stealth: true,
        humanLikeDelay: true
      }
    });
  }

  async createNewsScraper(): Promise<IScraper> {
    return this.createScraper('cheerio', {
      url: 'https://example-news.com',
      options: {
        timeout: 10000,
        cleanData: true,
        extractLinks: true
      }
    });
  }

  async createJobScraper(): Promise<IScraper> {
    return this.createScraper('playwright', {
      url: 'https://example-jobs.com',
      options: {
        headless: true,
        timeout: 25000,
        waitFor: 'load',
        followPagination: true,
        maxPages: 5
      }
    });
  }

  async createLeadScraper(): Promise<IScraper> {
    return this.createScraper('playwright', {
      url: 'https://example-directory.com',
      options: {
        headless: true,
        timeout: 20000,
        useRandomUserAgent: true,
        stealth: true,
        humanLikeDelay: true,
        maxConcurrent: 1 // Be extra careful with lead generation
      }
    });
  }

  // Instance management
  async disposeScraper(instanceKey: string): Promise<void> {
    const scraper = this.scraperInstances.get(instanceKey);
    if (scraper) {
      await scraper.dispose();
      this.scraperInstances.delete(instanceKey);
      logger.info(`Disposed scraper instance: ${instanceKey}`);
    }
  }

  async disposeAllScrapers(): Promise<void> {
    const disposePromises = Array.from(this.scraperInstances.entries()).map(
      async ([key, scraper]) => {
        try {
          await scraper.dispose();
          logger.info(`Disposed scraper instance: ${key}`);
        } catch (error) {
          logger.warn(`Error disposing scraper instance: ${key}`, { 
            error: (error as Error).message 
          });
        }
      }
    );

    await Promise.all(disposePromises);
    this.scraperInstances.clear();
    logger.info('All scraper instances disposed');
  }

  // Statistics and monitoring
  getActiveScrapers(): Array<{ key: string; type: string; stats: any }> {
    return Array.from(this.scraperInstances.entries()).map(([key, scraper]) => ({
      key,
      type: scraper.constructor.name,
      stats: scraper.getStats()
    }));
  }

  getDetectionRules(): AutoDetectionRules {
    return { ...this.defaultRules };
  }

  updateDetectionRules(rules: Partial<AutoDetectionRules>): void {
    this.mergeDetectionRules(rules);
    logger.info('Detection rules updated', { rules });
  }

  // Utility methods
  static recommendScraperType(url: string): 'playwright' | 'cheerio' {
    const factory = new ScraperFactory();
    return factory.detectScraperType({ url });
  }

  static async createOptimizedScraper(
    url: string, 
    options?: { 
      prioritizeSpeed?: boolean; 
      requireStealth?: boolean;
      enableJavaScript?: boolean;
    }
  ): Promise<IScraper> {
    const factory = ScraperFactory.getInstance();
    
    let scraperType: ScraperType = 'auto';
    
    if (options?.prioritizeSpeed && !options?.enableJavaScript) {
      scraperType = 'cheerio';
    } else if (options?.enableJavaScript || options?.requireStealth) {
      scraperType = 'playwright';
    }

    return factory.createScraper(scraperType, { 
      url,
      options: {
        stealth: options?.requireStealth,
        headless: !options?.requireStealth // Show browser if stealth is not needed
      }
    });
  }
}

// Export singleton instance
export const scraperFactory = ScraperFactory.getInstance();
export default ScraperFactory;