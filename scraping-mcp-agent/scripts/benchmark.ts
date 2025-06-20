#!/usr/bin/env node

/**
 * Performance Benchmark Script
 * 
 * Comprehensive performance testing for the Scraping MCP Agent
 * Tests different scrapers, configurations, and use cases
 */

import { performance } from 'perf_hooks';
import { writeFileSync } from 'fs';
import { join } from 'path';
import {
  PlaywrightScraper,
  CheerioScraper,
  scraperFactory,
  EcommerceAgent,
  JobsAgent,
  NewsAgent,
  RateLimiter,
  logger
} from '../src/index.js';

interface BenchmarkResult {
  name: string;
  type: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  throughput: number; // requests per second
  memoryUsed: number; // MB
  successRate: number;
  errors: string[];
}

interface BenchmarkSuite {
  name: string;
  description: string;
  results: BenchmarkResult[];
  systemInfo: {
    platform: string;
    nodeVersion: string;
    memoryTotal: number;
    cpuCount: number;
  };
  timestamp: Date;
}

class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];
  private testUrls = {
    fast: 'https://httpbin.org/json',
    medium: 'https://httpbin.org/html',
    slow: 'https://httpbin.org/delay/2',
    ecommerce: 'https://books.toscrape.com/catalogue/page-1.html',
    news: 'https://quotes.toscrape.com/'
  };

  async runFullBenchmark(): Promise<BenchmarkSuite> {
    console.log('🏁 Starting Performance Benchmark Suite');
    console.log('========================================\n');

    // System information
    const systemInfo = this.getSystemInfo();
    console.log('💻 System Information:');
    console.log(`   Platform: ${systemInfo.platform}`);
    console.log(`   Node.js: ${systemInfo.nodeVersion}`);
    console.log(`   Memory: ${Math.round(systemInfo.memoryTotal / 1024 / 1024)}MB`);
    console.log(`   CPU Cores: ${systemInfo.cpuCount}\n`);

    try {
      // 1. Basic Scraper Performance
      await this.benchmarkBasicScrapers();
      
      // 2. Concurrency Tests
      await this.benchmarkConcurrency();
      
      // 3. Rate Limiting Performance
      await this.benchmarkRateLimiting();
      
      // 4. Specialized Agents
      await this.benchmarkSpecializedAgents();
      
      // 5. Memory and Stability Tests
      await this.benchmarkMemoryUsage();
      
      // 6. Batch Processing Performance
      await this.benchmarkBatchProcessing();

      // Generate report
      const suite: BenchmarkSuite = {
        name: 'Scraping MCP Agent Performance Benchmark',
        description: 'Comprehensive performance testing suite',
        results: this.results,
        systemInfo,
        timestamp: new Date()
      };

      await this.generateReport(suite);
      this.displaySummary(suite);

      return suite;

    } catch (error) {
      console.error('❌ Benchmark failed:', error);
      throw error;
    }
  }

  private async benchmarkBasicScrapers(): Promise<void> {
    console.log('🔧 1. Basic Scraper Performance');
    console.log('================================');

    // Playwright vs Cheerio performance
    await this.runBenchmark(
      'Playwright - Fast Request',
      'playwright',
      10,
      async () => {
        const scraper = new PlaywrightScraper();
        await scraper.initialize();
        try {
          const result = await scraper.scrape({
            url: this.testUrls.fast,
            selectors: { data: 'body' },
            options: { timeout: 10000 }
          });
          return result.success;
        } finally {
          await scraper.dispose();
        }
      }
    );

    await this.runBenchmark(
      'Cheerio - Fast Request',
      'cheerio',
      20,
      async () => {
        const scraper = new CheerioScraper();
        try {
          const result = await scraper.scrape({
            url: this.testUrls.fast,
            selectors: { data: 'body' },
            options: { timeout: 10000 }
          });
          return result.success;
        } finally {
          await scraper.dispose();
        }
      }
    );

    // Auto-selection performance
    await this.runBenchmark(
      'Auto-Selection - Mixed URLs',
      'auto',
      15,
      async () => {
        const urls = [this.testUrls.fast, this.testUrls.medium, this.testUrls.news];
        const url = urls[Math.floor(Math.random() * urls.length)];
        
        const scraper = await scraperFactory.createScraper('auto', { url });
        try {
          const result = await scraper.scrape({
            url,
            selectors: { title: 'title, h1', content: 'body' },
            options: { timeout: 15000 }
          });
          return result.success;
        } finally {
          await scraper.dispose();
        }
      }
    );
  }

  private async benchmarkConcurrency(): Promise<void> {
    console.log('\n🚀 2. Concurrency Performance');
    console.log('==============================');

    // Test different concurrency levels
    const concurrencyLevels = [1, 3, 5, 10];

    for (const concurrency of concurrencyLevels) {
      await this.runBenchmark(
        `Concurrent Requests (${concurrency} parallel)`,
        'concurrency',
        concurrency * 2, // More iterations for concurrent tests
        async () => {
          const promises = Array.from({ length: concurrency }, async () => {
            const scraper = await scraperFactory.createScraper('cheerio');
            try {
              const result = await scraper.scrape({
                url: this.testUrls.fast,
                selectors: { data: 'body' },
                options: { timeout: 10000 }
              });
              return result.success;
            } finally {
              await scraper.dispose();
            }
          });

          const results = await Promise.allSettled(promises);
          return results.every(r => r.status === 'fulfilled' && r.value);
        },
        true // Mark as concurrent test
      );
    }
  }

  private async benchmarkRateLimiting(): Promise<void> {
    console.log('\n⏱️  3. Rate Limiting Performance');
    console.log('=================================');

    // Test rate limiter with different configurations
    const rateLimitConfigs = [
      { maxConcurrent: 1, delayMs: 500, name: 'Conservative' },
      { maxConcurrent: 3, delayMs: 1000, name: 'Balanced' },
      { maxConcurrent: 5, delayMs: 200, name: 'Aggressive' }
    ];

    for (const config of rateLimitConfigs) {
      await this.runBenchmark(
        `Rate Limited - ${config.name}`,
        'rate_limiting',
        10,
        async () => {
          const rateLimiter = new RateLimiter({
            maxConcurrent: config.maxConcurrent,
            delayMs: config.delayMs,
            burstLimit: 5,
            timeWindow: 60000
          });

          const result = await rateLimiter.addTask({
            id: `test_${Date.now()}`,
            url: this.testUrls.fast,
            task: async () => {
              const scraper = await scraperFactory.createScraper('cheerio');
              try {
                const result = await scraper.scrape({
                  url: this.testUrls.fast,
                  selectors: { data: 'body' }
                });
                return result.success;
              } finally {
                await scraper.dispose();
              }
            }
          });

          return result;
        }
      );
    }
  }

  private async benchmarkSpecializedAgents(): Promise<void> {
    console.log('\n🤖 4. Specialized Agents Performance');
    console.log('====================================');

    // E-commerce Agent
    await this.runBenchmark(
      'E-commerce Agent',
      'ecommerce_agent',
      5,
      async () => {
        const agent = new EcommerceAgent();
        try {
          const result = await agent.scrapeProduct(this.testUrls.ecommerce, {
            extractReviews: false,
            extractVariants: false
          });
          return result.success;
        } finally {
          await agent.dispose();
        }
      }
    );

    // News Agent
    await this.runBenchmark(
      'News Agent',
      'news_agent',
      5,
      async () => {
        const agent = new NewsAgent();
        try {
          const result = await agent.scrapeNews(this.testUrls.news, {
            extractContent: true,
            maxArticlesPerPage: 3
          });
          return result.success;
        } finally {
          await agent.dispose();
        }
      }
    );
  }

  private async benchmarkMemoryUsage(): Promise<void> {
    console.log('\n💾 5. Memory Usage Tests');
    console.log('========================');

    // Memory stress test
    await this.runBenchmark(
      'Memory Stress Test',
      'memory',
      20,
      async () => {
        const scraper = await scraperFactory.createScraper('cheerio');
        try {
          const result = await scraper.scrape({
            url: this.testUrls.medium,
            selectors: {
              everything: '*', // Select everything to stress memory
              text: 'p, div, span',
              links: 'a'
            }
          });
          return result.success;
        } finally {
          await scraper.dispose();
          // Force garbage collection if available
          if (global.gc) global.gc();
        }
      }
    );

    // Memory leak detection
    await this.runBenchmark(
      'Memory Leak Detection',
      'memory_leak',
      50,
      async () => {
        const scraper = await scraperFactory.createScraper('cheerio');
        try {
          const result = await scraper.scrape({
            url: this.testUrls.fast,
            selectors: { data: 'body' }
          });
          return result.success;
        } finally {
          await scraper.dispose();
        }
      }
    );
  }

  private async benchmarkBatchProcessing(): Promise<void> {
    console.log('\n📦 6. Batch Processing Performance');
    console.log('==================================');

    // Batch processing with different sizes
    const batchSizes = [5, 10, 20];

    for (const batchSize of batchSizes) {
      await this.runBenchmark(
        `Batch Processing (${batchSize} URLs)`,
        'batch',
        3, // Fewer iterations for batch tests
        async () => {
          const scraper = await scraperFactory.createScraper('cheerio');
          try {
            const urls = Array.from({ length: batchSize }, () => this.testUrls.fast);
            const configs = urls.map(url => ({
              url,
              selectors: { data: 'body' },
              options: { timeout: 10000 }
            }));

            const results = await scraper.batchScrape(configs);
            return results.every(r => r.success);
          } finally {
            await scraper.dispose();
          }
        }
      );
    }
  }

  private async runBenchmark(
    name: string,
    type: string,
    iterations: number,
    testFunction: () => Promise<boolean>,
    isConcurrent: boolean = false
  ): Promise<void> {
    console.log(`\n📊 Running: ${name} (${iterations} iterations)`);
    
    const times: number[] = [];
    const errors: string[] = [];
    let successCount = 0;
    const initialMemory = process.memoryUsage().heapUsed;

    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now();
      
      try {
        const success = await testFunction();
        if (success) successCount++;
        
        const iterationEnd = performance.now();
        times.push(iterationEnd - iterationStart);
        
        // Progress indicator
        if (i % Math.max(1, Math.floor(iterations / 5)) === 0) {
          process.stdout.write('.');
        }
        
      } catch (error) {
        const iterationEnd = performance.now();
        times.push(iterationEnd - iterationStart);
        errors.push((error as Error).message);
      }
    }

    const endTime = performance.now();
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryUsed = (finalMemory - initialMemory) / 1024 / 1024; // MB

    const totalTime = endTime - startTime;
    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const throughput = iterations / (totalTime / 1000); // requests per second
    const successRate = (successCount / iterations) * 100;

    const result: BenchmarkResult = {
      name,
      type,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      throughput,
      memoryUsed,
      successRate,
      errors: [...new Set(errors)] // Unique errors only
    };

    this.results.push(result);

    // Display results
    console.log(`\n   ✅ Completed: ${name}`);
    console.log(`   📈 Average Time: ${averageTime.toFixed(2)}ms`);
    console.log(`   🚀 Throughput: ${throughput.toFixed(2)} req/s`);
    console.log(`   💯 Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`   💾 Memory Used: ${memoryUsed.toFixed(2)}MB`);
    
    if (errors.length > 0) {
      console.log(`   ⚠️  Errors: ${errors.length} unique error types`);
    }
  }

  private getSystemInfo() {
    const os = require('os');
    return {
      platform: `${os.platform()} ${os.arch()}`,
      nodeVersion: process.version,
      memoryTotal: os.totalmem(),
      cpuCount: os.cpus().length
    };
  }

  private async generateReport(suite: BenchmarkSuite): Promise<void> {
    const reportDir = join(process.cwd(), 'benchmarks');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = join(reportDir, `benchmark-${timestamp}.json`);

    try {
      await import('fs').then(fs => fs.promises.mkdir(reportDir, { recursive: true }));
      
      writeFileSync(reportFile, JSON.stringify(suite, null, 2));
      console.log(`\n📄 Benchmark report saved: ${reportFile}`);
      
      // Generate summary report
      await this.generateSummaryReport(suite, reportDir, timestamp);
      
    } catch (error) {
      console.error('❌ Failed to save benchmark report:', error);
    }
  }

  private async generateSummaryReport(suite: BenchmarkSuite, reportDir: string, timestamp: string): Promise<void> {
    const summaryFile = join(reportDir, `benchmark-summary-${timestamp}.md`);
    
    let summary = `# Scraping MCP Agent Performance Benchmark\n\n`;
    summary += `**Date:** ${suite.timestamp.toISOString()}\n\n`;
    summary += `## System Information\n\n`;
    summary += `- **Platform:** ${suite.systemInfo.platform}\n`;
    summary += `- **Node.js:** ${suite.systemInfo.nodeVersion}\n`;
    summary += `- **Memory:** ${Math.round(suite.systemInfo.memoryTotal / 1024 / 1024)}MB\n`;
    summary += `- **CPU Cores:** ${suite.systemInfo.cpuCount}\n\n`;
    
    summary += `## Performance Results\n\n`;
    summary += `| Test Name | Type | Iterations | Avg Time (ms) | Throughput (req/s) | Success Rate (%) | Memory (MB) |\n`;
    summary += `|-----------|------|------------|---------------|-------------------|------------------|-------------|\n`;
    
    suite.results.forEach(result => {
      summary += `| ${result.name} | ${result.type} | ${result.iterations} | ${result.averageTime.toFixed(2)} | ${result.throughput.toFixed(2)} | ${result.successRate.toFixed(1)} | ${result.memoryUsed.toFixed(2)} |\n`;
    });
    
    // Performance insights
    summary += `\n## Performance Insights\n\n`;
    const insights = this.generatePerformanceInsights(suite.results);
    insights.forEach(insight => {
      summary += `- ${insight}\n`;
    });
    
    // Recommendations
    summary += `\n## Recommendations\n\n`;
    const recommendations = this.generateRecommendations(suite.results);
    recommendations.forEach(rec => {
      summary += `- ${rec}\n`;
    });
    
    writeFileSync(summaryFile, summary);
    console.log(`📄 Summary report saved: ${summaryFile}`);
  }

  private generatePerformanceInsights(results: BenchmarkResult[]): string[] {
    const insights = [];
    
    // Find fastest and slowest tests
    const sortedBySpeed = [...results].sort((a, b) => a.averageTime - b.averageTime);
    const fastest = sortedBySpeed[0];
    const slowest = sortedBySpeed[sortedBySpeed.length - 1];
    
    insights.push(`Fastest test: ${fastest.name} (${fastest.averageTime.toFixed(2)}ms average)`);
    insights.push(`Slowest test: ${slowest.name} (${slowest.averageTime.toFixed(2)}ms average)`);
    
    // Throughput analysis
    const sortedByThroughput = [...results].sort((a, b) => b.throughput - a.throughput);
    const highestThroughput = sortedByThroughput[0];
    
    insights.push(`Highest throughput: ${highestThroughput.name} (${highestThroughput.throughput.toFixed(2)} req/s)`);
    
    // Success rate analysis
    const lowSuccessTests = results.filter(r => r.successRate < 95);
    if (lowSuccessTests.length > 0) {
      insights.push(`${lowSuccessTests.length} tests had success rates below 95%`);
    } else {
      insights.push('All tests achieved >95% success rate');
    }
    
    // Memory usage analysis
    const highMemoryTests = results.filter(r => r.memoryUsed > 50);
    if (highMemoryTests.length > 0) {
      insights.push(`${highMemoryTests.length} tests used >50MB memory`);
    }
    
    // Compare Playwright vs Cheerio
    const playwrightTests = results.filter(r => r.type === 'playwright');
    const cheerioTests = results.filter(r => r.type === 'cheerio');
    
    if (playwrightTests.length > 0 && cheerioTests.length > 0) {
      const avgPlaywright = playwrightTests.reduce((sum, r) => sum + r.averageTime, 0) / playwrightTests.length;
      const avgCheerio = cheerioTests.reduce((sum, r) => sum + r.averageTime, 0) / cheerioTests.length;
      
      const speedDiff = ((avgPlaywright - avgCheerio) / avgCheerio * 100);
      if (speedDiff > 0) {
        insights.push(`Cheerio is ${speedDiff.toFixed(1)}% faster than Playwright on average`);
      } else {
        insights.push(`Playwright is ${Math.abs(speedDiff).toFixed(1)}% faster than Cheerio on average`);
      }
    }
    
    return insights;
  }

  private generateRecommendations(results: BenchmarkResult[]): string[] {
    const recommendations = [];
    
    // Performance recommendations
    const avgThroughput = results.reduce((sum, r) => sum + r.throughput, 0) / results.length;
    if (avgThroughput < 5) {
      recommendations.push('Consider increasing concurrency for better throughput');
    }
    
    // Memory recommendations
    const avgMemory = results.reduce((sum, r) => sum + r.memoryUsed, 0) / results.length;
    if (avgMemory > 100) {
      recommendations.push('High memory usage detected - consider implementing memory optimization');
    }
    
    // Success rate recommendations
    const failureTests = results.filter(r => r.successRate < 90);
    if (failureTests.length > 0) {
      recommendations.push('Some tests have low success rates - review error handling and retry logic');
    }
    
    // Concurrency recommendations
    const concurrentTests = results.filter(r => r.type === 'concurrency');
    if (concurrentTests.length > 0) {
      const bestConcurrency = concurrentTests.sort((a, b) => b.throughput - a.throughput)[0];
      recommendations.push(`Optimal concurrency appears to be around ${bestConcurrency.name.match(/\d+/)?.[0] || 'unknown'} parallel requests`);
    }
    
    // General recommendations
    recommendations.push('Use Cheerio for static content to maximize performance');
    recommendations.push('Implement rate limiting to avoid being blocked by target sites');
    recommendations.push('Monitor memory usage in production to prevent memory leaks');
    recommendations.push('Consider using connection pooling for high-volume scraping');
    
    return recommendations;
  }

  private displaySummary(suite: BenchmarkSuite): void {
    console.log('\n🏆 Benchmark Summary');
    console.log('====================');
    
    const totalTests = suite.results.length;
    const avgSuccessRate = suite.results.reduce((sum, r) => sum + r.successRate, 0) / totalTests;
    const avgThroughput = suite.results.reduce((sum, r) => sum + r.throughput, 0) / totalTests;
    const totalErrors = suite.results.reduce((sum, r) => sum + r.errors.length, 0);
    
    console.log(`📊 Tests Completed: ${totalTests}`);
    console.log(`💯 Average Success Rate: ${avgSuccessRate.toFixed(1)}%`);
    console.log(`🚀 Average Throughput: ${avgThroughput.toFixed(2)} req/s`);
    console.log(`⚠️  Total Error Types: ${totalErrors}`);
    
    // Top performers
    const fastestTest = suite.results.sort((a, b) => a.averageTime - b.averageTime)[0];
    const highestThroughputTest = suite.results.sort((a, b) => b.throughput - a.throughput)[0];
    
    console.log(`\n🥇 Fastest Test: ${fastestTest.name} (${fastestTest.averageTime.toFixed(2)}ms)`);
    console.log(`🚀 Highest Throughput: ${highestThroughputTest.name} (${highestThroughputTest.throughput.toFixed(2)} req/s)`);
    
    console.log('\n💡 Quick Recommendations:');
    if (avgSuccessRate > 95) {
      console.log('   ✅ Excellent reliability - system is stable');
    } else {
      console.log('   ⚠️  Consider improving error handling and retry logic');
    }
    
    if (avgThroughput > 10) {
      console.log('   ✅ Good performance - suitable for production use');
    } else {
      console.log('   ⚠️  Consider optimizing for better throughput');
    }
  }
}

// CLI interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const benchmark = new PerformanceBenchmark();
  
  if (args.includes('--help')) {
    console.log(`
🏁 Scraping MCP Agent Benchmark Tool

Usage: npm run benchmark [options]

Options:
  --help          Show this help message
  --quick         Run quick benchmark (fewer iterations)
  --memory        Focus on memory performance tests
  --concurrency   Focus on concurrency tests
  --agents        Test specialized agents only

Examples:
  npm run benchmark                # Full benchmark suite
  npm run benchmark -- --quick     # Quick performance check
  npm run benchmark -- --memory    # Memory-focused tests
`);
    return;
  }

  // Set test parameters based on arguments
  if (args.includes('--quick')) {
    console.log('⚡ Running quick benchmark...\n');
    // Could modify test parameters here for faster execution
  }

  try {
    await benchmark.runFullBenchmark();
    console.log('\n🎉 Benchmark completed successfully!');
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { PerformanceBenchmark, BenchmarkResult, BenchmarkSuite };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Benchmark execution failed:', error);
    process.exit(1);
  });
}