import { PlaywrightScraper } from '../src/core/playwright-scraper.js';
import { ScrapingTarget } from '../src/types/scraping-types.js';

async function testBasicScraping() {
  console.log('🧪 Testing Basic Scraping...');
  
  const scraper = new PlaywrightScraper();
  
  try {
    // Test simple: scraping de un sitio de ejemplo
    const target: ScrapingTarget = {
      url: 'https://example.com',
      selectors: {
        title: {
          selector: 'h1',
          required: true
        },
        content: {
          selector: 'p',
          multiple: true
        }
      },
      options: {
        timeout: 10000,
        screenshot: false,
        stealth: true
      }
    };

    console.log('📡 Scraping:', target.url);
    const result = await scraper.scrape(target);
    
    if (result.success) {
      console.log('✅ Scraping successful!');
      console.log('📊 Data extracted:', JSON.stringify(result.data, null, 2));
      console.log('⏱️ Duration:', result.metadata.duration + 'ms');
    } else {
      console.log('❌ Scraping failed:', result.error);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await scraper.destroy();
  }
}

async function testEcommerceScraping() {
  console.log('🛒 Testing E-commerce Scraping...');
  
  const scraper = new PlaywrightScraper();
  
  try {
    // Test de producto de Amazon (sitio público)
    const target: ScrapingTarget = {
      url: 'https://www.amazon.com/dp/B08N5WRWNW', // Echo Dot
      selectors: {
        title: {
          selector: '#productTitle',
          required: true
        },
        price: {
          selector: '.a-price-whole',
          transform: (value: string) => parseFloat(value.replace(/[^0-9.]/g, ''))
        },
        rating: {
          selector: '[data-hook="average-star-rating"] .a-icon-alt',
          attribute: 'textContent',
          transform: (value: string) => parseFloat(value.split(' ')[0])
        },
        availability: {
          selector: '#availability span'
        }
      },
      options: {
        timeout: 15000,
        stealth: true,
        blockResources: ['image', 'stylesheet', 'font']
      }
    };

    console.log('🛍️ Scraping product:', target.url);
    const result = await scraper.scrape(target);
    
    if (result.success) {
      console.log('✅ Product scraping successful!');
      console.log('🏷️ Product data:', JSON.stringify(result.data, null, 2));
    } else {
      console.log('❌ Product scraping failed:', result.error);
    }
    
  } catch (error) {
    console.error('💥 E-commerce test failed:', error);
  } finally {
    await scraper.destroy();
  }
}

async function testBatchScraping() {
  console.log('📦 Testing Batch Scraping...');
  
  const scraper = new PlaywrightScraper();
  
  try {
    const targets: ScrapingTarget[] = [
      {
        url: 'https://httpbin.org/html',
        selectors: {
          title: { selector: 'h1' }
        }
      },
      {
        url: 'https://httpbin.org/json',
        selectors: {
          data: { selector: 'pre' }
        }
      }
    ];

    console.log('🔄 Batch scraping', targets.length, 'URLs...');
    const results = await scraper.batchScrape(targets);
    
    console.log('📈 Batch results:');
    results.forEach((result, index) => {
      if (result.success) {
        console.log(`✅ ${index + 1}. ${result.metadata.url} - Success (${result.metadata.duration}ms)`);
      } else {
        console.log(`❌ ${index + 1}. ${result.metadata.url} - Failed: ${result.error}`);
      }
    });
    
  } catch (error) {
    console.error('💥 Batch test failed:', error);
  } finally {
    await scraper.destroy();
  }
}

// Ejecutar todos los tests
async function runAllTests() {
  console.log('🎯 Starting Scraping MCP Agent Tests...\n');
  
  await testBasicScraping();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testEcommerceScraping();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testBatchScraping();
  
  console.log('\n🎉 All tests completed!');
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { testBasicScraping, testEcommerceScraping, testBatchScraping };