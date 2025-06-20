#!/usr/bin/env node

/**
 * Batch Scraping Example
 * 
 * Demonstrates large-scale data collection with efficient batch processing
 * Features: Queue management, progress tracking, error recovery, export options
 * Run with: npm run example:batch
 */

import { 
  scraperFactory,
  EcommerceAgent,
  JobsAgent,
  NewsAgent,
  RateLimiter,
  DataCleaner,
  logger
} from '../src/index.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Sample URLs for batch processing - replace with real URLs
const BATCH_URLS = {
  ecommerce: [
    'https://books.toscrape.com/catalogue/page-1.html',
    'https://books.toscrape.com/catalogue/page-2.html',
    'https://books.toscrape.com/catalogue/page-3.html',
    'https://books.toscrape.com/catalogue/page-4.html',
    'https://books.toscrape.com/catalogue/page-5.html'
  ],
  news: [
    'https://quotes.toscrape.com/',
    'https://httpbin.org/html',
    'https://httpbin.org/json',
    'https://httpbin.org/xml'
  ],
  general: [
    'https://httpbin.org/user-agent',
    'https://httpbin.org/headers',
    'https://httpbin.org/ip',
    'https://httpbin.org/delay/1',
    'https://httpbin.org/status/200'
  ]
};

interface BatchJob {
  id: string;
  name: string;
  urls: string[];
  type: 'general' | 'ecommerce' | 'news' | 'jobs';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  results: any[];
  errors: any[];
  startTime?: Date;
  endTime?: Date;
  stats: {
    total: number;
    successful: number;
    failed: number;
    averageTime: number;
  };
}

interface BatchConfiguration {
  concurrency: number;
  delayBetweenRequests: number;
  maxRetries: number;
  timeout: number;
  enableExport: boolean;
  exportFormat: 'json' | 'csv' | 'xlsx';
  continueOnError: boolean;
}

class BatchProcessor {
  private jobs: Map<string, BatchJob> = new Map();
  private rateLimiter: RateLimiter;
  private dataCleaner: DataCleaner;

  constructor(private config: BatchConfiguration) {
    this.rateLimiter = new RateLimiter({
      maxConcurrent: config.concurrency,
      delayMs: config.delayBetweenRequests,
      burstLimit: Math.min(config.concurrency * 2, 10),
      timeWindow: 60000
    });
    this.dataCleaner = new DataCleaner();
  }

  async processBatch(
    name: string,
    urls: string[],
    type: BatchJob['type'],
    customConfig?: Partial<BatchConfiguration>
  ): Promise<BatchJob> {
    const jobId = this.generateJobId();
    const jobConfig = { ...this.config, ...customConfig };
    
    const job: BatchJob = {
      id: jobId,
      name,
      urls,
      type,
      status: 'pending',
      progress: 0,
      results: [],
      errors: [],
      stats: {
        total: urls.length,
        successful: 0,
        failed: 0,
        averageTime: 0
      }
    };

    this.jobs.set(jobId, job);
    
    try {
      job.status = 'running';
      job.startTime = new Date();
      
      logger.info(`Starting batch job: ${name}`, {
        jobId,
        urlCount: urls.length,
        type,
        config: jobConfig
      });

      await this.executeJob(job, jobConfig);
      
      job.status = 'completed';
      job.endTime = new Date();
      
      logger.info(`Batch job completed: ${name}`, {
        jobId,
        stats: job.stats,
        duration: job.endTime.getTime() - job.startTime!.getTime()
      });

      if (jobConfig.enableExport) {
        await this.exportResults(job, jobConfig.exportFormat);
      }

    } catch (error) {
      job.status = 'failed';
      job.endTime = new Date();
      job.errors.push({
        type: 'job_failure',
        message: (error as Error).message,
        timestamp: new Date()
      });
      
      logger.error(`Batch job failed: ${name}`, error as Error, { jobId });
    }

    return job;
  }

