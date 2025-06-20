#!/usr/bin/env node

/**
 * Competitive Intelligence Example
 * 
 * Advanced competitor analysis and monitoring
 * Features: Multi-site comparison, pricing analysis, trend detection
 * Run with: npm run example:competitive-intel
 */

import { 
  scraperFactory,
  EcommerceAgent,
  NewsAgent,
  DataCleaner,
  logger
} from '../src/index.js';

// Sample competitor URLs - replace with real competitors
const COMPETITOR_SITES = {
  ecommerce: [
    'https://books.toscrape.com/catalogue/page-1.html',
    'https://books.toscrape.com/catalogue/page-2.html'
  ],
  news: [
    'https://quotes.toscrape.com/',
    'https://httpbin.org/html'
  ]
};

interface CompetitorAnalysis {
  site: string;
  data: any;
  metrics: {
    responseTime: number;
    dataQuality: number;
    uniqueElements: number;
  };
  insights: string[];
}

interface CompetitiveReport {
  analysis: CompetitorAnalysis[];
  comparison: {
    leader: string;
    trends: string[];
    opportunities: string[];
  };
  recommendations: string[];
}

async function competitiveIntelligenceDemo() {
  console.log('🎯 Competitive Intelligence Demo');
  console.log('=================================\n');

  try {
    // 1. E-commerce Competitor Analysis
    console.log('🛒 1. E-commerce Competitor Analysis');
    console.log('====================================');
    
    const ecommerceAnalysis = await analyzeEcommerceCompetitors();
    displayEcommerceAnalysis(ecommerceAnalysis);

    // 2. Pricing Intelligence
    console.log('\n💰 2. Pricing Intelligence');
    console.log('===========================');
    
    const pricingIntel = await analyzePricingStrategy();
    displayPricingIntelligence(pricingIntel);

    // 3. Content Strategy Analysis
    console.log('\n📝 3. Content Strategy Analysis');
    console.log('================================');
    
    const contentAnalysis = await analyzeContentStrategy();
    displayContentAnalysis(contentAnalysis);

    // 4. Market Positioning
    console.log('\n🎯 4. Market Positioning Analysis');
    console.log('==================================');
    
    const positioningAnalysis = await analyzeMarketPositioning();
    displayPositioningAnalysis(positioningAnalysis);

    // 5. Trend Detection
    console.log('\n📈 5. Trend Detection');
    console.log('======================');
    
    const trendAnalysis = await detectMarketTrends();
    displayTrendAnalysis(trendAnalysis);

    // 6. Generate Competitive Report
    console.log('\n📊 6. Competitive Intelligence Report');
    console.log('======================================');
    
    const competitiveReport = generateCompetitiveReport([
      ecommerceAnalysis,
      pricingIntel,
      contentAnalysis,
      positioningAnalysis,
      trendAnalysis
    ]);
    
    displayCompetitiveReport(competitiveReport);

    console.log('\n🎉 Competitive Intelligence Demo Complete!');

  } catch (error) {
    console.error('❌ Competitive intelligence demo failed:', error);
    throw error;
  }
}

async function analyzeEcommerceCompetitors(): Promise<any> {
  console.log('Analyzing e-commerce competitors...');
  
  const ecommerceAgent = new EcommerceAgent();
  const results = [];

  for (const url of COMPETITOR_SITES.ecommerce) {
    try {
      console.log(`  📊 Analyzing: ${new URL(url).hostname}`);
      
      // For demo purposes, we'll use generic scraping since these are example sites
      const scraper = await scraperFactory.createScraper('cheerio');
      const result = await scraper.scrape({
        url,
        selectors: {
          products: '.product_pod, .item, .product',
          prices: '.price_color, .price, [class*="price"]',
          titles: 'h3 a, .title, h2',
          ratings: '.star-rating, .rating, [class*="star"]',
          availability: '.instock, .stock, [class*="stock"]'
        },
        options: {
          timeout: 15000,
          cleanData: true
        }
      });

      await scraper.dispose();

      if (result.success) {
        const analysis = analyzeCompetitorData(url, result.data);
        results.push(analysis);
      }

    } catch (error) {
      console.log(`  ⚠️  Failed to analyze ${url}: ${error.message}`);
    }
  }

  await ecommerceAgent.dispose();
  return results;
}

