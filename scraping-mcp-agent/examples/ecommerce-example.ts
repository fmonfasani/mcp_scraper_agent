#!/usr/bin/env node

/**
 * E-commerce Scraping Example
 * 
 * Comprehensive example showing advanced e-commerce scraping capabilities
 * Features: Product data, reviews, variants, competitor analysis
 * Run with: npm run example:ecommerce
 */

import { 
  EcommerceAgent,
  scraperFactory,
  DataCleaner,
  logger
} from '../src/index.js';

// Example e-commerce URLs (replace with real URLs for testing)
const SAMPLE_PRODUCTS = [
  'https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html',
  'https://books.toscrape.com/catalogue/tipping-the-velvet_999/index.html',
  'https://books.toscrape.com/catalogue/soumission_998/index.html'
];

const COMPETITOR_SITES = [
  'https://books.toscrape.com/catalogue/page-1.html'
];

interface ProductAnalysis {
  product: any;
  competitorData?: any[];
  priceAnalysis?: any;
  reviewAnalysis?: any;
  recommendations?: string[];
}

async function ecommerceScrapingDemo() {
  console.log('🛒 E-commerce Scraping Demo');
  console.log('============================\n');

  const ecommerceAgent = new EcommerceAgent();

  try {
    // 1. Single Product Detailed Scraping
    console.log('📦 1. Detailed Product Scraping');
    console.log('================================');

    const productUrl = SAMPLE_PRODUCTS[0];
    console.log(`Scraping: ${productUrl}`);

    const productResult = await ecommerceAgent.scrapeProduct(productUrl, {
      extractReviews: true,
      extractVariants: true,
      extractRelatedProducts: true,
      extractShippingInfo: true,
      extractSpecifications: true,
      maxReviews: 20,
      maxVariants: 10,
      maxRelatedProducts: 5
    });

    if (productResult.success && productResult.product) {
      console.log('✅ Product Details:');
      console.log(`   Name: ${productResult.product.name}`);
      console.log(`   Price: ${productResult.product.currency} ${productResult.product.price}`);
      console.log(`   Availability: ${productResult.product.availability}`);
      console.log(`   Rating: ${productResult.product.rating || 'N/A'}`);
      console.log(`   Reviews: ${productResult.product.reviewCount || 0}`);
      console.log(`   Images: ${productResult.product.images.length}`);
      
      if (productResult.reviews && productResult.reviews.length > 0) {
        console.log(`   Customer Reviews: ${productResult.reviews.length} extracted`);
        console.log(`   Sample Review: "${productResult.reviews[0].text.substring(0, 100)}..."`);
      }

      if (productResult.variants && productResult.variants.length > 0) {
        console.log(`   Variants: ${productResult.variants.length} found`);
      }
    } else {
      console.log('❌ Failed to extract product data:', productResult.error);
    }

    // 2. Batch Product Scraping
    console.log('\n📦 2. Batch Product Scraping');
    console.log('=============================');

    console.log(`Scraping ${SAMPLE_PRODUCTS.length} products...`);
    
    const batchResults = await ecommerceAgent.scrapeMultipleProducts(SAMPLE_PRODUCTS, {
      extractReviews: false, // Skip reviews for faster batch processing
      extractVariants: true,
      extractRelatedProducts: false
    });

    const successfulProducts = batchResults.filter(r => r.success);
    console.log(`✅ Successfully scraped: ${successfulProducts.length}/${batchResults.length} products`);

    if (successfulProducts.length > 0) {
      console.log('\n📊 Batch Results Summary:');
      successfulProducts.forEach((result, index) => {
        if (result.product) {
          console.log(`   ${index + 1}. ${result.product.name} - ${result.product.currency} ${result.product.price}`);
        }
      });

      // 3. Price Analysis
      console.log('\n💰 3. Price Analysis');
      console.log('====================');
      
      const priceAnalysis = analyzePrices(successfulProducts);
      console.log('Price Statistics:');
      console.log(`   Average: ${priceAnalysis.currency} ${priceAnalysis.average.toFixed(2)}`);
      console.log(`   Lowest: ${priceAnalysis.currency} ${priceAnalysis.min.toFixed(2)}`);
      console.log(`   Highest: ${priceAnalysis.currency} ${priceAnalysis.max.toFixed(2)}`);
      console.log(`   Range: ${priceAnalysis.currency} ${priceAnalysis.range.toFixed(2)}`);
    }

    // 4. Competitor Analysis Demo
    console.log('\n🎯 4. Competitor Analysis');
    console.log('==========================');

    await competitorAnalysisDemo();

    // 5. Data Quality Assessment
    console.log('\n🔍 5. Data Quality Assessment');
    console.log('==============================');

    await dataQualityDemo(successfulProducts);

    // 6. Export Results
    console.log('\n💾 6. Export Results');
    console.log('====================');

    await exportResultsDemo(successfulProducts);

    console.log('\n🎉 E-commerce Demo Complete!');

  } catch (error) {
    console.error('❌ E-commerce demo failed:', error);
    throw error;
  } finally {
    await ecommerceAgent.dispose();
  }
}

