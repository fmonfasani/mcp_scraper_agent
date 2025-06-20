/**
 * Specialized agent for e-commerce product scraping
 */

import type { IScraper, ScrapingConfig, ScrapingResult, EcommerceProduct } from '@/types/scraping-types.js';
import { scraperFactory } from '@/core/scraper-factory.js';
import DataCleaner from '@/utils/data-cleaner.js';
import logger from '@/utils/logger.js';

export interface EcommerceScrapingOptions {
  extractReviews?: boolean;
  extractVariants?: boolean;
  extractRelatedProducts?: boolean;
  extractPriceHistory?: boolean;
  extractShippingInfo?: boolean;
  extractStock?: boolean;
  extractSpecifications?: boolean;
  maxReviews?: number;
  maxVariants?: number;
  maxRelatedProducts?: number;
}

export interface ProductReview {
  rating: number;
  text: string;
  author?: string;
  date?: Date;
  verified?: boolean;
  helpful?: number;
  title?: string;
}

export interface ProductVariant {
  name: string;
  price: number;
  originalPrice?: number;
  currency: string;
  availability: 'in-stock' | 'out-of-stock' | 'limited';
  sku?: string;
  attributes?: Record<string, string>; // size, color, etc.
  images?: string[];
}

export interface RelatedProduct {
  name: string;
  price: number;
  currency: string;
  url: string;
  image?: string;
  rating?: number;
  brand?: string;
}

export interface EcommerceScrapingResult extends ScrapingResult {
  product?: EcommerceProduct;
  reviews?: ProductReview[];
  variants?: ProductVariant[];
  relatedProducts?: RelatedProduct[];
  specifications?: Record<string, any>;
  shippingInfo?: {
    freeShipping?: boolean;
    estimatedDelivery?: string;
    shippingCost?: number;
    methods?: string[];
  };
  priceHistory?: Array<{
    date: Date;
    price: number;
    currency: string;
  }>;
}

export class EcommerceAgent {
  private scraper: IScraper | null = null;
  private dataCleaner: DataCleaner;
  private siteSelectors: Map<string, any> = new Map();

  constructor() {
    this.dataCleaner = new DataCleaner();
    this.initializeSiteSelectors();
  }

  private initializeSiteSelectors(): void {
    // Amazon selectors
    this.siteSelectors.set('amazon', {
      name: '#productTitle, .product-title',
      price: '.a-price-whole, .a-offscreen, #price_inside_buybox',
      originalPrice: '.a-text-strike, .a-price.a-text-price',
      currency: '.a-price-symbol',
      rating: '.a-icon-alt, [data-hook="average-star-rating"]',
      reviewCount: '#acrCustomerReviewText, [data-hook="total-review-count"]',
      availability: '#availability span, .a-color-success, .a-color-price',
      description: '#feature-bullets ul, .a-unordered-list.a-vertical',
      images: '#landingImage, .a-dynamic-image',
      brand: '.a-brand, #bylineInfo',
      category: '#wayfinding-breadcrumbs_feature_div',
      reviews: {
        container: '[data-hook="review"]',
        rating: '.a-icon-alt',
        text: '[data-hook="review-body"] span',
        author: '.a-profile-name',
        date: '[data-hook="review-date"]',
        verified: '[data-hook="avp-badge"]'
      },
      variants: {
        container: '.a-button-group .a-button-inner',
        name: '.a-button-text',
        price: '.a-price .a-offscreen'
      },
      relatedProducts: {
        container: '#similarities_feature_div .a-carousel-card, .p13n-asin',
        name: '.p13n-sc-truncated, .a-size-base-plus',
        price: '.a-price .a-offscreen',
        url: 'a',
        image: '.a-dynamic-image'
      }
    });

    // Shopify selectors (generic)
    this.siteSelectors.set('shopify', {
      name: '.product__title, .product-single__title, h1.product-title',
      price: '.product__price, .price, [data-price]',
      originalPrice: '.product__price--compare, .price--compare',
      currency: '.money .currency, .price .currency',
      rating: '.rating, .product-rating',
      reviewCount: '.review-count, .reviews-count',
      availability: '.product-form__availability, .stock-status',
      description: '.product__description, .product-single__description',
      images: '.product__photo img, .product-single__photo img',
      brand: '.product__vendor, .vendor',
      variants: {
        container: '.product-form__buttons .btn, .product-form__input',
        name: '.btn-text, option',
        price: '[data-price]'
      }
    });

    // eBay selectors
    this.siteSelectors.set('ebay', {
      name: '#ebay-item-name-label, .x-item-title-label',
      price: '.u-flL.condText .font-weight-bold, .display-price',
      originalPrice: '.originalRetailPrice, .strikethrough',
      currency: '.currency-symbol, .currency-code',
      rating: '.ebay-star-rating',
      reviewCount: '.reviews .count',
      availability: '.u-flL .vi-acc-del-range',
      description: '#viTabs_0_is .g-h2',
      images: '#mainImgId, .img img',
      brand: '.u-flL .notranslate',
      seller: '.mbg-nw'
    });

    // Generic e-commerce selectors (fallback)
    this.siteSelectors.set('generic', {
      name: 'h1, .product-name, .product-title, [class*="product"][class*="name"]',
      price: '.price, [class*="price"]:not([class*="original"]):not([class*="was"]), [data-price]',
      originalPrice: '.original-price, .was-price, .compare-price, [class*="original"], [class*="was"]',
      currency: '.currency, .price-currency',
      rating: '.rating, .stars, [class*="rating"]',
      reviewCount: '.review-count, .reviews-count, [class*="review"][class*="count"]',
      availability: '.stock, .availability, [class*="stock"], [class*="availability"]',
      description: '.description, .product-description, [class*="description"]',
      images: '.product-image img, .gallery img, [class*="product"][class*="image"] img',
      brand: '.brand, .manufacturer, [class*="brand"]',
      category: '.breadcrumb, .category, [class*="breadcrumb"]'
    });
  }