async function analyzePricingStrategy(): Promise<any> {
  console.log('Analyzing pricing strategies...');
  
  const pricingData = [];
  const scraper = await scraperFactory.createScraper('cheerio');

  for (const url of COMPETITOR_SITES.ecommerce) {
    try {
      const result = await scraper.scrape({
        url,
        selectors: {
          prices: '.price_color, .price, [class*="price"]',
          originalPrices: '.was-price, .original-price, [class*="original"]',
          discounts: '.discount, .sale, [class*="discount"]',
          products: '.product_pod, .item'
        }
      });

      if (result.success) {
        const pricing = extractPricingData(result.data);
        pricingData.push({
          site: new URL(url).hostname,
          pricing,
          analysis: analyzePricingPatterns(pricing)
        });
      }

    } catch (error) {
      console.log(`  ⚠️  Pricing analysis failed for ${url}`);
    }
  }

  await scraper.dispose();
  return pricingData;
}

async function analyzeContentStrategy(): Promise<any> {
  console.log('Analyzing content strategies...');
  
  const newsAgent = new NewsAgent();
  const contentAnalysis = [];

  for (const url of COMPETITOR_SITES.news) {
    try {
      const result = await newsAgent.scrapeNews(url, {
        extractContent: true,
        extractTags: true,
        maxArticlesPerPage: 5
      });

      if (result.success && result.articles.length > 0) {
        const strategy = analyzeContentPatterns(result.articles);
        contentAnalysis.push({
          site: new URL(url).hostname,
          strategy,
          metrics: calculateContentMetrics(result.articles)
        });
      }

    } catch (error) {
      console.log(`  ⚠️  Content analysis failed for ${url}`);
    }
  }

  await newsAgent.dispose();
  return contentAnalysis;
}

async function analyzeMarketPositioning(): Promise<any> {
  console.log('Analyzing market positioning...');
  
  // Simulate market positioning analysis
  const positioning = {
    competitors: COMPETITOR_SITES.ecommerce.map(url => ({
      site: new URL(url).hostname,
      positioning: {
        priceLevel: Math.random() > 0.5 ? 'premium' : 'budget',
        targetMarket: Math.random() > 0.5 ? 'enterprise' : 'consumer',
        keyDifferentiator: getRandomDifferentiator(),
        marketShare: Math.random() * 30 + 5 // 5-35%
      }
    })),
    gaps: [
      'Mid-market segment underserved',
      'Limited mobile-first offerings',
      'Emerging market opportunities'
    ],
    threats: [
      'New entrants with aggressive pricing',
      'Technology disruption risk',
      'Changing consumer preferences'
    ]
  };

  return positioning;
}

async function detectMarketTrends(): Promise<any> {
  console.log('Detecting market trends...');
  
  // Simulate trend detection
  const trends = {
    emerging: [
      'AI-powered personalization',
      'Sustainable packaging focus',
      'Mobile-first shopping experience',
      'Social commerce integration'
    ],
    declining: [
      'Traditional banner advertising',
      'Desktop-only experiences',
      'Generic product descriptions'
    ],
    opportunities: [
      'Voice commerce optimization',
      'AR/VR product visualization',
      'Subscription model adoption',
      'Cross-border e-commerce'
    ],
    timeframe: '6-month analysis',
    confidence: 'medium-high'
  };

  return trends;
}

function analyzeCompetitorData(url: string, data: any): CompetitorAnalysis {
  const site = new URL(url).hostname;
  
  // Extract metrics from scraped data
  const products = Array.isArray(data.products) ? data.products : [];
  const prices = Array.isArray(data.prices) ? data.prices : [];
  const titles = Array.isArray(data.titles) ? data.titles : [];
  
  const metrics = {
    responseTime: Math.random() * 2000 + 500, // Simulate response time
    dataQuality: calculateDataQuality(data),
    uniqueElements: new Set([...products, ...prices, ...titles]).size
  };

  const insights = generateInsights(site, data, metrics);

  return {
    site,
    data,
    metrics,
    insights
  };
}

function extractPricingData(data: any): any {
  const prices = Array.isArray(data.prices) ? data.prices : [];
  const originalPrices = Array.isArray(data.originalPrices) ? data.originalPrices : [];
  const discounts = Array.isArray(data.discounts) ? data.discounts : [];

  // Parse price data
  const parsedPrices = prices.map(price => {
    const numericPrice = parseFloat(String(price).replace(/[^\d.]/g, ''));
    return isNaN(numericPrice) ? null : numericPrice;
  }).filter(Boolean);

  return {
    prices: parsedPrices,
    averagePrice: parsedPrices.length > 0 ? 
      parsedPrices.reduce((sum, p) => sum + p, 0) / parsedPrices.length : 0,
    priceRange: parsedPrices.length > 0 ? {
      min: Math.min(...parsedPrices),
      max: Math.max(...parsedPrices)
    } : null,
    discountStrategy: discounts.length > 0 ? 'active' : 'limited',
    priceCount: parsedPrices.length
  };
}