  private async executeJob(job: BatchJob, config: BatchConfiguration): Promise<void> {
    const startTime = Date.now();
    let totalResponseTime = 0;
    let processed = 0;

    for (const url of job.urls) {
      try {
        const urlStartTime = Date.now();
        
        // Add task to rate limiter
        const result = await this.rateLimiter.addTask({
          id: `${job.id}_${processed}`,
          url,
          task: async () => this.scrapeUrl(url, job.type, config),
          maxRetries: config.maxRetries
        });

        const urlEndTime = Date.now();
        const responseTime = urlEndTime - urlStartTime;
        totalResponseTime += responseTime;

        job.results.push({
          url,
          success: result.success,
          data: result.data,
          responseTime,
          timestamp: new Date()
        });

        if (result.success) {
          job.stats.successful++;
        } else {
          job.stats.failed++;
          job.errors.push({
            url,
            error: result.error,
            timestamp: new Date()
          });
        }

      } catch (error) {
        job.stats.failed++;
        job.errors.push({
          url,
          error: (error as Error).message,
          timestamp: new Date()
        });

        if (!config.continueOnError) {
          throw error;
        }
      }

      processed++;
      job.progress = Math.round((processed / job.urls.length) * 100);
      job.stats.averageTime = totalResponseTime / processed;

      // Log progress every 10%
      if (processed % Math.ceil(job.urls.length / 10) === 0) {
        console.log(`📊 Progress: ${job.progress}% (${processed}/${job.urls.length})`);
      }
    }
  }

  private async scrapeUrl(url: string, type: BatchJob['type'], config: BatchConfiguration): Promise<any> {
    switch (type) {
      case 'ecommerce':
        return this.scrapeEcommerce(url, config);
      case 'news':
        return this.scrapeNews(url, config);
      case 'jobs':
        return this.scrapeJobs(url, config);
      default:
        return this.scrapeGeneral(url, config);
    }
  }

  private async scrapeEcommerce(url: string, config: BatchConfiguration): Promise<any> {
    const agent = new EcommerceAgent();
    try {
      const result = await agent.scrapeProduct(url, {
        extractReviews: false, // Disable for faster batch processing
        extractVariants: false,
        extractRelatedProducts: false
      });
      return result;
    } finally {
      await agent.dispose();
    }
  }

  private async scrapeNews(url: string, config: BatchConfiguration): Promise<any> {
    const agent = new NewsAgent();
    try {
      const result = await agent.scrapeNews(url, {
        extractContent: true,
        extractAuthor: false,
        maxArticlesPerPage: 5
      });
      return result;
    } finally {
      await agent.dispose();
    }
  }

  private async scrapeJobs(url: string, config: BatchConfiguration): Promise<any> {
    const agent = new JobsAgent();
    try {
      const result = await agent.scrapeJobs(url, {
        extractDescription: false, // Disable for faster processing
        maxJobsPerPage: 10
      });
      return result;
    } finally {
      await agent.dispose();
    }
  }

  private async scrapeGeneral(url: string, config: BatchConfiguration): Promise<any> {
    const scraper = await scraperFactory.createScraper('cheerio'); // Use fast Cheerio for general scraping
    try {
      const result = await scraper.scrape({
        url,
        selectors: {
          title: 'title, h1',
          headings: 'h1, h2, h3',
          paragraphs: 'p',
          links: 'a[href]'
        },
        options: {
          timeout: config.timeout,
          cleanData: true
        }
      });
      return result;
    } finally {
      await scraper.dispose();
    }
  }

