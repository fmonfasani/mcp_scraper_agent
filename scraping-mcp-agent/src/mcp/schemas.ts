/**
 * Zod schemas for MCP tool validation
 */

import { z } from 'zod';

// Base schemas
export const UrlSchema = z.string().url('Must be a valid URL');

export const ScrapingOptionsSchema = z.object({
  headless: z.boolean().optional().default(true),
  timeout: z.number().min(1000).max(120000).optional().default(30000),
  waitFor: z.enum(['load', 'domcontentloaded', 'networkidle']).optional().default('load'),
  useRandomUserAgent: z.boolean().optional().default(true),
  useProxy: z.boolean().optional().default(false),
  humanLikeDelay: z.boolean().optional().default(true),
  stealth: z.boolean().optional().default(true),
  extractImages: z.boolean().optional().default(false),
  extractLinks: z.boolean().optional().default(false),
  cleanData: z.boolean().optional().default(true),
  maxConcurrent: z.number().min(1).max(10).optional().default(3),
  retryAttempts: z.number().min(0).max(5).optional().default(2),
  delayBetweenRequests: z.number().min(0).max(30000).optional().default(1000)
}).strict();

// Basic scraping schemas
export const ScrapeUrlSchema = z.object({
  url: UrlSchema,
  selectors: z.record(z.string()).optional(),
  options: ScrapingOptionsSchema.optional()
}).strict();

export const BatchScrapeSchema = z.object({
  urls: z.array(UrlSchema).min(1).max(50),
  selectors: z.record(z.string()).optional(),
  options: ScrapingOptionsSchema.extend({
    maxConcurrent: z.number().min(1).max(5).optional().default(2)
  }).optional()
}).strict();

// E-commerce schemas
export const ScrapeEcommerceSchema = z.object({
  url: UrlSchema,
  extractReviews: z.boolean().optional().default(false),
  extractVariants: z.boolean().optional().default(false),
  extractRelated: z.boolean().optional().default(false),
  extractPriceHistory: z.boolean().optional().default(false),
  extractShippingInfo: z.boolean().optional().default(false),
  extractSpecifications: z.boolean().optional().default(false),
  maxReviews: z.number().min(1).max(200).optional().default(50),
  maxVariants: z.number().min(1).max(50).optional().default(20),
  maxRelatedProducts: z.number().min(1).max(50).optional().default(10),
  options: ScrapingOptionsSchema.extend({
    waitFor: z.enum(['load', 'domcontentloaded', 'networkidle']).optional().default('networkidle'),
    timeout: z.number().min(5000).max(120000).optional().default(45000)
  }).optional()
}).strict();

// Jobs schemas
export const JobFiltersSchema = z.object({
  location: z.string().optional(),
  jobType: z.enum(['full-time', 'part-time', 'contract', 'internship', 'temporary']).optional(),
  remote: z.boolean().optional(),
  salaryMin: z.number().min(0).optional(),
  salaryMax: z.number().min(0).optional(),
  experienceLevel: z.enum(['entry', 'mid', 'senior', 'executive']).optional(),
  datePosted: z.enum(['today', 'week', 'month', 'any']).optional(),
  companySize: z.enum(['startup', 'small', 'medium', 'large']).optional(),
  industry: z.string().optional(),
  keywords: z.array(z.string()).optional()
}).strict();

export const ScrapeJobsSchema = z.object({
  url: UrlSchema,
  extractDescription: z.boolean().optional().default(true),
  extractRequirements: z.boolean().optional().default(true),
  extractBenefits: z.boolean().optional().default(false),
  extractCompanyInfo: z.boolean().optional().default(false),
  extractSalaryDetails: z.boolean().optional().default(true),
  followPagination: z.boolean().optional().default(true),
  maxPages: z.number().min(1).max(20).optional().default(5),
  maxJobsPerPage: z.number().min(1).max(100).optional().default(50),
  filters: JobFiltersSchema.optional(),
  options: ScrapingOptionsSchema.extend({
    waitFor: z.enum(['load', 'domcontentloaded', 'networkidle']).optional().default('load'),
    timeout: z.number().min(10000).max(120000).optional().default(30000)
  }).optional()
}).strict();