async function competitorAnalysisDemo() {
  console.log('Analyzing competitor sites...');
  
  try {
    const scraper = await scraperFactory.createScraper('auto');
    
    const competitorResults = [];
    
    for (const url of COMPETITOR_SITES) {
      try {
        const result = await scraper.scrape({
          url,
          selectors: {
            products: '.product_pod',
            prices: '.price_color',
            titles: 'h3 a',
            ratings: '.star-rating'
          },
          options: {
            timeout: 15000,
            cleanData: true
          }
        });

        if (result.success) {
          competitorResults.push({
            site: new URL(url).hostname,
            productsFound: Array.isArray(result.data.products) ? result.data.products.length : 0,
            pricesFound: Array.isArray(result.data.prices) ? result.data.prices.length : 0,
            avgResponseTime: result.metadata.responseTime
          });
        }
      } catch (error) {
        console.log(`   ⚠️  Skipped ${url}: ${error.message}`);
      }
    }

    await scraper.dispose();

    if (competitorResults.length > 0) {
      console.log('✅ Competitor Analysis Results:');
      competitorResults.forEach(result => {
        console.log(`   ${result.site}: ${result.productsFound} products, ${result.pricesFound} prices`);
        console.log(`   Response Time: ${result.avgResponseTime}ms`);
      });
    } else {
      console.log('⚠️  No competitor data available for analysis');
    }

  } catch (error) {
    console.log('⚠️  Competitor analysis skipped:', error.message);
  }
}

async function dataQualityDemo(products: any[]) {
  if (products.length === 0) {
    console.log('⚠️  No products available for quality assessment');
    return;
  }

  const dataCleaner = new DataCleaner();
  
  // Assess data quality
  const qualityMetrics = {
    total: products.length,
    withNames: 0,
    withPrices: 0,
    withImages: 0,
    withDescriptions: 0,
    withRatings: 0,
    avgDataCompleteness: 0
  };

  let totalCompleteness = 0;

  products.forEach(result => {
    if (result.product) {
      const product = result.product;
      let completeness = 0;
      let fields = 0;

      if (product.name) { qualityMetrics.withNames++; completeness++; }
      fields++;

      if (product.price && product.price > 0) { qualityMetrics.withPrices++; completeness++; }
      fields++;

      if (product.images && product.images.length > 0) { qualityMetrics.withImages++; completeness++; }
      fields++;

      if (product.description) { qualityMetrics.withDescriptions++; completeness++; }
      fields++;

      if (product.rating) { qualityMetrics.withRatings++; completeness++; }
      fields++;

      totalCompleteness += (completeness / fields) * 100;
    }
  });

  qualityMetrics.avgDataCompleteness = totalCompleteness / products.length;

  console.log('Data Quality Metrics:');
  console.log(`   Products with names: ${qualityMetrics.withNames}/${qualityMetrics.total} (${Math.round(qualityMetrics.withNames/qualityMetrics.total*100)}%)`);
  console.log(`   Products with prices: ${qualityMetrics.withPrices}/${qualityMetrics.total} (${Math.round(qualityMetrics.withPrices/qualityMetrics.total*100)}%)`);
  console.log(`   Products with images: ${qualityMetrics.withImages}/${qualityMetrics.total} (${Math.round(qualityMetrics.withImages/qualityMetrics.total*100)}%)`);
  console.log(`   Products with descriptions: ${qualityMetrics.withDescriptions}/${qualityMetrics.total} (${Math.round(qualityMetrics.withDescriptions/qualityMetrics.total*100)}%)`);
  console.log(`   Average completeness: ${qualityMetrics.avgDataCompleteness.toFixed(1)}%`);

  // Quality recommendations
  const recommendations = generateQualityRecommendations(qualityMetrics);
  if (recommendations.length > 0) {
    console.log('\n💡 Quality Improvement Recommendations:');
    recommendations.forEach(rec => console.log(`   • ${rec}`));
  }
}

