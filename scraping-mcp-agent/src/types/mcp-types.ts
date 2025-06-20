/**
 * MCP-specific types for the scraping agent
 */

import { z } from 'zod';
import type { ScrapingConfig, ScrapingResult, EcommerceProduct, JobListing, NewsArticle, LeadContact } from './scraping-types.js';

// MCP Tool Schemas
export const ScrapeUrlSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  selectors: z.record(z.string()).optional(),
  options: z.object({
    headless: z.boolean().optional().default(true),
    timeout: z.number().min(1000).max(60000).optional().default(30000),
    waitFor: z.enum(['load', 'domcontentloaded', 'networkidle']).optional().default('load'),
    useRandomUserAgent: z.boolean().optional().default(true),
    useProxy: z.boolean().optional().default(false),
    humanLikeDelay: z.boolean().optional().default(true),
    stealth: z.boolean().optional().default(true),
    extractImages: z.boolean().optional().default(false),
    extractLinks: z.boolean().optional().default(false),
    cleanData: z.boolean().optional().default(true),
    maxConcurrent: z.number().min(1).max(10).optional().default(3),
    retryAttempts: z.number().min(0).max(5).optional().default(2)
  }).optional()
});

export const BatchScrapeSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(50),
  selectors: z.record(z.string()).optional(),
  options: z.object({
    headless: z.boolean().optional().default(true),
    timeout: z.number().min(1000).max(60000).optional().default(30000),
    waitFor: z.enum(['load', 'domcontentloaded', 'networkidle']).optional().default('load'),
    useRandomUserAgent: z.boolean().optional().default(true),
    maxConcurrent: z.number().min(1).max(5).optional().default(2),
    delayBetweenRequests: z.number().min(0).max(10000).optional().default(1000),
    retryAttempts: z.number().min(0).max(3).optional().default(1)
  }).optional()
});

export const ScrapeEcommerceSchema = z.object({
  url: z.string().url('Must be a valid e-commerce URL'),
  extractReviews: z.boolean().optional().default(false),
  extractVariants: z.boolean().optional().default(false),
  extractRelated: z.boolean().optional().default(false),
  options: z.object({
    headless: z.boolean().optional().default(true),
    timeout: z.number().min(5000).max(60000).optional().default(30000),
    waitFor: z.enum(['load', 'domcontentloaded', 'networkidle']).optional().default('networkidle'),
    stealth: z.boolean().optional().default(true),
    humanLikeDelay: z.boolean().optional().default(true)
  }).optional()
});

export const ScrapeJobsSchema = z.object({
  url: z.string().url('Must be a valid job board URL'),
  filters: z.object({
    location: z.string().optional(),
    jobType: z.enum(['full-time', 'part-time', 'contract', 'internship']).optional(),
    remote: z.boolean().optional(),
    salaryMin: z.number().optional(),
    experience: z.string().optional()
  }).optional(),
  maxResults: z.number().min(1).max(100).optional().default(20),
  options: z.object({
    followPagination: z.boolean().optional().default(true),
    maxPages: z.number().min(1).max(10).optional().default(3),
    extractDescription: z.boolean().optional().default(true)
  }).optional()
});

export const ScrapeNewsSchema = z.object({
  url: z.string().url('Must be a valid news URL'),
  category: z.string().optional(),
  dateRange: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional()
  }).optional(),
  maxArticles: z.number().min(1).max(50).optional().default(10),
  options: z.object({
    extractContent: z.boolean().optional().default(true),
    extractSummary: z.boolean().optional().default(false),
    followPagination: z.boolean().optional().default(false)
  }).optional()
});

