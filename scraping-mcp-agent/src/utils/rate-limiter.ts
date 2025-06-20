/**
 * Advanced rate limiting and queue management for web scraping
 */

import PQueue from 'p-queue';
import type { RateLimitConfig } from '@/types/scraping-types.js';
import logger from './logger.js';

export interface QueuedTask<T = any> {
  id: string;
  url: string;
  task: () => Promise<T>;
  priority?: number;
  retries?: number;
  maxRetries?: number;
  timeout?: number;
  metadata?: Record<string, any>;
}

export interface RateLimitStatus {
  queueSize: number;
  pendingRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageWaitTime: number;
  lastRequestTime: Date | null;
  isRateLimited: boolean;
  estimatedTimeToComplete: number;
}

export class RateLimiter {
  private queue: PQueue;
  private requestTimes: number[] = [];
  private completedRequests = 0;
  private failedRequests = 0;
  private totalWaitTime = 0;
  private lastRequestTime: Date | null = null;
  private rateLimitedUntil: Date | null = null;
  private domainLimits: Map<string, { lastRequest: Date; requestCount: number }> = new Map();

  constructor(private config: RateLimitConfig) {
    this.queue = new PQueue({
      concurrency: config.maxConcurrent,
      interval: config.timeWindow,
      intervalCap: config.burstLimit,
      timeout: 30000, // 30 second default timeout
      throwOnTimeout: true
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.queue.on('add', () => {
      logger.debug(`Task added to queue. Queue size: ${this.queue.size}`);
    });

    this.queue.on('next', () => {
      this.lastRequestTime = new Date();
      logger.debug(`Task started. Pending: ${this.queue.pending}, Queue: ${this.queue.size}`);
    });

    this.queue.on('completed', (result) => {
      this.completedRequests++;
      logger.debug(`Task completed. Total completed: ${this.completedRequests}`);
    });

    this.queue.on('error', (error) => {
      this.failedRequests++;
      logger.error('Queue task failed', error);
    });
  }

  async addTask<T>(task: QueuedTask<T>): Promise<T> {
    const startTime = Date.now();
    
    // Check domain-specific rate limits
    await this.checkDomainRateLimit(task.url);
    
    // Check if we're currently rate limited
    if (this.rateLimitedUntil && new Date() < this.rateLimitedUntil) {
      const waitTime = this.rateLimitedUntil.getTime() - Date.now();
      logger.warn(`Rate limited. Waiting ${waitTime}ms before processing task`, {
        taskId: task.id,
        url: task.url,
        waitTime
      });
      await this.sleep(waitTime);
    }

    const wrappedTask = async (): Promise<T> => {
      try {
        // Apply artificial delay if configured
        if (this.config.delayMs > 0) {
          await this.sleep(this.config.delayMs);
        }

        // Record request timing
        const requestStart = Date.now();
        const result = await this.executeWithRetry(task);
        const requestEnd = Date.now();
        
        this.recordRequestTime(requestEnd - requestStart);
        this.updateDomainLimit(task.url);
        
        return result;
      } catch (error) {
        // Handle rate limiting detection
        if (this.isRateLimitError(error)) {
          await this.handleRateLimit(task.url);
          throw error;
        }
        throw error;
      }
    };

    const queueOptions = {
      priority: task.priority || 0
    };

    try {
      const result = await this.queue.add(wrappedTask, queueOptions);
      const totalTime = Date.now() - startTime;
      this.totalWaitTime += totalTime;
      return result;
    } catch (error) {
      logger.error(`Task failed after all retries`, error, {
        taskId: task.id,
        url: task.url
      });
      throw error;
    }
  }

  private async executeWithRetry<T>(task: QueuedTask<T>): Promise<T> {
    const maxRetries = task.maxRetries || 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff for retries
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          logger.info(`Retrying task (attempt ${attempt}/${maxRetries})`, {
            taskId: task.id,
            url: task.url,
            delay
          });
          await this.sleep(delay);
        }

        const result = await task.task();
        if (attempt > 0) {
          logger.info(`Task succeeded on retry`, {
            taskId: task.id,
            url: task.url,
            attempt
          });
        }
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          break;
        }
      }
    }

    throw lastError;
  }

  private async checkDomainRateLimit(url: string): Promise<void> {
    const domain = this.extractDomain(url);
    const domainLimit = this.domainLimits.get(domain);
    
    if (domainLimit) {
      const timeSinceLastRequest = Date.now() - domainLimit.lastRequest.getTime();
      const minInterval = this.config.delayMs * 2; // 2x the base delay for same domain
      
      if (timeSinceLastRequest < minInterval) {
        const waitTime = minInterval - timeSinceLastRequest;
        logger.debug(`Domain rate limit active for ${domain}. Waiting ${waitTime}ms`);
        await this.sleep(waitTime);
      }
    }
  }

  private updateDomainLimit(url: string): void {
    const domain = this.extractDomain(url);
    const current = this.domainLimits.get(domain) || { lastRequest: new Date(0), requestCount: 0 };
    
    this.domainLimits.set(domain, {
      lastRequest: new Date(),
      requestCount: current.requestCount + 1
    });
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  private recordRequestTime(duration: number): void {
    this.requestTimes.push(duration);
    // Keep only last 100 request times
    if (this.requestTimes.length > 100) {
      this.requestTimes.shift();
    }
  }

  private isRateLimitError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message?.toLowerCase() || '';
    const statusCode = error.status || error.statusCode;
    
    return (
      statusCode === 429 || 
      statusCode === 503 ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests') ||
      errorMessage.includes('temporarily blocked')
    );
  }

  private isNonRetryableError(error: any): boolean {
    const statusCode = error.status || error.statusCode;
    return statusCode === 404 || statusCode === 401 || statusCode === 403;
  }

  private async handleRateLimit(url: string): Promise<void> {
    const backoffTime = this.calculateBackoffTime();
    this.rateLimitedUntil = new Date(Date.now() + backoffTime);
    
    logger.warn(`Rate limit detected for ${url}. Backing off for ${backoffTime}ms`, {
      url,
      backoffTime,
      rateLimitedUntil: this.rateLimitedUntil
    });
  }

  private calculateBackoffTime(): number {
    // Progressive backoff: start with 1 minute, increase exponentially
    const baseBackoff = 60000; // 1 minute
    const failureRate = this.failedRequests / Math.max(this.completedRequests + this.failedRequests, 1);
    const multiplier = Math.min(Math.pow(2, Math.floor(failureRate * 10)), 16);
    
    return baseBackoff * multiplier + (Math.random() * 10000); // Add jitter
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public methods for queue management
  async pause(): Promise<void> {
    this.queue.pause();
    logger.info('Rate limiter paused');
  }

  start(): void {
    this.queue.start();
    logger.info('Rate limiter started');
  }

  clear(): void {
    this.queue.clear();
    logger.info('Rate limiter queue cleared');
  }

  async onEmpty(): Promise<void> {
    return this.queue.onEmpty();
  }

  async onIdle(): Promise<void> {
    return this.queue.onIdle();
  }

  getStatus(): RateLimitStatus {
    const averageWaitTime = this.totalWaitTime / Math.max(this.completedRequests, 1);
    const averageRequestTime = this.requestTimes.length > 0 
      ? this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length 
      : 0;
    
    const estimatedTimeToComplete = this.queue.size * (averageRequestTime + this.config.delayMs);

    return {
      queueSize: this.queue.size,
      pendingRequests: this.queue.pending,
      completedRequests: this.completedRequests,
      failedRequests: this.failedRequests,
      averageWaitTime: Math.round(averageWaitTime),
      lastRequestTime: this.lastRequestTime,
      isRateLimited: this.rateLimitedUntil ? new Date() < this.rateLimitedUntil : false,
      estimatedTimeToComplete: Math.round(estimatedTimeToComplete)
    };
  }

  getDomainStats(): Array<{ domain: string; requests: number; lastRequest: Date }> {
    return Array.from(this.domainLimits.entries()).map(([domain, data]) => ({
      domain,
      requests: data.requestCount,
      lastRequest: data.lastRequest
    }));
  }

  // Adaptive rate limiting based on success/failure rates
  adjustRateLimit(): void {
    const successRate = this.completedRequests / Math.max(this.completedRequests + this.failedRequests, 1);
    
    if (successRate < 0.8 && this.config.maxConcurrent > 1) {
      // Reduce concurrency if success rate is low
      this.config.maxConcurrent = Math.max(1, this.config.maxConcurrent - 1);
      this.queue.concurrency = this.config.maxConcurrent;
      logger.info(`Reduced concurrency to ${this.config.maxConcurrent} due to low success rate`);
    } else if (successRate > 0.95 && this.config.maxConcurrent < 10) {
      // Increase concurrency if success rate is high
      this.config.maxConcurrent = Math.min(10, this.config.maxConcurrent + 1);
      this.queue.concurrency = this.config.maxConcurrent;
      logger.info(`Increased concurrency to ${this.config.maxConcurrent} due to high success rate`);
    }

    // Adjust delay based on recent response times
    if (this.requestTimes.length > 10) {
      const avgResponseTime = this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length;
      if (avgResponseTime > 5000 && this.config.delayMs < 3000) {
        this.config.delayMs = Math.min(3000, this.config.delayMs + 200);
        logger.info(`Increased delay to ${this.config.delayMs}ms due to slow responses`);
      } else if (avgResponseTime < 1000 && this.config.delayMs > 500) {
        this.config.delayMs = Math.max(500, this.config.delayMs - 100);
        logger.info(`Decreased delay to ${this.config.delayMs}ms due to fast responses`);
      }
    }
  }

  // Create optimized rate limiter for different use cases
  static createForEcommerce(): RateLimiter {
    return new RateLimiter({
      maxConcurrent: 2,
      delayMs: 2000,
      burstLimit: 5,
      timeWindow: 60000 // 1 minute
    });
  }

  static createForNews(): RateLimiter {
    return new RateLimiter({
      maxConcurrent: 3,
      delayMs: 1000,
      burstLimit: 10,
      timeWindow: 60000
    });
  }

  static createForJobs(): RateLimiter {
    return new RateLimiter({
      maxConcurrent: 4,
      delayMs: 1500,
      burstLimit: 8,
      timeWindow: 60000
    });
  }

  static createForLeads(): RateLimiter {
    return new RateLimiter({
      maxConcurrent: 1,
      delayMs: 3000,
      burstLimit: 3,
      timeWindow: 60000
    });
  }
}

export default RateLimiter;