  async scrapeProduct(
    url: string, 
    options: EcommerceScrapingOptions = {}
  ): Promise<EcommerceScrapingResult> {
    const jobId = this.generateJobId();
    logger.info('Starting e-commerce product scraping', { jobId, url, options });

    try {
      // Create optimized scraper for e-commerce
      this.scraper = await scraperFactory.createEcommerceScraper();

      // Detect site type and get appropriate selectors
      const siteType = this.detectSiteType(url);
      const selectors = this.getSiteSelectors(siteType);

      logger.debug('E-commerce site detected', { siteType, url });

      // Configure scraping with e-commerce specific options
      const config: ScrapingConfig = {
        url,
        selectors: this.buildSelectorsConfig(selectors, options),
        options: {
          waitFor: 'networkidle',
          timeout: 30000,
          useRandomUserAgent: true,
          stealth: true,
          humanLikeDelay: true,
          extractImages: true,
          extractLinks: options.extractRelatedProducts,
          cleanData: true
        }
      };

      const result = await this.scraper.scrape(config);
      
      if (!result.success) {
        return result as EcommerceScrapingResult;
      }

      // Process and structure the e-commerce data
      const ecommerceResult = await this.processEcommerceData(
        result, 
        selectors, 
        options,
        siteType
      );

      logger.logScrapingSuccess(
        jobId, 
        url, 
        result.metadata.responseTime,
        1
      );

      return ecommerceResult;

    } catch (error) {
      logger.logScrapingError(jobId, url, error as Error);
      
      return {
        url,
        data: {},
        metadata: {
          responseTime: 0,
          statusCode: 0,
          finalUrl: url,
          userAgent: '',
          timestamp: new Date(),
          extractedCount: 0
        },
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      };
    }
  }

  private detectSiteType(url: string): string {
    const hostname = new URL(url).hostname.toLowerCase();
    
    if (hostname.includes('amazon.')) return 'amazon';
    if (hostname.includes('ebay.')) return 'ebay';
    if (hostname.includes('shopify.') || this.isShopifyStore(url)) return 'shopify';
    if (hostname.includes('woocommerce.') || this.isWooCommerceStore(url)) return 'woocommerce';
    if (hostname.includes('magento.') || this.isMagentoStore(url)) return 'magento';
    
    return 'generic';
  }

  private isShopifyStore(url: string): boolean {
    // Common Shopify indicators
    const shopifyIndicators = [
      'myshopify.com',
      '/products/',
      '/collections/',
      'shopify'
    ];
    return shopifyIndicators.some(indicator => url.toLowerCase().includes(indicator));
  }

  private isWooCommerceStore(url: string): boolean {
    // WooCommerce typically uses /product/ URLs
    return url.toLowerCase().includes('/product/');
  }

  private isMagentoStore(url: string): boolean {
    // Magento URL patterns
    return url.toLowerCase().includes('.html') && url.includes('/catalog/');
  }

  private getSiteSelectors(siteType: string): any {
    return this.siteSelectors.get(siteType) || this.siteSelectors.get('generic');
  }

  private buildSelectorsConfig(selectors: any, options: EcommerceScrapingOptions): Record<string, string> {
    const config: Record<string, string> = {
      name: selectors.name,
      price: selectors.price,
      currency: selectors.currency,
      availability: selectors.availability,
      description: selectors.description,
      images: selectors.images
    };

    // Add optional selectors based on options
    if (selectors.originalPrice) config.originalPrice = selectors.originalPrice;
    if (selectors.rating) config.rating = selectors.rating;
    if (selectors.reviewCount) config.reviewCount = selectors.reviewCount;
    if (selectors.brand) config.brand = selectors.brand;
    if (selectors.category) config.category = selectors.category;

    if (options.extractReviews && selectors.reviews) {
      config.reviewsContainer = selectors.reviews.container;
    }

    if (options.extractVariants && selectors.variants) {
      config.variantsContainer = selectors.variants.container;
    }

    if (options.extractRelatedProducts && selectors.relatedProducts) {
      config.relatedContainer = selectors.relatedProducts.container;
    }

    return config;
  }