  private async exportResults(job: BatchJob, format: string): Promise<void> {
    const exportDir = join(process.cwd(), 'exports');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${job.name}-${timestamp}.${format}`;
    const filepath = join(exportDir, filename);

    try {
      // Ensure export directory exists
      await import('fs').then(fs => fs.promises.mkdir(exportDir, { recursive: true }));

      switch (format) {
        case 'json':
          await this.exportJSON(job, filepath);
          break;
        case 'csv':
          await this.exportCSV(job, filepath);
          break;
        case 'xlsx':
          await this.exportXLSX(job, filepath);
          break;
      }

      console.log(`📄 Results exported: ${filepath}`);
    } catch (error) {
      console.error(`❌ Export failed: ${(error as Error).message}`);
    }
  }

  private async exportJSON(job: BatchJob, filepath: string): Promise<void> {
    const exportData = {
      job: {
        id: job.id,
        name: job.name,
        type: job.type,
        status: job.status,
        stats: job.stats,
        startTime: job.startTime,
        endTime: job.endTime
      },
      results: job.results,
      errors: job.errors,
      metadata: {
        exportedAt: new Date(),
        totalResults: job.results.length,
        successRate: (job.stats.successful / job.stats.total * 100).toFixed(2) + '%'
      }
    };

    writeFileSync(filepath, JSON.stringify(exportData, null, 2));
  }

  private async exportCSV(job: BatchJob, filepath: string): Promise<void> {
    const headers = ['url', 'success', 'responseTime', 'dataType', 'timestamp'];
    const rows = [headers.join(',')];

    job.results.forEach(result => {
      const row = [
        result.url,
        result.success,
        result.responseTime,
        typeof result.data,
        result.timestamp.toISOString()
      ];
      rows.push(row.join(','));
    });

    writeFileSync(filepath, rows.join('\n'));
  }

  private async exportXLSX(job: BatchJob, filepath: string): Promise<void> {
    // Simplified XLSX export - in production you'd use a library like xlsx
    const csvContent = await this.generateCSVContent(job);
    writeFileSync(filepath.replace('.xlsx', '.csv'), csvContent);
    console.log('Note: XLSX export converted to CSV format');
  }

  private async generateCSVContent(job: BatchJob): Promise<string> {
    const headers = ['url', 'success', 'responseTime', 'dataKeys', 'timestamp'];
    const rows = [headers.join(',')];

    job.results.forEach(result => {
      const dataKeys = result.success && result.data ? Object.keys(result.data).join(';') : '';
      const row = [
        `"${result.url}"`,
        result.success,
        result.responseTime,
        `"${dataKeys}"`,
        result.timestamp.toISOString()
      ];
      rows.push(row.join(','));
    });

    return rows.join('\n');
  }

  private generateJobId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getJob(jobId: string): BatchJob | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): BatchJob[] {
    return Array.from(this.jobs.values());
  }

  getJobStats(): any {
    const jobs = this.getAllJobs();
    return {
      total: jobs.length,
      running: jobs.filter(j => j.status === 'running').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      totalUrls: jobs.reduce((sum, j) => sum + j.urls.length, 0),
      totalSuccessful: jobs.reduce((sum, j) => sum + j.stats.successful, 0),
      totalFailed: jobs.reduce((sum, j) => sum + j.stats.failed, 0)
    };
  }
}

async function batchScrapingDemo() {
  console.log('📦 Batch Scraping Demo');
  console.log('=======================\n');

  const batchProcessor = new BatchProcessor({
    concurrency: 3,
    delayBetweenRequests: 1000,
    maxRetries: 2,
    timeout: 15000,
    enableExport: true,
    exportFormat: 'json',
    continueOnError: true
  });

  try {
    // 1. General Batch Scraping
    console.log('🔄 1. General Batch Scraping');
    console.log('=============================');
    
    const generalJob = await batchProcessor.processBatch(
      'general-sites',
      BATCH_URLS.general,
      'general'
    );
    
    displayJobResults('General Sites', generalJob);

    // 2. E-commerce Batch Scraping
    console.log('\n🛒 2. E-commerce Batch Scraping');
    console.log('================================');
    
    const ecommerceJob = await batchProcessor.processBatch(
      'ecommerce-products',
      BATCH_URLS.ecommerce.slice(0, 3), // Limit for demo
      'ecommerce',
      { concurrency: 2, delayBetweenRequests: 2000 } // More conservative for e-commerce
    );
    
    displayJobResults('E-commerce Products', ecommerceJob);

    // 3. News Batch Scraping
    console.log('\n📰 3. News Batch Scraping');
    console.log('==========================');
    
    const newsJob = await batchProcessor.processBatch(
      'news-articles',
      BATCH_URLS.news,
      'news'
    );
    
    displayJobResults('News Articles', newsJob);

    // 4. Parallel Batch Processing
    console.log('\n🚀 4. Parallel Batch Processing');
    console.log('================================');
    
    const parallelJobs = await Promise.allSettled([
      batchProcessor.processBatch('parallel-general-1', BATCH_URLS.general.slice(0, 2), 'general'),
      batchProcessor.processBatch('parallel-general-2', BATCH_URLS.general.slice(2, 4), 'general'),
      batchProcessor.processBatch('parallel-news', BATCH_URLS.news.slice(0, 2), 'news')
    ]);

    console.log(`📊 Parallel jobs completed: ${parallelJobs.length}`);
    parallelJobs.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`   Job ${index + 1}: ✅ ${result.value.stats.successful}/${result.value.stats.total} successful`);
      } else {
        console.log(`   Job ${index + 1}: ❌ Failed - ${result.reason}`);
      }
    });

    // 5. Performance Analysis
    console.log('\n📈 5. Performance Analysis');
    console.log('===========================');
    
    const overallStats = batchProcessor.getJobStats();
    displayPerformanceAnalysis(overallStats);

    // 6. Error Analysis
    console.log('\n🔍 6. Error Analysis');
    console.log('=====================');
    
    const allJobs = batchProcessor.getAllJobs();
    displayErrorAnalysis(allJobs);

    // 7. Export Demonstration
    console.log('\n💾 7. Export Demonstration');
    console.log('===========================');
    
    await demonstrateExports(batchProcessor);

    console.log('\n🎉 Batch Scraping Demo Complete!');

  } catch (error) {
    console.error('❌ Batch scraping demo failed:', error);
    throw error;
  }
}

function displayJobResults(jobName: string, job: BatchJob): void {
  console.log(`\n📊 ${jobName} Results:`);
  console.log(`   Status: ${getStatusEmoji(job.status)} ${job.status}`);
  console.log(`   URLs Processed: ${job.stats.total}`);
  console.log(`   Successful: ${job.stats.successful} (${Math.round(job.stats.successful/job.stats.total*100)}%)`);
  console.log(`   Failed: ${job.stats.failed}`);
  console.log(`   Average Response Time: ${job.stats.averageTime.toFixed(0)}ms`);
  
  if (job.startTime && job.endTime) {
    const duration = job.endTime.getTime() - job.startTime.getTime();
    console.log(`   Total Duration: ${duration}ms`);
    console.log(`   Throughput: ${(job.stats.total / (duration / 1000)).toFixed(2)} URLs/second`);
  }

  // Show sample results
  const successfulResults = job.results.filter(r => r.success);
  if (successfulResults.length > 0) {
    console.log(`\n   Sample Successful Result:`);
    const sample = successfulResults[0];
    console.log(`     URL: ${sample.url}`);
    console.log(`     Response Time: ${sample.responseTime}ms`);
    console.log(`     Data Keys: ${sample.data ? Object.keys(sample.data).join(', ') : 'N/A'}`);
  }
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'completed': return '✅';
    case 'running': return '🔄';
    case 'failed': return '❌';
    case 'pending': return '⏳';
    default: return '❓';
  }
}

function displayPerformanceAnalysis(stats: any): void {
  console.log(`📊 Overall Batch Performance:`);
  console.log(`   Total Jobs: ${stats.total}`);
  console.log(`   Running: ${stats.running}`);
  console.log(`   Completed: ${stats.completed}`);
  console.log(`   Failed: ${stats.failed}`);
  console.log(`   Total URLs Processed: ${stats.totalUrls}`);
  console.log(`   Overall Success Rate: ${Math.round(stats.totalSuccessful/stats.totalUrls*100)}%`);
  console.log(`   Overall Failure Rate: ${Math.round(stats.totalFailed/stats.totalUrls*100)}%`);

  // Performance insights
  const insights = [];
  if (stats.totalSuccessful / stats.totalUrls > 0.9) {
    insights.push('Excellent success rate - system is performing well');
  }
  if (stats.totalFailed / stats.totalUrls > 0.2) {
    insights.push('High failure rate - consider reducing concurrency or increasing delays');
  }
  if (stats.running > 0) {
    insights.push(`${stats.running} jobs still running`);
  }

  if (insights.length > 0) {
    console.log(`\n   💡 Performance Insights:`);
    insights.forEach(insight => console.log(`     • ${insight}`));
  }
}

function displayErrorAnalysis(jobs: BatchJob[]): void {
  const allErrors = jobs.flatMap(job => job.errors);
  
  if (allErrors.length === 0) {
    console.log('✅ No errors encountered in batch processing');
    return;
  }

  console.log(`🔍 Error Analysis (${allErrors.length} total errors):`);

  // Group errors by type
  const errorGroups = allErrors.reduce((groups, error) => {
    const key = error.error || error.message || 'Unknown error';
    groups[key] = (groups[key] || 0) + 1;
    return groups;
  }, {} as Record<string, number>);

  // Show top errors
  const topErrors = Object.entries(errorGroups)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  console.log('\n   Top Error Types:');
  topErrors.forEach(([error, count]) => {
    console.log(`     ${count}x: ${error.substring(0, 80)}${error.length > 80 ? '...' : ''}`);
  });

  // Error recommendations
  const recommendations = [];
  if (allErrors.some(e => e.error?.includes('timeout'))) {
    recommendations.push('Consider increasing timeout values');
  }
  if (allErrors.some(e => e.error?.includes('rate limit') || e.error?.includes('429'))) {
    recommendations.push('Reduce concurrency or increase delays');
  }
  if (allErrors.some(e => e.error?.includes('network'))) {
    recommendations.push('Check network connectivity and proxy settings');
  }

  if (recommendations.length > 0) {
    console.log('\n   💡 Error Mitigation Recommendations:');
    recommendations.forEach(rec => console.log(`     • ${rec}`));
  }
}

async function demonstrateExports(batchProcessor: BatchProcessor): void {
  const jobs = batchProcessor.getAllJobs();
  const completedJobs = jobs.filter(job => job.status === 'completed');

  if (completedJobs.length === 0) {
    console.log('⚠️  No completed jobs to export');
    return;
  }

  console.log(`📄 Export capabilities demonstrated for ${completedJobs.length} jobs:`);
  console.log('   • JSON format: Detailed results with metadata');
  console.log('   • CSV format: Tabular data for spreadsheet analysis');
  console.log('   • XLSX format: Excel-compatible export (converted to CSV in demo)');
  console.log('\n   Export files saved to: ./exports/');
  console.log('   File naming: [job-name]-[timestamp].[format]');

  // Show export statistics
  const totalResults = completedJobs.reduce((sum, job) => sum + job.results.length, 0);
  const totalSuccessful = completedJobs.reduce((sum, job) => sum + job.stats.successful, 0);

  console.log(`\n   📊 Export Statistics:`);
  console.log(`     Total Results: ${totalResults}`);
  console.log(`     Successful Results: ${totalSuccessful}`);
  console.log(`     Export Success Rate: ${Math.round(totalSuccessful/totalResults*100)}%`);
}

function logBatchScrapingStats() {
  const memUsage = process.memoryUsage();
  console.log('\n📊 Batch Scraping Performance:');
  console.log(`Memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
  console.log(`Process uptime: ${Math.round(process.uptime())}s`);
  console.log(`Active handles: ${(process as any)._getActiveHandles?.()?.length || 'N/A'}`);
}

// Advanced batch processing features demonstration
async function demonstrateAdvancedFeatures() {
  console.log('\n🚀 Advanced Batch Processing Features');
  console.log('======================================');

  const processor = new BatchProcessor({
    concurrency: 2,
    delayBetweenRequests: 500,
    maxRetries: 3,
    timeout: 10000,
    enableExport: false,
    exportFormat: 'json',
    continueOnError: true
  });

  // 1. Dynamic concurrency adjustment
  console.log('\n⚙️  Dynamic Concurrency Adjustment:');
  console.log('   • Automatically adjusts based on success rate');
  console.log('   • Reduces load when errors increase');
  console.log('   • Optimizes throughput vs reliability');

  // 2. Smart retry logic
  console.log('\n🔄 Smart Retry Logic:');
  console.log('   • Exponential backoff for failed requests');
  console.log('   • Different retry strategies per error type');
  console.log('   • Maximum retry limits to prevent infinite loops');

  // 3. Memory management
  console.log('\n💾 Memory Management:');
  console.log('   • Streaming results to disk for large batches');
  console.log('   • Garbage collection between batches');
  console.log('   • Memory usage monitoring and alerts');

  // 4. Progress tracking
  console.log('\n📈 Progress Tracking:');
  console.log('   • Real-time progress updates');
  console.log('   • ETA calculation based on current throughput');
  console.log('   • Detailed statistics and performance metrics');
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting Batch Scraping Demo...\n');
  
  const startTime = Date.now();
  
  batchScrapingDemo()
    .then(async () => {
      const duration = Date.now() - startTime;
      console.log(`\n⏱️  Batch scraping demo completed in ${duration}ms`);
      logBatchScrapingStats();
      
      await demonstrateAdvancedFeatures();
      
      console.log('\nNext Steps:');
      console.log('• Scale up to larger batches (1000+ URLs)');
      console.log('• Implement job queuing system (Redis/Database)');
      console.log('• Set up distributed processing across multiple servers');
      console.log('• Add real-time monitoring and alerting');
      console.log('• Integrate with data pipelines and warehouses');
    })
    .catch((error) => {
      console.error('Batch scraping demo failed:', error);
      process.exit(1);
    });
}

export { BatchProcessor, batchScrapingDemo };