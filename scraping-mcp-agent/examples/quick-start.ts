#!/usr/bin/env node

/**
 * Quick Start Example - Get up and running in 10 minutes
 * 
 * This example demonstrates the basic functionality of the Scraping MCP Agent
 * Run with: npm run example:quick
 */

import { 
  PlaywrightScraper, 
  CheerioScraper, 
  scraperFactory,
  EcommerceAgent,
  JobsAgent,
  NewsAgent
} from '../src/index.js';

async function quickStartDemo() {
  console.log('🚀 Scraping MCP Agent - Quick Start Demo\n');

  try {
    // 1. Basic URL Scraping with Auto-Selection
    console.log('📄 1. Basic URL Scraping (Auto-selects best scraper)');
    console.log('================================================');
    
    const scraper = await scraperFactory.createScraper('auto', {
      url: 'https://example.com'
    });

    const result = await scraper.scrape({
      url: 'https://example.com',
      selectors: {
        title: 'h1',
        description: 'p',
        links: 'a'
      },
      options: {
        timeout: 10000,
        cleanData: true
      }
    });

    console.log('✅ Result:', JSON.stringify(result, null, 2));
    await scraper.dispose();

    // 2. E-commerce Product Scraping
    console.log('\n🛒 2. E-commerce Product Scraping');
    console.log('==================================');
    
    const ecommerceAgent = new EcommerceAgent();
    
    // Example with a mock e-commerce URL (replace with real URL)
    const productUrl = 'https://shop.example.com/product/sample';
    
    try {
      const productResult = await ecommerceAgent.scrapeProduct(productUrl, {
        extractReviews: true,
        extractVariants: true,
        extractRelatedProducts: false,
        maxReviews: 10
      });

      console.log('✅ Product extracted:', {
        success: productResult.success,
        productName: productResult.product?.name || 'N/A',
        price: productResult.product?.price || 'N/A',
        reviewsCount: productResult.reviews?.length || 0
      });
    } catch (error) {
      console.log('⚠️  E-commerce demo skipped (URL not accessible):', error.message);
    }

    await ecommerceAgent.dispose();

    // 3. Job Listings Scraping
    console.log('\n💼 3. Job Listings Scraping');
    console.log('============================');
    
    const jobsAgent = new JobsAgent();
    
    // Example with job board URL
    const jobsUrl = 'https://jobs.example.com/search?q=developer';
    
    try {
      const jobsResult = await jobsAgent.scrapeJobs(jobsUrl, {
        extractDescription: true,
        extractRequirements: true,
        maxJobsPerPage: 5,
        filters: {
          jobType: 'full-time',
          remote: true
        }
      });

      console.log('✅ Jobs extracted:', {
        success: jobsResult.success,
        jobsCount: jobsResult.jobs.length,
        sampleJob: jobsResult.jobs[0] ? {
          title: jobsResult.jobs[0].title,
          company: jobsResult.jobs[0].company,
          location: jobsResult.jobs[0].location
        } : 'No jobs found'
      });
    } catch (error) {
      console.log('⚠️  Jobs demo skipped (URL not accessible):', error.message);
    }

    await jobsAgent.dispose();

    // 4. News Articles Scraping
    console.log('\n📰 4. News Articles Scraping');
    console.log('=============================');
    
    const newsAgent = new NewsAgent();
    
    // Example with news site URL
    const newsUrl = 'https://news.example.com/technology';
    
    try {
      const newsResult = await newsAgent.scrapeNews(newsUrl, {
        extractContent: true,
        extractAuthor: true,
        extractTags: true,
        maxArticlesPerPage: 3
      });

      console.log('✅ Articles extracted:', {
        success: newsResult.success,
        articlesCount: newsResult.articles.length,
        sampleArticle: newsResult.articles[0] ? {
          title: newsResult.articles[0].title,
          author: newsResult.articles[0].author,
          source: newsResult.articles[0].source
        } : 'No articles found'
      });
    } catch (error) {
      console.log('⚠️  News demo skipped (URL not accessible):', error.message);
    }

    await newsAgent.dispose();

    // 5. Batch Scraping Demo
    console.log('\n📦 5. Batch Scraping Demo');
    console.log('=========================');
    
    const batchScraper = await scraperFactory.createScraper('cheerio'); // Use fast Cheerio for batch
    
    const urls = [
      'https://httpbin.org/html',
      'https://httpbin.org/json',
      'https://httpbin.org/xml'
    ];

    const batchResults = await batchScraper.batchScrape(
      urls.map(url => ({
        url,
        selectors: {
          title: 'title, h1',
          content: 'body'
        },
        options: {
          timeout: 5000
        }
      }))
    );

    console.log('✅ Batch results:', {
      total: batchResults.length,
      successful: batchResults.filter(r => r.success).length,
      failed: batchResults.filter(r => !r.success).length,
      samples: batchResults.slice(0, 2).map(r => ({
        url: r.url,
        success: r.success,
        dataKeys: r.success ? Object.keys(r.data) : []
      }))
    });

    await batchScraper.dispose();

    // 6. Advanced Configuration Demo
    console.log('\n⚙️  6. Advanced Configuration Demo');
    console.log('===================================');
    
    const advancedScraper = new PlaywrightScraper({
      browserType: 'chromium',
      headless: true,
      enableStealth: true,
      enableRateLimiting: true,
      maxConcurrentTabs: 2,
      defaultTimeout: 15000,
      enableScreenshots: false
    });

    await advancedScraper.initialize();

    const advancedResult = await advancedScraper.scrape({
      url: 'https://httpbin.org/html',
      selectors: {
        title: 'title',
        heading: 'h1'
      },
      options: {
        waitFor: 'networkidle',
        stealth: true,
        humanLikeDelay: true
      }
    });

    console.log('✅ Advanced scraping result:', {
      success: advancedResult.success,
      title: advancedResult.data.title,
      responseTime: advancedResult.metadata.responseTime
    });

    await advancedScraper.dispose();

    console.log('\n🎉 Quick Start Demo Complete!');
    console.log('===============================');
    console.log('Next steps:');
    console.log('1. Try the MCP server: npm start');
    console.log('2. Run specific examples: npm run example:ecommerce');
    console.log('3. Check the documentation in /docs');
    console.log('4. Customize selectors for your target sites');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Performance monitoring
function logPerformanceStats() {
  const memUsage = process.memoryUsage();
  console.log('\n📊 Performance Stats:');
  console.log(`Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB used`);
  console.log(`Uptime: ${Math.round(process.uptime())}s`);
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting Quick Start Demo...\n');
  
  const startTime = Date.now();
  
  quickStartDemo()
    .then(() => {
      const duration = Date.now() - startTime;
      console.log(`\n⏱️  Demo completed in ${duration}ms`);
      logPerformanceStats();
    })
    .catch((error) => {
      console.error('Demo failed:', error);
      process.exit(1);
    });
}

export { quickStartDemo };