// News schemas
export const ScrapeNewsSchema = z.object({
  url: UrlSchema,
  extractContent: z.boolean().optional().default(true),
  extractSummary: z.boolean().optional().default(false),
  extractAuthor: z.boolean().optional().default(true),
  extractTags: z.boolean().optional().default(true),
  extractComments: z.boolean().optional().default(false),
  extractRelatedArticles: z.boolean().optional().default(false),
  followPagination: z.boolean().optional().default(false),
  maxPages: z.number().min(1).max(10).optional().default(3),
  maxArticlesPerPage: z.number().min(1).max(100).optional().default(20),
  dateRange: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional()
  }).optional(),
  categories: z.array(z.string()).optional(),
  contentMinLength: z.number().min(50).optional(),
  options: ScrapingOptionsSchema.extend({
    waitFor: z.enum(['load', 'domcontentloaded', 'networkidle']).optional().default('load'),
    timeout: z.number().min(5000).max(60000).optional().default(20000)
  }).optional()
}).strict();

// Leads schemas
export const LeadCriteriaSchema = z.object({
  industry: z.string().optional(),
  location: z.string().optional(),
  companySize: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
  jobTitles: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  excludeKeywords: z.array(z.string()).optional(),
  minEmployees: z.number().min(1).optional(),
  maxEmployees: z.number().min(1).optional(),
  revenue: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
    currency: z.string().optional().default('USD')
  }).optional(),
  fundingStage: z.enum(['seed', 'series-a', 'series-b', 'series-c', 'ipo', 'acquired']).optional()
}).strict();

export const ScrapeLeadsSchema = z.object({
  url: UrlSchema,
  extractEmails: z.boolean().optional().default(true),
  extractPhones: z.boolean().optional().default(false),
  extractSocialMedia: z.boolean().optional().default(true),
  extractCompanyInfo: z.boolean().optional().default(false),
  validateContacts: z.boolean().optional().default(false),
  followPagination: z.boolean().optional().default(true),
  maxPages: z.number().min(1).max(10).optional().default(3),
  maxLeadsPerPage: z.number().min(1).max(200).optional().default(50),
  criteria: LeadCriteriaSchema.optional(),
  contactTypes: z.array(z.enum(['email', 'phone', 'linkedin', 'website'])).optional(),
  industryFocus: z.array(z.string()).optional(),
  locationFilter: z.array(z.string()).optional(),
  options: ScrapingOptionsSchema.extend({
    waitFor: z.enum(['load', 'domcontentloaded', 'networkidle']).optional().default('networkidle'),
    timeout: z.number().min(10000).max(120000).optional().default(30000),
    maxConcurrent: z.number().min(1).max(3).optional().default(1),
    delayBetweenRequests: z.number().min(2000).max(30000).optional().default(5000)
  }).optional()
}).strict();

// Monitoring schemas
export const MonitorUrlSchema = z.object({
  url: UrlSchema,
  interval: z.number().min(60).max(86400).describe('Monitoring interval in seconds (1 min to 24 hours)'),
  selectors: z.record(z.string()).optional(),
  alertThreshold: z.number().min(0).max(100).optional().default(10).describe('Percentage change to trigger alert'),
  webhook: z.string().url().optional().describe('Webhook URL for notifications'),
  emailAlert: z.string().email().optional().describe('Email for notifications'),
  options: z.object({
    compareMode: z.enum(['content', 'structure', 'specific-elements']).optional().default('content'),
    ignoreWhitespace: z.boolean().optional().default(true),
    ignoreImages: z.boolean().optional().default(true),
    maxHistory: z.number().min(1).max(100).optional().default(10),
    sensitivity: z.enum(['low', 'medium', 'high']).optional().default('medium')
  }).optional()
}).strict();

// Competitive intelligence schemas
export const CompetitorAnalysisSchema = z.object({
  urls: z.array(UrlSchema).min(1).max(10),
  analysisType: z.enum(['pricing', 'features', 'content', 'seo', 'social']).optional().default('pricing'),
  extractPricing: z.boolean().optional().default(true),
  extractFeatures: z.boolean().optional().default(true),
  extractContent: z.boolean().optional().default(false),
  extractSEOData: z.boolean().optional().default(false),
  extractSocialMetrics: z.boolean().optional().default(false),
  compareAgainst: UrlSchema.optional().describe('Base URL to compare against'),
  options: ScrapingOptionsSchema.extend({
    timeout: z.number().min(10000).max(120000).optional().default(45000)
  }).optional()
}).strict();

