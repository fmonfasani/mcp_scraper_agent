#!/usr/bin/env node

/**
 * Site Analysis Example
 *
 * Demonstrates how to analyze a single website's main business using
 * scraperFactory and the competitor_analysis tool.
 * Steps:
 * 1. Extract headings, descriptions and key features
 * 2. Run competitor_analysis for additional insights
 * 3. Summarize strengths of the site
 *
 * Run with: npm run example:site-analysis
 */

import { scraperFactory, ToolsHandler } from '../src/index.js';

async function siteAnalysisDemo(url: string) {
  console.log(`\n🌐 Site Analysis for ${url}\n`);

  // Step 1: scrape basic content
  const scraper = await scraperFactory.createScraper('auto', { url });

  const scrapeResult = await scraper.scrape({
    url,
    selectors: {
      headings: 'h1, h2',
      description: 'meta[name="description"]',
      features: '.features li, .feature-list li, [class*="feature"]'
    },
    options: { timeout: 20000, cleanData: true }
  });

  await scraper.dispose();

  if (!scrapeResult.success) {
    console.error('❌ Basic scraping failed:', scrapeResult.error);
    return;
  }

  const { headings, description, features } = scrapeResult.data as any;

  // Step 2: competitor_analysis on the same site (for richer metrics)
  const tools = new ToolsHandler();
  const analysis = await tools.competitorAnalysis({
    urls: [url],
    analysisType: 'features',
    compareAgainst: url,
    options: { timeout: 20000 }
  });

  // Step 3: summarize strengths
  const strengths: string[] = [];
  if (Array.isArray(headings) && headings.length > 0) strengths.push('clear headings');
  if (description) strengths.push('has meta description');
  if (Array.isArray(features) && features.length > 0) strengths.push('feature list detected');

  console.log('📄 Extracted Data:', { headings, description, features });
  console.log('💡 Strengths:', strengths.join('; ') || 'None');

  if (analysis.success) {
    console.log('\n⚙️ Competitor Analysis Result:');
    console.log(JSON.stringify(analysis.data, null, 2));
  } else {
    console.log('\n⚠️  Competitor analysis failed:', analysis.error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2] || 'https://books.toscrape.com/';
  siteAnalysisDemo(target).catch((err) => {
    console.error('Site analysis failed:', err);
    process.exit(1);
  });
}

export { siteAnalysisDemo };