function analyzePricingPatterns(pricing: any): any {
  const { averagePrice, priceRange, discountStrategy } = pricing;
  
  let strategy = 'unknown';
  if (averagePrice > 50) strategy = 'premium';
  else if (averagePrice > 20) strategy = 'mid-market';
  else strategy = 'budget';

  return {
    strategy,
    competitiveness: averagePrice < 30 ? 'high' : 'medium',
    discountFrequency: discountStrategy,
    priceVariability: priceRange ? (priceRange.max - priceRange.min) / averagePrice : 0
  };
}

function analyzeContentPatterns(articles: any[]): any {
  const totalContent = articles.reduce((sum, article) => 
    sum + (article.content ? article.content.length : 0), 0);
  
  const avgContentLength = totalContent / articles.length;
  
  return {
    contentVolume: articles.length > 5 ? 'high' : 'medium',
    avgContentLength: Math.round(avgContentLength),
    contentTypes: ['articles', 'blog posts'], // Simplified
    updateFrequency: 'daily', // Simulated
    contentQuality: avgContentLength > 500 ? 'high' : 'medium'
  };
}

function calculateContentMetrics(articles: any[]): any {
  return {
    totalArticles: articles.length,
    avgWordCount: articles.reduce((sum, a) => sum + (a.wordCount || 0), 0) / articles.length,
    topicsCount: new Set(articles.map(a => a.category).filter(Boolean)).size,
    engagementScore: Math.random() * 100 // Simulated
  };
}

function calculateDataQuality(data: any): number {
  let score = 0;
  let maxScore = 0;

  Object.keys(data).forEach(key => {
    maxScore += 20;
    if (data[key] && (Array.isArray(data[key]) ? data[key].length > 0 : true)) {
      score += 20;
    }
  });

  return maxScore > 0 ? (score / maxScore) * 100 : 0;
}

function generateInsights(site: string, data: any, metrics: any): string[] {
  const insights = [];
  
  if (metrics.dataQuality > 80) {
    insights.push('High data quality indicates strong site structure');
  }
  
  if (metrics.responseTime < 1000) {
    insights.push('Fast response times suggest good performance optimization');
  }
  
  if (Array.isArray(data.products) && data.products.length > 20) {
    insights.push('Large product catalog indicates comprehensive offering');
  }
  
  if (Array.isArray(data.prices) && data.prices.length > 0) {
    insights.push('Transparent pricing strategy with visible prices');
  }

  return insights.length > 0 ? insights : ['Limited insights available from current data'];
}

function getRandomDifferentiator(): string {
  const differentiators = [
    'price leadership',
    'product quality',
    'customer service',
    'innovation',
    'brand reputation',
    'market reach'
  ];
  return differentiators[Math.floor(Math.random() * differentiators.length)];
}

function generateCompetitiveReport(analyses: any[]): CompetitiveReport {
  // Simplified report generation
  const report: CompetitiveReport = {
    analysis: analyses.flat().filter(Boolean),
    comparison: {
      leader: 'books.toscrape.com', // Example
      trends: [
        'Increasing focus on user experience',
        'Mobile optimization becoming standard',
        'Price transparency improving'
      ],
      opportunities: [
        'Underserved premium market segment',
        'Limited personalization features',
        'Opportunity for better search functionality'
      ]
    },
    recommendations: [
      'Implement dynamic pricing strategy',
      'Improve mobile user experience',
      'Enhance product discovery features',
      'Develop content marketing strategy',
      'Consider market expansion opportunities'
    ]
  };

  return report;
}

// Display functions
function displayEcommerceAnalysis(analysis: any[]): void {
  if (analysis.length === 0) {
    console.log('⚠️  No e-commerce analysis data available');
    return;
  }

  analysis.forEach((competitor, index) => {
    console.log(`\n📊 Competitor ${index + 1}: ${competitor.site}`);
    console.log(`   Data Quality: ${competitor.metrics.dataQuality.toFixed(1)}%`);
    console.log(`   Response Time: ${competitor.metrics.responseTime.toFixed(0)}ms`);
    console.log(`   Unique Elements: ${competitor.metrics.uniqueElements}`);
    console.log(`   Key Insights:`);
    competitor.insights.forEach(insight => console.log(`     • ${insight}`));
  });
}