// Bulk processing schemas
export const BulkProcessingSchema = z.object({
  urls: z.array(UrlSchema).min(1).max(1000),
  processingType: z.enum(['ecommerce', 'jobs', 'news', 'leads', 'general']),
  batchSize: z.number().min(1).max(50).optional().default(10),
  concurrency: z.number().min(1).max(5).optional().default(2),
  delayBetweenBatches: z.number().min(1000).max(60000).optional().default(5000),
  exportFormat: z.enum(['json', 'csv', 'xlsx']).optional().default('json'),
  webhook: z.string().url().optional().describe('Webhook for progress updates'),
  options: ScrapingOptionsSchema.optional()
}).strict();

// Data export schemas
export const ExportDataSchema = z.object({
  jobId: z.string().min(1),
  format: z.enum(['json', 'csv', 'xlsx', 'xml']).optional().default('json'),
  filters: z.object({
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    successOnly: z.boolean().optional().default(false),
    minDataCount: z.number().min(0).optional()
  }).optional(),
  includeMetadata: z.boolean().optional().default(true),
  compression: z.boolean().optional().default(false)
}).strict();

// Performance analytics schemas
export const PerformanceAnalyticsSchema = z.object({
  timeRange: z.enum(['hour', 'day', 'week', 'month']).optional().default('day'),
  metrics: z.array(z.enum(['requests', 'success_rate', 'response_time', 'errors', 'data_quality'])).optional(),
  groupBy: z.enum(['url', 'site_type', 'scraper_type', 'hour', 'day']).optional(),
  includeDetails: z.boolean().optional().default(false)
}).strict();

// Proxy management schemas
export const ProxyConfigSchema = z.object({
  type: z.enum(['http', 'https', 'socks4', 'socks5']),
  host: z.string().min(1),
  port: z.number().min(1).max(65535),
  username: z.string().optional(),
  password: z.string().optional(),
  country: z.string().optional(),
  enabled: z.boolean().optional().default(true)
}).strict();

export const ProxyManagementSchema = z.object({
  action: z.enum(['add', 'remove', 'test', 'rotate', 'list']),
  proxy: ProxyConfigSchema.optional(),
  proxyId: z.string().optional(),
  testUrl: z.string().url().optional().default('https://httpbin.org/ip')
}).strict();

// Rate limiting schemas
export const RateLimitConfigSchema = z.object({
  maxConcurrent: z.number().min(1).max(20).optional().default(3),
  delayMs: z.number().min(100).max(30000).optional().default(1000),
  burstLimit: z.number().min(1).max(50).optional().default(10),
  timeWindow: z.number().min(1000).max(3600000).optional().default(60000),
  adaptive: z.boolean().optional().default(true)
}).strict();

// Response schemas for validation
export const ScrapingResultSchema = z.object({
  success: z.boolean(),
  url: z.string(),
  data: z.any(),
  metadata: z.object({
    title: z.string().optional(),
    responseTime: z.number(),
    statusCode: z.number(),
    finalUrl: z.string(),
    userAgent: z.string(),
    timestamp: z.string(),
    extractedCount: z.number(),
    pagesProcessed: z.number().optional(),
    totalSize: z.number().optional()
  }),
  error: z.string().optional()
}).strict();

export const BatchScrapingResultSchema = z.object({
  success: z.boolean(),
  results: z.array(ScrapingResultSchema),
  summary: z.object({
    total: z.number(),
    successful: z.number(),
    failed: z.number(),
    totalTime: z.number(),
    averageResponseTime: z.number()
  }),
  errors: z.array(z.string()).optional()
}).strict();

// Job management schemas
export const JobStatusSchema = z.object({
  jobId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  progress: z.number().min(0).max(100),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  estimatedCompletion: z.string().datetime().optional(),
  results: z.any().optional(),
  error: z.string().optional()
}).strict();