  private async processEcommerceData(
    result: ScrapingResult,
    selectors: any,
    options: EcommerceScrapingOptions,
    siteType: string
  ): Promise<EcommerceScrapingResult> {
    const data = result.data as any;
    
    // Extract main product data
    const product = await this.extractProductData(data, siteType);
    
    // Extract reviews if requested
    let reviews: ProductReview[] | undefined;
    if (options.extractReviews && data.reviewsContainer) {
      reviews = await this.extractReviews(data, selectors, options.maxReviews || 50);
    }

    // Extract variants if requested
    let variants: ProductVariant[] | undefined;
    if (options.extractVariants && data.variantsContainer) {
      variants = await this.extractVariants(data, selectors, options.maxVariants || 20);
    }

    // Extract related products if requested
    let relatedProducts: RelatedProduct[] | undefined;
    if (options.extractRelatedProducts && data.relatedContainer) {
      relatedProducts = await this.extractRelatedProducts(
        data, 
        selectors, 
        options.maxRelatedProducts || 10
      );
    }

    // Clean all extracted data
    const cleaningResult = await DataCleaner.cleanProductData({
      product,
      reviews,
      variants,
      relatedProducts
    });

    return {
      ...result,
      product: cleaningResult.data.product,
      reviews: cleaningResult.data.reviews,
      variants: cleaningResult.data.variants,
      relatedProducts: cleaningResult.data.relatedProducts,
      data: cleaningResult.data
    };
  }

  private async extractProductData(data: any, siteType: string): Promise<EcommerceProduct> {
    const product: EcommerceProduct = {
      name: this.cleanText(data.name) || 'Unknown Product',
      price: this.extractPrice(data.price) || 0,
      currency: this.extractCurrency(data.currency, data.price) || 'USD',
      availability: this.extractAvailability(data.availability) || 'out-of-stock',
      description: this.cleanText(data.description) || '',
      images: this.extractImages(data.images) || [],
      url: data.url || '',
      rating: this.extractRating(data.rating),
      reviewCount: this.extractReviewCount(data.reviewCount),
      brand: this.cleanText(data.brand),
      category: this.cleanText(data.category),
      originalPrice: this.extractPrice(data.originalPrice)
    };

    // Calculate discount if both prices are available
    if (product.originalPrice && product.originalPrice > product.price) {
      product.discount = Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100
      );
    }