function displayPricingIntelligence(pricingData: any[]): void {
  if (pricingData.length === 0) {
    console.log('⚠️  No pricing intelligence data available');
    return;
  }

  pricingData.forEach(competitor => {
    console.log(`\n💰 ${competitor.site} Pricing Analysis:`);
    console.log(`   Average Price: $${competitor.pricing.averagePrice.toFixed(2)}`);
    console.log(`   Strategy: ${competitor.analysis.strategy}`);
    console.log(`   Competitiveness: ${competitor.analysis.competitiveness}`);
    console.log(`   Products Analyzed: ${competitor.pricing.priceCount}`);
  });
}

function displayContentAnalysis(contentData: any[]): void {
  if (contentData.length === 0) {
    console.log('⚠️  No content analysis data available');
    return;
  }

  contentData.forEach(competitor => {
    console.log(`\n📝 ${competitor.site} Content Strategy:`);
    console.log(`   Content Volume: ${competitor.strategy.contentVolume}`);
    console.log(`   Avg Content Length: ${competitor.strategy.avgContentLength} chars`);
    console.log(`   Content Quality: ${competitor.strategy.contentQuality}`);
    console.log(`   Total Articles: ${competitor.metrics.totalArticles}`);
  });
}

function displayPositioningAnalysis(positioning: any): void {
  console.log('\n🎯 Market Positioning Analysis:');
  
  positioning.competitors.forEach(comp => {
    console.log(`\n   ${comp.site}:`);
    console.log(`     Price Level: ${comp.positioning.priceLevel}`);
    console.log(`     Target Market: ${comp.positioning.targetMarket}`);
    console.log(`     Key Differentiator: ${comp.positioning.keyDifferentiator}`);
    console.log(`     Est. Market Share: ${comp.positioning.marketShare.toFixed(1)}%`);
  });

  console.log('\n   Market Gaps:');
  positioning.gaps.forEach(gap => console.log(`     • ${gap}`));
  
  console.log('\n   Competitive Threats:');
  positioning.threats.forEach(threat => console.log(`     • ${threat}`));
}

function displayTrendAnalysis(trends: any): void {
  console.log('\n📈 Market Trends Analysis:');
  
  console.log('\n   Emerging Trends:');
  trends.emerging.forEach(trend => console.log(`     📈 ${trend}`));
  
  console.log('\n   Declining Trends:');
  trends.declining.forEach(trend => console.log(`     📉 ${trend}`));
  
  console.log('\n   Market Opportunities:');
  trends.opportunities.forEach(opp => console.log(`     💡 ${opp}`));
  
  console.log(`\n   Analysis Confidence: ${trends.confidence}`);
}

function displayCompetitiveReport(report: CompetitiveReport): void {
  console.log('\n📊 Executive Summary:');
  console.log(`   Market Leader: ${report.comparison.leader}`);
  
  console.log('\n   Key Market Trends:');
  report.comparison.trends.forEach(trend => console.log(`     • ${trend}`));
  
  console.log('\n   Strategic Opportunities:');
  report.comparison.opportunities.forEach(opp => console.log(`     • ${opp}`));
  
  console.log('\n💡 Strategic Recommendations:');
  report.recommendations.forEach((rec, index) => {
    console.log(`   ${index + 1}. ${rec}`);
  });
}

function logCompetitiveIntelligenceStats() {
  const memUsage = process.memoryUsage();
  console.log('\n📊 Competitive Intelligence Performance:');
  console.log(`Memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
  console.log(`Process uptime: ${Math.round(process.uptime())}s`);
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting Competitive Intelligence Demo...\n');
  
  const startTime = Date.now();
  
  competitiveIntelligenceDemo()
    .then(() => {
      const duration = Date.now() - startTime;
      console.log(`\n⏱️  Competitive intelligence demo completed in ${duration}ms`);
      logCompetitiveIntelligenceStats();
      
      console.log('\nNext Steps:');
      console.log('• Set up automated competitive monitoring');
      console.log('• Implement price tracking alerts');
      console.log('• Create competitive dashboard');
      console.log('• Schedule regular analysis reports');
    })
    .catch((error) => {
      console.error('Competitive intelligence demo failed:', error);
      process.exit(1);
    });
}

export { competitiveIntelligenceDemo };