async function exportResultsDemo(products: any[]) {
  if (products.length === 0) {
    console.log('⚠️  No products to export');
    return;
  }

  // Simulate export functionality
  const exportData = products.map(result => ({
    name: result.product?.name || 'N/A',
    price: result.product?.price || 0,
    currency: result.product?.currency || 'USD',
    availability: result.product?.availability || 'unknown',
    rating: result.product?.rating || null,
    images_count: result.product?.images?.length || 0,
    scraped_at: new Date().toISOString(),
    source_url: result.url
  }));

  console.log('Export formats available:');
  console.log('   📄 JSON format ready');
  console.log('   📊 CSV format ready');
  console.log('   📈 Excel format ready');
  console.log(`   📦 ${exportData.length} products prepared for export`);

  // Log sample export data
  console.log('\nSample Export Data (JSON):');
  console.log(JSON.stringify(exportData[0], null, 2));
}

function analyzePrices(products: any[]) {
  const prices = products
    .filter(result => result.product && result.product.price && result.product.price > 0)
    .map(result => result.product.price);

  if (prices.length === 0) {
    return {
      average: 0,
      min: 0,
      max: 0,
      range: 0,
      currency: 'USD'
    };
  }

  const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;
  
  // Get currency from first product
  const currency = products.find(result => result.product?.currency)?.product?.currency || 'USD';

  return {
    average,
    min,
    max,
    range,
    currency,
    count: prices.length
  };
}

function generateQualityRecommendations(metrics: any): string[] {
  const recommendations = [];

  if (metrics.withNames / metrics.total < 0.9) {
    recommendations.push('Improve product name extraction - consider updating selectors');
  }

  if (metrics.withPrices / metrics.total < 0.8) {
    recommendations.push('Price extraction needs improvement - check price selectors and formats');
  }

  if (metrics.withImages / metrics.total < 0.7) {
    recommendations.push('Image extraction could be enhanced for better product visualization');
  }

  if (metrics.avgDataCompleteness < 70) {
    recommendations.push('Overall data completeness is low - review extraction strategy');
  }

  if (metrics.avgDataCompleteness > 90) {
    recommendations.push('Excellent data quality! Consider adding more detailed extraction');
  }

  return recommendations;
}

// Advanced product analysis
function generateProductInsights(products: any[]): string[] {
  const insights = [];
  
  if (products.length === 0) return insights;

  // Price insights
  const priceAnalysis = analyzePrices(products);
  if (priceAnalysis.count > 1) {
    insights.push(`Price range varies by ${priceAnalysis.currency} ${priceAnalysis.range.toFixed(2)}`);
    
    if (priceAnalysis.range / priceAnalysis.average > 2) {
      insights.push('High price variation detected - potential for price optimization');
    }
  }

  // Availability insights
  const availabilityStats = products.reduce((stats, result) => {
    if (result.product?.availability) {
      stats[result.product.availability] = (stats[result.product.availability] || 0) + 1;
    }
    return stats;
  }, {});

  const totalWithAvailability = Object.values(availabilityStats).reduce((sum: number, count) => sum + (count as number), 0);
  if (totalWithAvailability > 0) {
    const inStockPercentage = ((availabilityStats['in-stock'] || 0) / totalWithAvailability) * 100;
    insights.push(`${inStockPercentage.toFixed(1)}% of products are in stock`);
  }

  // Rating insights
  const ratingsAvailable = products.filter(result => result.product?.rating).length;
  if (ratingsAvailable > 0) {
    const avgRating = products
      .filter(result => result.product?.rating)
      .reduce((sum, result) => sum + result.product.rating, 0) / ratingsAvailable;
    insights.push(`Average product rating: ${avgRating.toFixed(1)}/5`);
  }

  return insights;
}

// Performance monitoring for e-commerce scraping
function logEcommercePerformanceStats() {
  const memUsage = process.memoryUsage();
  console.log('\n📊 E-commerce Scraping Performance:');
  console.log(`Memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
  console.log(`Process uptime: ${Math.round(process.uptime())}s`);
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting E-commerce Scraping Demo...\n');
  
  const startTime = Date.now();
  
  ecommerceScrapingDemo()
    .then(() => {
      const duration = Date.now() - startTime;
      console.log(`\n⏱️  E-commerce demo completed in ${duration}ms`);
      logEcommercePerformanceStats();
      
      console.log('\nNext Steps:');
      console.log('• Customize selectors for your target e-commerce sites');
      console.log('• Set up monitoring for price changes');
      console.log('• Implement automated competitor analysis');
      console.log('• Add data export to your preferred format');
    })
    .catch((error) => {
      console.error('E-commerce demo failed:', error);
      process.exit(1);
    });
}

export { ecommerceScrapingDemo };