export const JobManagementSchema = z.object({
  action: z.enum(['start', 'pause', 'resume', 'cancel', 'status', 'list']),
  jobId: z.string().optional(),
  filters: z.object({
    status: z.array(z.enum(['pending', 'running', 'completed', 'failed', 'cancelled'])).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional()
  }).optional()
}).strict();

// System status schemas
export const SystemStatusSchema = z.object({
  component: z.enum(['all', 'scrapers', 'proxies', 'rate_limiter', 'storage', 'memory']).optional().default('all'),
  includeMetrics: z.boolean().optional().default(true),
  includeHealth: z.boolean().optional().default(true)
}).strict();

// Custom validation functions
export function validateSelectorObject(selectors: Record<string, string>): boolean {
  if (!selectors || typeof selectors !== 'object') return false;
  
  for (const [key, value] of Object.entries(selectors)) {
    if (!key || typeof key !== 'string' || key.trim() === '') return false;
    if (!value || typeof value !== 'string' || value.trim() === '') return false;
  }
  
  return true;
}

export function validateDateRange(dateRange: { from?: string; to?: string }): boolean {
  if (!dateRange) return true;
  
  const { from, to } = dateRange;
  
  if (from && to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return false;
    if (fromDate > toDate) return false;
  }
  
  return true;
}

export function validateJobFilters(filters: any): boolean {
  if (!filters) return true;
  
  if (filters.salaryMin && filters.salaryMax) {
    if (filters.salaryMin > filters.salaryMax) return false;
  }
  
  if (filters.keywords && !Array.isArray(filters.keywords)) return false;
  
  return true;
}

export function validateLeadCriteria(criteria: any): boolean {
  if (!criteria) return true;
  
  if (criteria.minEmployees && criteria.maxEmployees) {
    if (criteria.minEmployees > criteria.maxEmployees) return false;
  }
  
  if (criteria.revenue?.min && criteria.revenue?.max) {
    if (criteria.revenue.min > criteria.revenue.max) return false;
  }
  
  return true;
}

// Schema type exports for TypeScript
export type ScrapeUrlParams = z.infer<typeof ScrapeUrlSchema>;
export type BatchScrapeParams = z.infer<typeof BatchScrapeSchema>;
export type ScrapeEcommerceParams = z.infer<typeof ScrapeEcommerceSchema>;
export type ScrapeJobsParams = z.infer<typeof ScrapeJobsSchema>;
export type ScrapeNewsParams = z.infer<typeof ScrapeNewsSchema>;
export type ScrapeLeadsParams = z.infer<typeof ScrapeLeadsSchema>;
export type MonitorUrlParams = z.infer<typeof MonitorUrlSchema>;
export type CompetitorAnalysisParams = z.infer<typeof CompetitorAnalysisSchema>;
export type BulkProcessingParams = z.infer<typeof BulkProcessingSchema>;
export type ExportDataParams = z.infer<typeof ExportDataSchema>;
export type PerformanceAnalyticsParams = z.infer<typeof PerformanceAnalyticsSchema>;
export type ProxyManagementParams = z.infer<typeof ProxyManagementSchema>;
export type JobManagementParams = z.infer<typeof JobManagementSchema>;
export type SystemStatusParams = z.infer<typeof SystemStatusSchema>;

// Validation utilities
export class SchemaValidator {
  static validateUrl(url: string): { valid: boolean; error?: string } {
    try {
      UrlSchema.parse(url);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: (error as Error).message };
    }
  }

  static validateSelectors(selectors: any): { valid: boolean; error?: string } {
    if (!validateSelectorObject(selectors)) {
      return { valid: false, error: 'Invalid selector object format' };
    }
    return { valid: true };
  }

  static validateParams<T>(schema: z.ZodSchema<T>, params: any): { valid: boolean; data?: T; error?: string } {
    try {
      const data = schema.parse(params);
      return { valid: true, data };
    } catch (error) {
      return { valid: false, error: (error as Error).message };
    }
  }

  static sanitizeParams<T>(schema: z.ZodSchema<T>, params: any): T {
    return schema.parse(params);
  }
}

export default SchemaValidator;