    return product;
  }

  private async extractReviews(
    data: any, 
    selectors: any, 
    maxReviews: number
  ): Promise<ProductReview[]> {
    // Implementation would depend on the specific site structure
    // This is a simplified version
    const reviews: ProductReview[] = [];
    
    // Extract review data from the scraped content
    // This would need to be more sophisticated in practice
    if (Array.isArray(data.reviewsContainer)) {
      for (const reviewData of data.reviewsContainer.slice(0, maxReviews)) {
        const review: ProductReview = {
          rating: this.extractRating(reviewData.rating) || 0,
          text: this.cleanText(reviewData.text) || '',
          author: this.cleanText(reviewData.author),
          date: this.parseDate(reviewData.date),
          verified: this.extractVerified(reviewData.verified)
        };
        
        if (review.text) {
          reviews.push(review);
        }
      }
    }

    return reviews;
  }

  private async extractVariants(
    data: any, 
    selectors: any, 
    maxVariants: number
  ): Promise<ProductVariant[]> {
    const variants: ProductVariant[] = [];
    
    if (Array.isArray(data.variantsContainer)) {
      for (const variantData of data.variantsContainer.slice(0, maxVariants)) {
        const variant: ProductVariant = {
          name: this.cleanText(variantData.name) || 'Variant',
          price: this.extractPrice(variantData.price) || 0,
          currency: this.extractCurrency(variantData.currency, variantData.price) || 'USD',
          availability: this.extractAvailability(variantData.availability) || 'out-of-stock',
          sku: this.cleanText(variantData.sku)
        };
        
        variants.push(variant);
      }
    }

    return variants;
  }

  private async extractRelatedProducts(
    data: any, 
    selectors: any, 
    maxProducts: number
  ): Promise<RelatedProduct[]> {
    const relatedProducts: RelatedProduct[] = [];
    
    if (Array.isArray(data.relatedContainer)) {
      for (const productData of data.relatedContainer.slice(0, maxProducts)) {
        const relatedProduct: RelatedProduct = {
          name: this.cleanText(productData.name) || 'Related Product',
          price: this.extractPrice(productData.price) || 0,
          currency: this.extractCurrency(productData.currency, productData.price) || 'USD',
          url: this.cleanText(productData.url) || '',
          image: this.extractFirstImage(productData.image),
          rating: this.extractRating(productData.rating)
        };
        
        if (relatedProduct.name && relatedProduct.url) {
          relatedProducts.push(relatedProduct);
        }
      }
    }

    return relatedProducts;
  }

  // Utility methods for data extraction and cleaning
  private cleanText(text: any): string | undefined {
    if (!text) return undefined;
    return String(text).trim().replace(/\s+/g, ' ') || undefined;
  }

  private extractPrice(priceText: any): number | undefined {
    if (!priceText) return undefined;
    
    const priceStr = String(priceText).replace(/[^\d.,]/g, '');
    const price = parseFloat(priceStr.replace(',', '.'));
    
    return isNaN(price) ? undefined : price;
  }

  private extractCurrency(currencyText: any, priceText?: any): string {
    if (currencyText && typeof currencyText === 'string') {
      const match = currencyText.match(/[A-Z]{3}|[$€£¥₹]/);
      if (match) return match[0];
    }
    
    if (priceText && typeof priceText === 'string') {
      if (priceText.includes('$')) return 'USD';
      if (priceText.includes('€')) return 'EUR';
      if (priceText.includes('£')) return 'GBP';
      if (priceText.includes('¥')) return 'JPY';
      if (priceText.includes('₹')) return 'INR';
    }
    
    return 'USD';
  }

  private extractAvailability(availabilityText: any): 'in-stock' | 'out-of-stock' | 'limited' {
    if (!availabilityText) return 'out-of-stock';
    
    const text = String(availabilityText).toLowerCase();
    
    if (text.includes('in stock') || text.includes('available') || text.includes('ready')) {
      return 'in-stock';
    }
    
    if (text.includes('limited') || text.includes('few left') || text.includes('hurry')) {
      return 'limited';
    }
    
    return 'out-of-stock';
  }

  private extractRating(ratingText: any): number | undefined {
    if (!ratingText) return undefined;
    
    const ratingStr = String(ratingText);
    const match = ratingStr.match(/(\d+(?:\.\d+)?)\s*(?:out of|of|\/)\s*5|(\d+(?:\.\d+)?)\s*stars?/i);
    
    if (match) {
      const rating = parseFloat(match[1] || match[2]);
      return isNaN(rating) ? undefined : Math.min(5, Math.max(0, rating));
    }
    
    return undefined;
  }

  private extractReviewCount(reviewCountText: any): number | undefined {
    if (!reviewCountText) return undefined;
    
    const countStr = String(reviewCountText).replace(/[^\d]/g, '');
    const count = parseInt(countStr, 10);
    
    return isNaN(count) ? undefined : count;
  }

  private extractImages(imageData: any): string[] {
    if (!imageData) return [];
    
    if (typeof imageData === 'string') {
      return [imageData];
    }
    
    if (Array.isArray(imageData)) {
      return imageData
        .map(img => typeof img === 'string' ? img : img.src)
        .filter(Boolean)
        .slice(0, 10); // Limit to first 10 images
    }
    
    return [];
  }

  private extractFirstImage(imageData: any): string | undefined {
    const images = this.extractImages(imageData);
    return images.length > 0 ? images[0] : undefined;
  }

  private parseDate(dateText: any): Date | undefined {
    if (!dateText) return undefined;
    
    const date = new Date(String(dateText));
    return isNaN(date.getTime()) ? undefined : date;
  }

  private extractVerified(verifiedText: any): boolean {
    if (!verifiedText) return false;
    
    const text = String(verifiedText).toLowerCase();
    return text.includes('verified') || text.includes('confirmed');
  }

  private generateJobId(): string {
    return `ecommerce_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async dispose(): Promise<void> {
    if (this.scraper) {
      await this.scraper.dispose();
      this.scraper = null;
    }
  }

  // Batch processing for multiple products
  async scrapeMultipleProducts(
    urls: string[], 
    options: EcommerceScrapingOptions = {}
  ): Promise<EcommerceScrapingResult[]> {
    const results: EcommerceScrapingResult[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.scrapeProduct(url, options);
        results.push(result);
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
      } catch (error) {
        logger.error('Failed to scrape product in batch', error, { url });
        results.push({
          url,
          data: {},
          metadata: {
            responseTime: 0,
            statusCode: 0,
            finalUrl: url,
            userAgent: '',
            timestamp: new Date(),
            extractedCount: 0
          },
          success: false,
          error: (error as Error).message,
          timestamp: new Date()
        });
      }
    }
    
    return results;
  }
}

export default EcommerceAgent;