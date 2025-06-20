/**
 * Specialized agent for news article scraping
 */

import type { IScraper, ScrapingConfig, ScrapingResult, NewsArticle } from '@/types/scraping-types.js';
import { scraperFactory } from '@/core/scraper-factory.js';
import DataCleaner from '@/utils/data-cleaner.js';
import logger from '@/utils/logger.js';

export interface NewsScrapingOptions {
  extractContent?: boolean;
  extractSummary?: boolean;
  extractAuthor?: boolean;
  extractTags?: boolean;
  extractComments?: boolean;
  extractRelatedArticles?: boolean;
  followPagination?: boolean;
  maxPages?: number;
  maxArticlesPerPage?: number;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  categories?: string[];
  contentMinLength?: number;
}

export interface ExtendedNewsArticle extends NewsArticle {
  id?: string;
  subtitle?: string;
  readTime?: number;
  wordCount?: number;
  socialShares?: {
    facebook?: number;
    twitter?: number;
    linkedin?: number;
    total?: number;
  };
  comments?: Array<{
    author: string;
    content: string;
    date: Date;
    likes?: number;
  }>;
  relatedArticles?: Array<{
    title: string;
    url: string;
    publishedDate?: Date;
    category?: string;
  }>;
  seoData?: {
    metaDescription?: string;
    keywords?: string[];
    canonicalUrl?: string;
  };
  multimedia?: {
    images: Array<{
      url: string;
      caption?: string;
      credit?: string;
      alt?: string;
    }>;
    videos?: Array<{
      url: string;
      thumbnail?: string;
      duration?: number;
    }>;
  };
}

export interface NewsScrapingResult extends ScrapingResult {
  articles: ExtendedNewsArticle[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalArticles: number;
    hasNext: boolean;
    nextPageUrl?: string;
  };
  searchMetadata?: {
    category?: string;
    dateRange?: {
      from: string;
      to: string;
    };
    resultsCount: number;
    source: string;
  };
}

export class NewsAgent {
  private scraper: IScraper | null = null;
  private dataCleaner: DataCleaner;
  private siteSelectors: Map<string, any> = new Map();

  constructor() {
    this.dataCleaner = new DataCleaner();
    this.initializeSiteSelectors();
  }

  private initializeSiteSelectors(): void {
    // CNN selectors
    this.siteSelectors.set('cnn', {
      articleContainer: '.container__item, .card',
      title: 'h1, .headline__text, .card__headline',
      subtitle: '.subtitle, .deck',
      author: '.byline__name, .author',
      publishedDate: '.timestamp, .article__meta time',
      content: '.article__content, .zn-body__paragraph',
      summary: '.article__intro, .summary',
      category: '.breadcrumb, .article__section',
      tags: '.tag, .keywords a',
      url: 'a[href*="/article"], .card__link',
      image: '.media__image, .image img',
      relatedArticles: '.related-content .card'
    });

    // BBC selectors
    this.siteSelectors.set('bbc', {
      articleContainer: '.gs-container, .media-list__item',
      title: 'h1, .media-list__title, .gs-u-fs-headline',
      author: '.byline__name, .author-name',
      publishedDate: '.date, time[datetime]',
      content: '.story-body__text, .rich-text p',
      summary: '.story-body__introduction',
      category: '.navigation, .section-label',
      url: 'a[href*="/news/"]',
      image: '.media-list__image img, .story-image img',
      tags: '.tags a'
    });

    // Reuters selectors
    this.siteSelectors.set('reuters', {
      articleContainer: '.story-card, .article-wrap',
      title: 'h1, .story-title, .article-heading',
      author: '.byline, .author',
      publishedDate: '.timestamp, .date-line time',
      content: '.article-body p, .story-content p',
      summary: '.article-subtitle, .summary',
      category: '.kicker, .section',
      url: 'a[href*="/article/"]',
      image: '.story-photo img, .article-media img'
    });

    // TechCrunch selectors
    this.siteSelectors.set('techcrunch', {
      articleContainer: '.post-block, .post',
      title: 'h1, .post-block__title, .entry-title',
      author: '.byline a, .author-name',
      publishedDate: '.timestamp, .entry-date',
      content: '.entry-content p, .article-content p',
      summary: '.excerpt, .post-excerpt',
      category: '.category, .taxonomy',
      tags: '.tags a, .post-tags a',
      url: 'a[href*="/post/"], .post-block__title__link',
      image: '.post-block__media img, .featured-image img',
      socialShares: '.social-count, .share-count'
    });

    // The Verge selectors
    this.siteSelectors.set('theverge', {
      articleContainer: '.c-entry-box, .c-entry-summary',
      title: 'h1, .c-entry-summary__headline, .c-entry-box__title',
      author: '.c-byline__author, .author',
      publishedDate: '.c-byline__item time, .entry-date',
      content: '.c-entry-content p, .article-body p',
      summary: '.c-entry-summary__excerpt',
      category: '.c-entry-summary__kicker',
      url: '.c-entry-box__image-wrapper a, .c-entry-summary__headline-link',
      image: '.c-entry-box__image, .featured-image'
    });

    // Generic news site selectors
    this.siteSelectors.set('generic', {
      articleContainer: 'article, .article, .post, .entry, [class*="article"], [class*="story"]',
      title: 'h1, .title, .headline, [class*="title"], [class*="headline"]',
      subtitle: '.subtitle, .deck, .standfirst, [class*="subtitle"]',
      author: '.author, .byline, .writer, [class*="author"], [class*="byline"]',
      publishedDate: 'time, .date, .published, [class*="date"], [class*="time"]',
      content: '.content p, .article-content p, .entry-content p, .story-content p',
      summary: '.summary, .excerpt, .intro, [class*="summary"], [class*="excerpt"]',
      category: '.category, .section, .topic, [class*="category"]',
      tags: '.tags a, .keywords a, [class*="tag"] a',
      url: 'a[href*="/article/"], a[href*="/story/"], a[href*="/news/"]',
      image: '.featured-image img, .article-image img, .hero-image img'
    });
  }