export const ScrapeLeadsSchema = z.object({
  url: z.string().url('Must be a valid business directory URL'),
  criteria: z.object({
    industry: z.string().optional(),
    location: z.string().optional(),
    companySize: z.string().optional(),
    keywords: z.array(z.string()).optional()
  }).optional(),
  contactTypes: z.array(z.enum(['email', 'phone', 'linkedin', 'website'])).optional(),
  maxResults: z.number().min(1).max(200).optional().default(50),
  options: z.object({
    validateEmails: z.boolean().optional().default(false),
    followPagination: z.boolean().optional().default(true),
    maxPages: z.number().min(1).max(20).optional().default(5)
  }).optional()
});

export const MonitorUrlSchema = z.object({
  url: z.string().url('Must be a valid URL to monitor'),
  interval: z.number().min(60).max(86400).describe('Monitoring interval in seconds (1 min to 24 hours)'),
  selectors: z.record(z.string()).optional(),
  alertThreshold: z.number().min(0).max(100).optional().describe('Percentage change to trigger alert'),
  webhook: z.string().url().optional().describe('Webhook URL for notifications'),
  options: z.object({
    compareMode: z.enum(['content', 'structure', 'specific-elements']).optional().default('content'),
    ignoreWhitespace: z.boolean().optional().default(true),
    maxHistory: z.number().min(1).max(100).optional().default(10)
  }).optional()
});

// Response types for MCP tools
export interface MCPScrapeResponse {
  success: boolean;
  data: any;
  metadata: {
    url: string;
    timestamp: string;
    responseTime: number;
    userAgent: string;
  };
  error?: string;
}

export interface MCPBatchScrapeResponse {
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
  };
}

export interface MCPEcommerceResponse {
  success: boolean;
  product?: EcommerceProduct;
  reviews?: Array<{
    rating: number;
    text: string;
    author?: string;
    date?: string;
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

export interface MCPJobsResponse {
  success: boolean;
  jobs: JobListing[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
  };
  filters?: Record<string, any>;
  error?: string;
}

export interface MCPNewsResponse {
  success: boolean;
  articles: NewsArticle[];
  category?: string;
  dateRange?: {
    from: string;
    to: string;
  };
  error?: string;
}

export interface MCPLeadsResponse {
  success: boolean;
  leads: LeadContact[];
  criteria?: Record<string, any>;
  pagination?: {
    currentPage: number;
    totalResults: number;
    hasNext: boolean;
  };
  error?: string;
}

export interface MCPMonitorResponse {
  success: boolean;
  monitorId: string;
  status: 'active' | 'paused' | 'stopped';
  nextCheck: string;
  lastChange?: {
    timestamp: string;
    changeType: string;
    details: string;
  };
  error?: string;
}

// Tool definitions for MCP server
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  handler: (params: any) => Promise<any>;
}

export interface MCPServerConfig {
  name: string;
  version: string;
  tools: MCPToolDefinition[];
  maxConcurrentRequests?: number;
  timeout?: number;
  enableLogging?: boolean;
  enableMetrics?: boolean;
}

// Exported schema types for external use
export type ScrapeUrlParams = z.infer<typeof ScrapeUrlSchema>;
export type BatchScrapeParams = z.infer<typeof BatchScrapeSchema>;
export type ScrapeEcommerceParams = z.infer<typeof ScrapeEcommerceSchema>;
export type ScrapeJobsParams = z.infer<typeof ScrapeJobsSchema>;
export type ScrapeNewsParams = z.infer<typeof ScrapeNewsSchema>;
export type ScrapeLeadsParams = z.infer<typeof ScrapeLeadsSchema>;
export type MonitorUrlParams = z.infer<typeof MonitorUrlSchema>;

// Error types
export class MCPScrapingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'MCPScrapingError';
  }
}

export class ValidationError extends MCPScrapingError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class ScrapingTimeoutError extends MCPScrapingError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'TIMEOUT_ERROR', details);
    this.name = 'ScrapingTimeoutError';
  }
}

export class RateLimitError extends MCPScrapingError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'RATE_LIMIT_ERROR', details);
    this.name = 'RateLimitError';
  }
}