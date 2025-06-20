/**
 * Core scraping types and interfaces
 */

export interface ScrapingConfig {
  url: string;
  selectors?: Record<string, string>;
  options?: ScrapingOptions;
  metadata?: Record<string, any>;
}

export interface ScrapingOptions {
  // Browser options
  headless?: boolean;
  timeout?: number;
  waitFor?: 'load' | 'domcontentloaded' | 'networkidle' | string;
  viewport?: { width: number; height: number };
  
  // Anti-detection
  useRandomUserAgent?: boolean;
  useProxy?: boolean;
  proxyUrl?: string;
  humanLikeDelay?: boolean;
  stealth?: boolean;
  
  // Rate limiting
  maxConcurrent?: number;
  delayBetweenRequests?: number;
  retryAttempts?: number;
  
  // Data extraction
  extractImages?: boolean;
  extractLinks?: boolean;
  followPagination?: boolean;
  maxPages?: number;
  
  // Output format
  format?: 'json' | 'csv' | 'xml';
  includeMetadata?: boolean;
  cleanData?: boolean;
}

export interface ScrapingResult {
  url: string;
  data: Record<string, any> | Record<string, any>[];
  metadata: ScrapingMetadata;
  success: boolean;
  error?: string;
  timestamp: Date;
}

export interface ScrapingMetadata {
  title?: string;
  description?: string;
  responseTime: number;
  statusCode: number;
  finalUrl: string;
  userAgent: string;
  timestamp: Date;
  extractedCount: number;
  pagesProcessed?: number;
  totalSize?: number;
}

export interface ScrapingJob {
  id: string;
  urls: string[];
  config: ScrapingConfig;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  results: ScrapingResult[];
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export interface ProxyConfig {
  type: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
  country?: string;
}

export interface RateLimitConfig {
  maxConcurrent: number;
  delayMs: number;
  burstLimit: number;
  timeWindow: number;
}

export interface ScraperStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  bytesDownloaded: number;
  pagesScraped: number;
  errorsCount: Record<string, number>;
  lastUpdated: Date;
}

// Specialized data types for different domains
export interface EcommerceProduct {
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
}

export interface JobListing {
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
}

export interface NewsArticle {
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
}

export interface LeadContact {
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
}

// Event types for scraping lifecycle
export type ScrapingEvent = 
  | { type: 'started'; jobId: string; timestamp: Date }
  | { type: 'progress'; jobId: string; progress: number; timestamp: Date }
  | { type: 'page_scraped'; jobId: string; url: string; timestamp: Date }
  | { type: 'error'; jobId: string; error: string; timestamp: Date }
  | { type: 'completed'; jobId: string; results: ScrapingResult[]; timestamp: Date };

export interface ScrapingEventListener {
  onEvent(event: ScrapingEvent): void | Promise<void>;
}

// Scraper interface that all scrapers must implement
export interface IScraper {
  scrape(config: ScrapingConfig): Promise<ScrapingResult>;
  batchScrape(configs: ScrapingConfig[]): Promise<ScrapingResult[]>;
  getStats(): ScraperStats;
  dispose(): Promise<void>;
}

// Validation schemas
export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'date';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customValidator?: (value: any) => boolean;
}

export interface DataValidationConfig {
  rules: ValidationRule[];
  strictMode?: boolean;
  removeInvalid?: boolean;
}