  async scrapeNews(
    url: string,
    options: NewsScrapingOptions = {}
  ): Promise<NewsScrapingResult> {
    const jobId = this.generateJobId();
    logger.info('Starting news scraping', { jobId, url, options });

    try {
      // Create optimized scraper for news sites
      this.scraper = await scraperFactory.createNewsScraper();

      // Detect site type and get appropriate selectors
      const siteType = this.detectSiteType(url);
      const selectors = this.getSiteSelectors(siteType);

      logger.debug('News site detected', { siteType, url });

      // Configure scraping with news-specific options
      const config: ScrapingConfig = {
        url,
        selectors: this.buildSelectorsConfig(selectors, options),
        options: {
          waitFor: 'load',
          timeout: 15000,
          useRandomUserAgent: true,
          extractImages: true,
          extractLinks: options.extractRelatedArticles,
          cleanData: true,
          followPagination: options.followPagination,
          maxPages: options.maxPages || 3
        }
      };

      const result = await this.scraper.scrape(config);
      
      if (!result.success) {
        return result as NewsScrapingResult;
      }

      // Process and structure the news data
      const newsResult = await this.processNewsData(
        result,
        selectors,
        options,
        siteType
      );

      logger.logScrapingSuccess(
        jobId,
        url,
        result.metadata.responseTime,
        newsResult.articles.length
      );

      return newsResult;

    } catch (error) {
      logger.logScrapingError(jobId, url, error as Error);
      
      return {
        url,
        articles: [],
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
    
    if (hostname.includes('cnn.')) return 'cnn';
    if (hostname.includes('bbc.')) return 'bbc';
    if (hostname.includes('reuters.')) return 'reuters';
    if (hostname.includes('techcrunch.')) return 'techcrunch';
    if (hostname.includes('theverge.')) return 'theverge';
    if (hostname.includes('bloomberg.')) return 'bloomberg';
    if (hostname.includes('guardian.')) return 'guardian';
    if (hostname.includes('nytimes.')) return 'nytimes';
    if (hostname.includes('washingtonpost.')) return 'washingtonpost';
    
    return 'generic';
  }

  private getSiteSelectors(siteType: string): any {
    return this.siteSelectors.get(siteType) || this.siteSelectors.get('generic');
  }

  private buildSelectorsConfig(selectors: any, options: NewsScrapingOptions): Record<string, string> {
    const config: Record<string, string> = {
      articleContainer: selectors.articleContainer,
      title: selectors.title,
      publishedDate: selectors.publishedDate,
      url: selectors.url
    };

    // Add optional selectors based on options
    if (selectors.subtitle) config.subtitle = selectors.subtitle;
    if (selectors.category) config.category = selectors.category;
    if (selectors.image) config.image = selectors.image;
    
    if (options.extractContent && selectors.content) {
      config.content = selectors.content;
    }
    
    if (options.extractSummary && selectors.summary) {
      config.summary = selectors.summary;
    }
    
    if (options.extractAuthor && selectors.author) {
      config.author = selectors.author;
    }
    
    if (options.extractTags && selectors.tags) {
      config.tags = selectors.tags;
    }

    if (options.extractRelatedArticles && selectors.relatedArticles) {
      config.relatedArticles = selectors.relatedArticles;
    }

    return config;
  }

  private async processNewsData(
    result: ScrapingResult,
    selectors: any,
    options: NewsScrapingOptions,
    siteType: string
  ): Promise<NewsScrapingResult> {
    const data = result.data as any;
    
    // Extract articles
    const articles = await this.extractArticles(data, selectors, options, siteType);
    
    // Filter by date range if specified
    const filteredArticles = this.filterByDateRange(articles, options.dateRange);
    
    // Filter by content length if specified
    const finalArticles = this.filterByContentLength(filteredArticles, options.contentMinLength);
    
    // Extract pagination info
    const pagination = this.extractPaginationInfo(data, selectors);
    
    // Extract search metadata
    const searchMetadata = this.extractSearchMetadata(data, options, siteType);

    // Clean article data
    const cleaningResult = await this.dataCleaner.cleanData(finalArticles);

    return {
      ...result,
      articles: cleaningResult.data,
      pagination,
      searchMetadata,
      data: {
        articles: cleaningResult.data,
        pagination,
        searchMetadata
      }
    };
  }

  private async extractArticles(
    data: any,
    selectors: any,
    options: NewsScrapingOptions,
    siteType: string
  ): Promise<ExtendedNewsArticle[]> {
    const articles: ExtendedNewsArticle[] = [];
    
    if (!Array.isArray(data.articleContainer)) {
      // Single article page
      const article = await this.extractSingleArticle(data, siteType, options);
      if (article) articles.push(article);
      return articles;
    }

    const maxArticles = options.maxArticlesPerPage || 20;
    
    for (const articleData of data.articleContainer.slice(0, maxArticles)) {
      try {
        const article = await this.extractSingleArticle(articleData, siteType, options);
        if (article && article.title && article.url) {
          articles.push(article);
        }
      } catch (error) {
        logger.warn('Failed to extract article', { 
          error: (error as Error).message 
        });
      }
    }

    return articles;
  }

  private async extractSingleArticle(
    articleData: any,
    siteType: string,
    options: NewsScrapingOptions
  ): Promise<ExtendedNewsArticle | null> {
    const article: ExtendedNewsArticle = {
      title: this.cleanText(articleData.title) || '',
      author: options.extractAuthor ? this.cleanText(articleData.author) : undefined,
      publishedDate: this.parseDate(articleData.publishedDate) || new Date(),
      content: options.extractContent ? this.extractContent(articleData.content) : '',
      summary: options.extractSummary ? this.cleanText(articleData.summary) : undefined,
      category: this.cleanText(articleData.category),
      tags: options.extractTags ? this.extractTags(articleData.tags) : [],
      url: this.extractUrl(articleData.url) || '',
      imageUrl: this.extractImageUrl(articleData.image),
      source: this.extractSource(siteType),
      id: this.generateArticleId(articleData.title, articleData.url)
    };

    // Add extended properties
    if (articleData.subtitle) {
      article.subtitle = this.cleanText(articleData.subtitle);
    }

    // Calculate read time and word count if content is available
    if (article.content) {
      article.wordCount = this.calculateWordCount(article.content);
      article.readTime = this.calculateReadTime(article.wordCount);
    }

    // Extract multimedia data
    article.multimedia = this.extractMultimedia(articleData);

    // Extract SEO data
    article.seoData = this.extractSEOData(articleData);

    // Extract social shares if available
    if (articleData.socialShares) {
      article.socialShares = this.extractSocialShares(articleData.socialShares);
    }

    // Extract related articles if requested
    if (options.extractRelatedArticles && articleData.relatedArticles) {
      article.relatedArticles = this.extractRelatedArticles(articleData.relatedArticles);
    }

    return article.title && article.url ? article : null;
  }

  private extractContent(contentData: any): string {
    if (!contentData) return '';
    
    if (Array.isArray(contentData)) {
      return contentData
        .map(p => typeof p === 'string' ? p : p.text || '')
        .filter(Boolean)
        .join('\n\n');
    }
    
    return String(contentData);
  }

  private extractTags(tagsData: any): string[] {
    if (!tagsData) return [];
    
    if (Array.isArray(tagsData)) {
      return tagsData
        .map(tag => typeof tag === 'string' ? tag : tag.text || '')
        .filter(Boolean);
    }
    
    const tagsText = String(tagsData);
    return tagsText.split(/[,;]/).map(tag => tag.trim()).filter(Boolean);
  }

  private extractImageUrl(imageData: any): string | undefined {
    if (!imageData) return undefined;
    
    if (typeof imageData === 'string') {
      return imageData;
    }
    
    if (typeof imageData === 'object') {
      return imageData.src || imageData.url || imageData.href;
    }
    
    return undefined;
  }

  private extractSource(siteType: string): string {
    const sources = {
      'cnn': 'CNN',
      'bbc': 'BBC News',
      'reuters': 'Reuters',
      'techcrunch': 'TechCrunch',
      'theverge': 'The Verge',
      'bloomberg': 'Bloomberg',
      'guardian': 'The Guardian',
      'nytimes': 'The New York Times',
      'washingtonpost': 'The Washington Post'
    };
    
    return sources[siteType as keyof typeof sources] || 'Unknown Source';
  }

  private calculateWordCount(content: string): number {
    return content.trim().split(/\s+/).length;
  }

  private calculateReadTime(wordCount: number): number {
    // Average reading speed: 200 words per minute
    return Math.ceil(wordCount / 200);
  }

  private extractMultimedia(articleData: any): ExtendedNewsArticle['multimedia'] {
    const multimedia: ExtendedNewsArticle['multimedia'] = {
      images: []
    };

    // Extract images
    if (articleData.image) {
      const images = Array.isArray(articleData.image) ? articleData.image : [articleData.image];
      multimedia.images = images.map(img => ({
        url: typeof img === 'string' ? img : img.src || img.url,
        caption: typeof img === 'object' ? img.caption || img.alt : undefined,
        credit: typeof img === 'object' ? img.credit : undefined,
        alt: typeof img === 'object' ? img.alt : undefined
      })).filter(img => img.url);
    }

    // Extract videos if present
    if (articleData.video) {
      multimedia.videos = Array.isArray(articleData.video) ? articleData.video : [articleData.video];
    }

    return multimedia;
  }

  private extractSEOData(articleData: any): ExtendedNewsArticle['seoData'] {
    return {
      metaDescription: articleData.metaDescription || articleData.description,
      keywords: articleData.keywords ? this.extractTags(articleData.keywords) : undefined,
      canonicalUrl: articleData.canonicalUrl
    };
  }

  private extractSocialShares(sharesData: any): ExtendedNewsArticle['socialShares'] {
    if (!sharesData) return undefined;

    const shares: ExtendedNewsArticle['socialShares'] = {};

    if (typeof sharesData === 'object') {
      shares.facebook = parseInt(sharesData.facebook, 10) || undefined;
      shares.twitter = parseInt(sharesData.twitter, 10) || undefined;
      shares.linkedin = parseInt(sharesData.linkedin, 10) || undefined;
      
      if (shares.facebook || shares.twitter || shares.linkedin) {
        shares.total = (shares.facebook || 0) + (shares.twitter || 0) + (shares.linkedin || 0);
      }
    }

    return Object.keys(shares).length > 0 ? shares : undefined;
  }

  private extractRelatedArticles(relatedData: any): ExtendedNewsArticle['relatedArticles'] {
    if (!relatedData) return undefined;

    const related = Array.isArray(relatedData) ? relatedData : [relatedData];
    
    return related.map(item => ({
      title: this.cleanText(item.title) || '',
      url: this.extractUrl(item.url) || '',
      publishedDate: this.parseDate(item.date),
      category: this.cleanText(item.category)
    })).filter(item => item.title && item.url);
  }

  private filterByDateRange(
    articles: ExtendedNewsArticle[], 
    dateRange?: NewsScrapingOptions['dateRange']
  ): ExtendedNewsArticle[] {
    if (!dateRange) return articles;

    return articles.filter(article => {
      const articleDate = article.publishedDate;
      
      if (dateRange.from && articleDate < dateRange.from) {
        return false;
      }
      
      if (dateRange.to && articleDate > dateRange.to) {
        return false;
      }
      
      return true;
    });
  }

  private filterByContentLength(
    articles: ExtendedNewsArticle[], 
    minLength?: number
  ): ExtendedNewsArticle[] {
    if (!minLength) return articles;

    return articles.filter(article => {
      return !article.wordCount || article.wordCount >= minLength;
    });
  }

  // Utility methods
  private cleanText(text: any): string | undefined {
    if (!text) return undefined;
    return String(text).trim().replace(/\s+/g, ' ') || undefined;
  }

  private parseDate(dateText: any): Date | undefined {
    if (!dateText) return undefined;
    
    const date = new Date(String(dateText));
    return isNaN(date.getTime()) ? undefined : date;
  }

  private extractUrl(urlData: any): string {
    if (!urlData) return '';
    
    if (typeof urlData === 'string') {
      return urlData;
    }
    
    if (typeof urlData === 'object' && urlData.href) {
      return urlData.href;
    }
    
    return '';
  }

  private extractPaginationInfo(data: any, selectors: any): NewsScrapingResult['pagination'] | undefined {
    return {
      currentPage: 1,
      totalPages: 1,
      totalArticles: Array.isArray(data.articleContainer) ? data.articleContainer.length : 1,
      hasNext: false
    };
  }

  private extractSearchMetadata(
    data: any, 
    options: NewsScrapingOptions, 
    siteType: string
  ): NewsScrapingResult['searchMetadata'] {
    return {
      category: options.categories?.[0],
      dateRange: options.dateRange ? {
        from: options.dateRange.from?.toISOString() || '',
        to: options.dateRange.to?.toISOString() || ''
      } : undefined,
      resultsCount: Array.isArray(data.articleContainer) ? data.articleContainer.length : 1,
      source: this.extractSource(siteType)
    };
  }

  private generateArticleId(title?: any, url?: any): string {
    const titlePart = title ? String(title).replace(/\s+/g, '-').toLowerCase() : 'article';
    const urlHash = url ? String(url).split('/').pop() : Date.now().toString();
    return `${titlePart}-${urlHash}`;
  }

  private generateJobId(): string {
    return `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async dispose(): Promise<void> {
    if (this.scraper) {
      await this.scraper.dispose();
      this.scraper = null;
    }
  }

  // Batch processing for multiple news sources
  async scrapeMultipleSources(
    urls: string[],
    options: NewsScrapingOptions = {}
  ): Promise<NewsScrapingResult[]> {
    const results: NewsScrapingResult[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.scrapeNews(url, options);
        results.push(result);
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      } catch (error) {
        logger.error('Failed to scrape news in batch', error, { url });
        results.push({
          url,
          articles: [],
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

  // Specialized methods for different news types
  async scrapeTechNews(url: string): Promise<NewsScrapingResult> {
    return this.scrapeNews(url, {
      extractContent: true,
      extractAuthor: true,
      extractTags: true,
      extractRelatedArticles: true,
      categories: ['technology', 'tech', 'innovation'],
      contentMinLength: 200
    });
  }

  async scrapeBreakingNews(url: string): Promise<NewsScrapingResult> {
    return this.scrapeNews(url, {
      extractContent: true,
      extractSummary: true,
      extractAuthor: true,
      maxArticlesPerPage: 10,
      categories: ['breaking', 'urgent', 'live']
    });
  }

  async scrapeBusinessNews(url: string): Promise<NewsScrapingResult> {
    return this.scrapeNews(url, {
      extractContent: true,
      extractAuthor: true,
      extractTags: true,
      categories: ['business', 'finance', 'economy', 'markets'],
      contentMinLength: 300
    });
  }
}

export default NewsAgent;