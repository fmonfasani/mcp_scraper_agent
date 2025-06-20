/**
 * Advanced logging system for the scraping agent
 */

import winston from 'winston';
import path from 'path';

export interface LogContext {
  jobId?: string;
  url?: string;
  userAgent?: string;
  duration?: number;
  statusCode?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ScrapingMetrics {
  requestsPerMinute: number;
  successRate: number;
  averageResponseTime: number;
  errorRate: number;
  topErrors: Array<{ error: string; count: number }>;
  lastUpdated: Date;
}

class ScrapingLogger {
  private logger: winston.Logger;
  private metrics: Map<string, any> = new Map();
  private startTime: Date = new Date();

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta
          });
        })
      ),
      transports: [
        // Console output with colors for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, jobId, url, duration }) => {
              let logLine = `${timestamp} [${level}] ${message}`;
              if (jobId) logLine += ` | Job: ${jobId}`;
              if (url) logLine += ` | URL: ${url}`;
              if (duration) logLine += ` | Duration: ${duration}ms`;
              return logLine;
            })
          )
        }),
        
        // File output for all logs
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'scraping-agent.log'),
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 5,
          tailable: true
        }),
        
        // Separate file for errors
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'errors.log'),
          level: 'error',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 3
        }),
        
        // Performance metrics file
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'metrics.log'),
          level: 'info',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      ],
      
      // Handle uncaught exceptions
      exceptionHandlers: [
        new winston.transports.File({ 
          filename: path.join(process.cwd(), 'logs', 'exceptions.log') 
        })
      ],
      
      // Handle unhandled promise rejections
      rejectionHandlers: [
        new winston.transports.File({ 
          filename: path.join(process.cwd(), 'logs', 'rejections.log') 
        })
      ]
    });

    // Initialize metrics
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.metrics.set('totalRequests', 0);
    this.metrics.set('successfulRequests', 0);
    this.metrics.set('failedRequests', 0);
    this.metrics.set('totalResponseTime', 0);
    this.metrics.set('errors', new Map<string, number>());
    this.metrics.set('requestTimes', []);
  }

  // Main logging methods
  info(message: string, context?: LogContext): void {
    this.logger.info(message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error?.message,
      stack: error?.stack
    };
    this.logger.error(message, errorContext);
    this.recordError(error?.message || message);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context);
  }

  // Specialized scraping log methods
  logScrapingStart(jobId: string, url: string, userAgent?: string): void {
    this.info('Scraping started', {
      jobId,
      url,
      userAgent,
      event: 'scraping_start'
    });
    this.incrementMetric('totalRequests');
  }

  logScrapingSuccess(jobId: string, url: string, duration: number, dataCount: number): void {
    this.info('Scraping completed successfully', {
      jobId,
      url,
      duration,
      dataCount,
      event: 'scraping_success'
    });
    this.incrementMetric('successfulRequests');
    this.recordResponseTime(duration);
  }

  logScrapingError(jobId: string, url: string, error: Error, duration?: number): void {
    this.error('Scraping failed', error, {
      jobId,
      url,
      duration,
      event: 'scraping_error'
    });
    this.incrementMetric('failedRequests');
    if (duration) this.recordResponseTime(duration);
  }

  logRateLimitHit(url: string, waitTime: number): void {
    this.warn('Rate limit hit, waiting', {
      url,
      waitTime,
      event: 'rate_limit'
    });
  }

  logProxyRotation(oldProxy: string, newProxy: string): void {
    this.info('Proxy rotated', {
      oldProxy,
      newProxy,
      event: 'proxy_rotation'
    });
  }

  logBatchProgress(jobId: string, completed: number, total: number): void {
    const progress = Math.round((completed / total) * 100);
    this.info(`Batch progress: ${progress}%`, {
      jobId,
      completed,
      total,
      progress,
      event: 'batch_progress'
    });
  }

  // Performance monitoring
  logPerformanceMetrics(): void {
    const metrics = this.getMetrics();
    this.logger.info('Performance metrics', {
      ...metrics,
      event: 'performance_metrics'
    });
  }

  logMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    this.info('Memory usage', {
      ...memUsage,
      event: 'memory_usage'
    });
  }

  // Anti-detection logging
  logUserAgentRotation(oldUA: string, newUA: string): void {
    this.debug('User agent rotated', {
      oldUserAgent: oldUA,
      newUserAgent: newUA,
      event: 'user_agent_rotation'
    });
  }

  logStealthModeEnabled(url: string): void {
    this.debug('Stealth mode enabled', {
      url,
      event: 'stealth_mode'
    });
  }

  logHumanLikeDelay(delay: number): void {
    this.debug('Human-like delay applied', {
      delay,
      event: 'human_delay'
    });
  }

  // Metrics management
  private incrementMetric(key: string): void {
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);
  }

  private recordResponseTime(duration: number): void {
    const total = this.metrics.get('totalResponseTime') || 0;
    this.metrics.set('totalResponseTime', total + duration);
    
    const times = this.metrics.get('requestTimes') || [];
    times.push(duration);
    if (times.length > 1000) {
      times.shift(); // Keep only last 1000 requests
    }
    this.metrics.set('requestTimes', times);
  }

  private recordError(error: string): void {
    const errors = this.metrics.get('errors') || new Map();
    const count = errors.get(error) || 0;
    errors.set(error, count + 1);
    this.metrics.set('errors', errors);
  }

  getMetrics(): ScrapingMetrics {
    const totalRequests = this.metrics.get('totalRequests') || 0;
    const successfulRequests = this.metrics.get('successfulRequests') || 0;
    const failedRequests = this.metrics.get('failedRequests') || 0;
    const totalResponseTime = this.metrics.get('totalResponseTime') || 0;
    const errors = this.metrics.get('errors') || new Map();
    const requestTimes = this.metrics.get('requestTimes') || [];

    const uptime = Date.now() - this.startTime.getTime();
    const requestsPerMinute = totalRequests > 0 ? (totalRequests / (uptime / 60000)) : 0;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
    const averageResponseTime = successfulRequests > 0 ? totalResponseTime / successfulRequests : 0;

    // Top 5 errors
    const topErrors = Array.from(errors.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }));

    return {
      requestsPerMinute: Math.round(requestsPerMinute * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      topErrors,
      lastUpdated: new Date()
    };
  }

  // Cleanup and export
  async exportLogs(format: 'json' | 'csv' = 'json'): Promise<string> {
    const metrics = this.getMetrics();
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics,
      uptime: Date.now() - this.startTime.getTime(),
      environment: process.env.NODE_ENV || 'development'
    };

    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    } else {
      // Simple CSV format for metrics
      const csv = [
        'metric,value,unit',
        `requests_per_minute,${metrics.requestsPerMinute},requests`,
        `success_rate,${metrics.successRate},%`,
        `average_response_time,${metrics.averageResponseTime},ms`,
        `error_rate,${metrics.errorRate},%`
      ].join('\n');
      return csv;
    }
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.on('finish', resolve);
      this.logger.end();
    });
  }

  // Static method for creating logger instance
  static create(): ScrapingLogger {
    return new ScrapingLogger();
  }
}

// Singleton instance
const logger = ScrapingLogger.create();

export { logger, ScrapingLogger };
export default logger;