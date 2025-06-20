/**
 * Specialized agent for job listings scraping
 */

import type { IScraper, ScrapingConfig, ScrapingResult, JobListing } from '@/types/scraping-types.js';
import { scraperFactory } from '@/core/scraper-factory.js';
import DataCleaner from '@/utils/data-cleaner.js';
import logger from '@/utils/logger.js';

export interface JobScrapingOptions {
  extractDescription?: boolean;
  extractRequirements?: boolean;
  extractBenefits?: boolean;
  extractCompanyInfo?: boolean;
  extractSalaryDetails?: boolean;
  followPagination?: boolean;
  maxPages?: number;
  maxJobsPerPage?: number;
  filters?: JobFilters;
}

export interface JobFilters {
  location?: string;
  jobType?: 'full-time' | 'part-time' | 'contract' | 'internship' | 'temporary';
  remote?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  datePosted?: 'today' | 'week' | 'month' | 'any';
  companySize?: 'startup' | 'small' | 'medium' | 'large';
  industry?: string;
  keywords?: string[];
}

export interface ExtendedJobListing extends JobListing {
  id?: string;
  companyInfo?: {
    size?: string;
    industry?: string;
    founded?: number;
    headquarters?: string;
    website?: string;
    logo?: string;
  };
  salaryDetails?: {
    min?: number;
    max?: number;
    currency: string;
    period: 'hour' | 'day' | 'month' | 'year';
    estimated?: boolean;
    equity?: boolean;
    bonus?: string;
  };
  applicationInfo?: {
    deadline?: Date;
    applicants?: number;
    easy_apply?: boolean;
    external_url?: string;
  };
  skills?: string[];
  seniority?: string;
  workLocation?: {
    type: 'remote' | 'on-site' | 'hybrid';
    office_address?: string;
  };
}

export interface JobScrapingResult extends ScrapingResult {
  jobs: ExtendedJobListing[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalJobs: number;
    hasNext: boolean;
    nextPageUrl?: string;
  };
  searchMetadata?: {
    query?: string;
    location?: string;
    filters?: JobFilters;
    resultsCount: number;
  };
}

export class JobsAgent {
  private scraper: IScraper | null = null;
  private dataCleaner: DataCleaner;
  private siteSelectors: Map<string, any> = new Map();

  constructor() {
    this.dataCleaner = new DataCleaner();
    this.initializeSiteSelectors();
  }

  private initializeSiteSelectors(): void {
    // Indeed selectors
    this.siteSelectors.set('indeed', {
      jobContainer: '.job_seen_beacon, .slider_container .slider_item',
      title: 'h2 a[data-jk] span, .jobTitle a span',
      company: '.companyName a, .companyName span',
      location: '.companyLocation, [data-testid="job-location"]',
      salary: '.salary-snippet, .metadata.salary-snippet-container',
      description: '.job-snippet, .summary ul li',
      jobType: '.attribute_snippet, .metadata',
      postedDate: '.date, [data-testid="myJobsStateDate"]',
      url: 'h2 a[data-jk], .jobTitle a',
      requirements: '.jobsearch-jobDescriptionText ul li',
      benefits: '.jobsearch-JobComponent-benefits',
      companyInfo: '.jobsearch-JobComponent-companyInsights',
      pagination: {
        nextPage: 'a[aria-label="Next Page"], .np:last-child',
        pageNumbers: '.pn',
        totalPages: '.pn:last-child'
      }
    });

    // LinkedIn selectors
    this.siteSelectors.set('linkedin', {
      jobContainer: '.jobs-search__results-list li, .job-result-card',
      title: '.job-result-card__title, .job-title a',
      company: '.job-result-card__subtitle-link, .company-name',
      location: '.job-result-card__location, .job-location',
      salary: '.job-result-card__salary-info',
      description: '.job-result-card__snippet, .description-text',
      jobType: '.job-result-card__job-criteria-item',
      postedDate: '.job-result-card__listdate, .posted-time-ago',
      url: '.job-result-card__title-link, .job-title a',
      easyApply: '.jobs-apply-button--top-card',
      applicants: '.job-result-card__meta-item',
      companySize: '.job-criteria__text',
      industry: '.job-criteria__text'
    });

    // Glassdoor selectors
    this.siteSelectors.set('glassdoor', {
      jobContainer: '.react-job-listing, .jobContainer',
      title: '[data-test="job-title"], .jobTitle',
      company: '[data-test="employer-name"], .employerName',
      location: '[data-test="job-location"], .location',
      salary: '[data-test="salary"], .salary',
      description: '.jobDescriptionContent, .desc',
      rating: '.rating, .compactStars',
      postedDate: '[data-test="job-age"], .jobAge',
      url: '[data-test="job-title"] a, .jobTitle a',
      jobType: '.jobType, .metadata',
      companyInfo: '.empBasicInfo',
      benefits: '.benefits'
    });

    // Monster selectors
    this.siteSelectors.set('monster', {
      jobContainer: '.mux-search-results__item, .jobprofile',
      title: '.jobprofile-title a, .title',
      company: '.company a, .companyname',
      location: '.location, .jobprofile-location',
      salary: '.salary, .jobprofile-salary',
      description: '.summary, .jobprofile-description',
      postedDate: '.posted, .jobprofile-posted',
      url: '.jobprofile-title a, .title a'
    });

    // Generic job board selectors
    this.siteSelectors.set('generic', {
      jobContainer: '.job, .job-item, .job-listing, [class*="job"], [class*="listing"]',
      title: 'h1, h2, h3, .title, .job-title, [class*="title"]',
      company: '.company, .employer, [class*="company"]',
      location: '.location, .job-location, [class*="location"]',
      salary: '.salary, .pay, .compensation, [class*="salary"]',
      description: '.description, .summary, [class*="description"]',
      jobType: '.type, .job-type, [class*="type"]',
      postedDate: '.date, .posted, [class*="date"], [class*="posted"]',
      url: 'a[href*="/job"], a[href*="/career"], a[href*="/position"]'
    });
  }

  async scrapeJobs(
    url: string,
    options: JobScrapingOptions = {}
  ): Promise<JobScrapingResult> {
    const jobId = this.generateJobId();
    logger.info('Starting job listings scraping', { jobId, url, options });

    try {
      // Create optimized scraper for job boards
      this.scraper = await scraperFactory.createJobScraper();

      // Detect site type and get appropriate selectors
      const siteType = this.detectSiteType(url);
      const selectors = this.getSiteSelectors(siteType);

      logger.debug('Job board detected', { siteType, url });

      // Configure scraping with job-specific options
      const config: ScrapingConfig = {
        url,
        selectors: this.buildSelectorsConfig(selectors, options),
        options: {
          waitFor: 'networkidle',
          timeout: 25000,
          useRandomUserAgent: true,
          stealth: true,
          humanLikeDelay: true,
          extractLinks: true,
          cleanData: true,
          followPagination: options.followPagination,
          maxPages: options.maxPages || 5
        }
      };

      const result = await this.scraper.scrape(config);
      
      if (!result.success) {
        return result as JobScrapingResult;
      }

      // Process and structure the job data
      const jobResult = await this.processJobData(
        result,
        selectors,
        options,
        siteType
      );

      logger.logScrapingSuccess(
        jobId,
        url,
        result.metadata.responseTime,
        jobResult.jobs.length
      );

      return jobResult;

    } catch (error) {
      logger.logScrapingError(jobId, url, error as Error);
      
      return {
        url,
        jobs: [],
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
    
    if (hostname.includes('indeed.')) return 'indeed';
    if (hostname.includes('linkedin.')) return 'linkedin';
    if (hostname.includes('glassdoor.')) return 'glassdoor';
    if (hostname.includes('monster.')) return 'monster';
    if (hostname.includes('ziprecruiter.')) return 'ziprecruiter';
    if (hostname.includes('careerbuilder.')) return 'careerbuilder';
    
    return 'generic';
  }

  private getSiteSelectors(siteType: string): any {
    return this.siteSelectors.get(siteType) || this.siteSelectors.get('generic');
  }

  private buildSelectorsConfig(selectors: any, options: JobScrapingOptions): Record<string, string> {
    const config: Record<string, string> = {
      jobContainer: selectors.jobContainer,
      title: selectors.title,
      company: selectors.company,
      location: selectors.location,
      postedDate: selectors.postedDate,
      url: selectors.url
    };

    // Add optional selectors based on options
    if (selectors.salary) config.salary = selectors.salary;
    if (selectors.jobType) config.jobType = selectors.jobType;
    
    if (options.extractDescription && selectors.description) {
      config.description = selectors.description;
    }
    
    if (options.extractRequirements && selectors.requirements) {
      config.requirements = selectors.requirements;
    }
    
    if (options.extractBenefits && selectors.benefits) {
      config.benefits = selectors.benefits;
    }
    
    if (options.extractCompanyInfo && selectors.companyInfo) {
      config.companyInfo = selectors.companyInfo;
    }

    return config;
  }

  private async processJobData(
    result: ScrapingResult,
    selectors: any,
    options: JobScrapingOptions,
    siteType: string
  ): Promise<JobScrapingResult> {
    const data = result.data as any;
    
    // Extract job listings
    const jobs = await this.extractJobListings(data, selectors, options, siteType);
    
    // Extract pagination info
    const pagination = this.extractPaginationInfo(data, selectors);
    
    // Extract search metadata
    const searchMetadata = this.extractSearchMetadata(data, options.filters);

    // Clean job data
    const cleaningResult = await DataCleaner.cleanJobData(jobs);

    return {
      ...result,
      jobs: cleaningResult.data,
      pagination,
      searchMetadata,
      data: {
        jobs: cleaningResult.data,
        pagination,
        searchMetadata
      }
    };
  }

  private async extractJobListings(
    data: any,
    selectors: any,
    options: JobScrapingOptions,
    siteType: string
  ): Promise<ExtendedJobListing[]> {
    const jobs: ExtendedJobListing[] = [];
    
    if (!Array.isArray(data.jobContainer)) {
      return jobs;
    }

    const maxJobs = options.maxJobsPerPage || 50;
    
    for (const jobData of data.jobContainer.slice(0, maxJobs)) {
      try {
        const job = await this.extractSingleJob(jobData, siteType, options);
        if (job && job.title && job.company) {
          jobs.push(job);
        }
      } catch (error) {
        logger.warn('Failed to extract job listing', { 
          error: (error as Error).message 
        });
      }
    }

    return jobs;
  }

  private async extractSingleJob(
    jobData: any,
    siteType: string,
    options: JobScrapingOptions
  ): Promise<ExtendedJobListing | null> {
    const job: ExtendedJobListing = {
      title: this.cleanText(jobData.title) || '',
      company: this.cleanText(jobData.company) || '',
      location: this.cleanText(jobData.location) || '',
      description: options.extractDescription ? this.cleanText(jobData.description) || '' : '',
      requirements: options.extractRequirements ? this.extractRequirements(jobData.requirements) : [],
      benefits: options.extractBenefits ? this.extractBenefits(jobData.benefits) : [],
      jobType: this.extractJobType(jobData.jobType) || 'full-time',
      remote: this.extractRemoteInfo(jobData.location, jobData.jobType),
      postedDate: this.parseDate(jobData.postedDate) || new Date(),
      url: this.extractUrl(jobData.url) || '',
      id: this.generateJobListingId(jobData.title, jobData.company)
    };

    // Extract salary information
    if (jobData.salary) {
      job.salary = this.extractSalaryInfo(jobData.salary);
      job.salaryDetails = this.extractDetailedSalaryInfo(jobData.salary);
    }

    // Extract company information if available
    if (options.extractCompanyInfo && jobData.companyInfo) {
      job.companyInfo = this.extractCompanyInfo(jobData.companyInfo);
    }

    // Extract skills and requirements
    if (job.description) {
      job.skills = this.extractSkillsFromDescription(job.description);
      job.seniority = this.extractSeniorityLevel(job.title, job.description);
    }

    // Determine work location type
    job.workLocation = this.extractWorkLocation(job.location, job.description);

    return job.title && job.company ? job : null;
  }

  private extractSalaryInfo(salaryData: any): JobListing['salary'] | undefined {
    if (!salaryData) return undefined;
    
    const salaryText = String(salaryData);
    const salaryMatch = salaryText.match(/[\$€£¥₹]?([\d,]+)(?:\s*-\s*[\$€£¥₹]?([\d,]+))?/);
    
    if (salaryMatch) {
      const min = parseInt(salaryMatch[1].replace(/,/g, ''), 10);
      const max = salaryMatch[2] ? parseInt(salaryMatch[2].replace(/,/g, ''), 10) : undefined;
      
      return {
        min: min || undefined,
        max: max || undefined,
        currency: this.extractCurrency(salaryText),
        period: this.extractSalaryPeriod(salaryText)
      };
    }
    
    return undefined;
  }

  private extractDetailedSalaryInfo(salaryData: any): ExtendedJobListing['salaryDetails'] | undefined {
    if (!salaryData) return undefined;
    
    const salaryText = String(salaryData).toLowerCase();
    const baseSalary = this.extractSalaryInfo(salaryData);
    
    if (!baseSalary) return undefined;
    
    return {
      min: baseSalary.min,
      max: baseSalary.max,
      currency: baseSalary.currency,
      period: baseSalary.period,
      estimated: salaryText.includes('estimated') || salaryText.includes('estimate'),
      equity: salaryText.includes('equity') || salaryText.includes('stock'),
      bonus: this.extractBonusInfo(salaryText)
    };
  }

  private extractCompanyInfo(companyData: any): ExtendedJobListing['companyInfo'] | undefined {
    if (!companyData) return undefined;
    
    const companyText = String(companyData);
    
    return {
      size: this.extractCompanySize(companyText),
      industry: this.extractIndustry(companyText),
      founded: this.extractFoundedYear(companyText),
      headquarters: this.extractHeadquarters(companyText)
    };
  }

  private extractSkillsFromDescription(description: string): string[] {
    const skills: string[] = [];
    const commonSkills = [
      'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'AWS', 'Docker',
      'TypeScript', 'HTML', 'CSS', 'Git', 'Linux', 'MongoDB', 'PostgreSQL',
      'Express', 'Angular', 'Vue.js', 'PHP', 'C++', 'C#', '.NET', 'Ruby',
      'Go', 'Rust', 'Swift', 'Kotlin', 'Flutter', 'React Native', 'GraphQL',
      'REST API', 'Microservices', 'Kubernetes', 'Jenkins', 'CI/CD', 'Agile',
      'Scrum', 'TDD', 'Machine Learning', 'AI', 'Data Science', 'Analytics'
    ];
    
    const lowerDescription = description.toLowerCase();
    
    for (const skill of commonSkills) {
      if (lowerDescription.includes(skill.toLowerCase())) {
        skills.push(skill);
      }
    }
    
    return Array.from(new Set(skills)); // Remove duplicates
  }

  private extractSeniorityLevel(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('senior') || text.includes('lead') || text.includes('principal')) {
      return 'senior';
    }
    if (text.includes('junior') || text.includes('entry') || text.includes('intern')) {
      return 'entry';
    }
    if (text.includes('mid') || text.includes('intermediate')) {
      return 'mid';
    }
    if (text.includes('director') || text.includes('head') || text.includes('vp')) {
      return 'executive';
    }
    
    return 'mid'; // default
  }

  private extractWorkLocation(location: string, description?: string): ExtendedJobListing['workLocation'] {
    const locationText = `${location} ${description || ''}`.toLowerCase();
    
    if (locationText.includes('remote') || locationText.includes('work from home')) {
      return { type: 'remote' };
    }
    
    if (locationText.includes('hybrid') || locationText.includes('flexible')) {
      return { type: 'hybrid', office_address: location };
    }
    
    return { type: 'on-site', office_address: location };
  }

  // Utility methods for data extraction
  private cleanText(text: any): string | undefined {
    if (!text) return undefined;
    return String(text).trim().replace(/\s+/g, ' ') || undefined;
  }

  private extractJobType(jobTypeData: any): JobListing['jobType'] {
    if (!jobTypeData) return 'full-time';
    
    const text = String(jobTypeData).toLowerCase();
    
    if (text.includes('part-time') || text.includes('part time')) return 'part-time';
    if (text.includes('contract') || text.includes('contractor')) return 'contract';
    if (text.includes('intern') || text.includes('internship')) return 'internship';
    if (text.includes('temporary') || text.includes('temp')) return 'full-time'; // Default to full-time for temp
    
    return 'full-time';
  }

  private extractRemoteInfo(location: any, jobType: any): boolean {
    const text = `${location || ''} ${jobType || ''}`.toLowerCase();
    return text.includes('remote') || text.includes('work from home') || text.includes('wfh');
  }

  private parseDate(dateText: any): Date | undefined {
    if (!dateText) return undefined;
    
    const text = String(dateText);
    
    // Handle relative dates like "3 days ago"
    const daysAgoMatch = text.match(/(\d+)\s*days?\s*ago/i);
    if (daysAgoMatch) {
      const daysAgo = parseInt(daysAgoMatch[1], 10);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      return date;
    }
    
    // Handle "today", "yesterday"
    if (text.toLowerCase().includes('today')) {
      return new Date();
    }
    if (text.toLowerCase().includes('yesterday')) {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      return date;
    }
    
    // Try to parse as regular date
    const date = new Date(text);
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

  private extractCurrency(salaryText: string): string {
    if (salaryText.includes('$')) return 'USD';
    if (salaryText.includes('€')) return 'EUR';
    if (salaryText.includes('£')) return 'GBP';
    if (salaryText.includes('¥')) return 'JPY';
    if (salaryText.includes('₹')) return 'INR';
    
    return 'USD'; // Default
  }

  private extractSalaryPeriod(salaryText: string): 'hour' | 'day' | 'month' | 'year' {
    const text = salaryText.toLowerCase();
    
    if (text.includes('hour') || text.includes('/hr')) return 'hour';
    if (text.includes('day') || text.includes('/day')) return 'day';
    if (text.includes('month') || text.includes('/mo')) return 'month';
    
    return 'year'; // Default
  }

  private extractRequirements(requirementsData: any): string[] {
    if (!requirementsData) return [];
    
    if (Array.isArray(requirementsData)) {
      return requirementsData.map(req => String(req).trim()).filter(Boolean);
    }
    
    const text = String(requirementsData);
    return text.split(/[•\n\r]/).map(req => req.trim()).filter(Boolean);
  }

  private extractBenefits(benefitsData: any): string[] {
    if (!benefitsData) return [];
    
    if (Array.isArray(benefitsData)) {
      return benefitsData.map(benefit => String(benefit).trim()).filter(Boolean);
    }
    
    const text = String(benefitsData);
    return text.split(/[•\n\r]/).map(benefit => benefit.trim()).filter(Boolean);
  }

  private extractBonusInfo(salaryText: string): string | undefined {
    const bonusMatch = salaryText.match(/bonus[:\s]*([^,\n]+)/i);
    return bonusMatch ? bonusMatch[1].trim() : undefined;
  }

  private extractCompanySize(companyText: string): string | undefined {
    const text = companyText.toLowerCase();
    
    if (text.includes('1-10') || text.includes('startup')) return 'startup';
    if (text.includes('11-50') || text.includes('small')) return 'small';
    if (text.includes('51-200') || text.includes('medium')) return 'medium';
    if (text.includes('200+') || text.includes('large') || text.includes('enterprise')) return 'large';
    
    return undefined;
  }

  private extractIndustry(companyText: string): string | undefined {
    // This would be more sophisticated in practice
    const industries = [
      'technology', 'software', 'healthcare', 'finance', 'education', 
      'retail', 'manufacturing', 'consulting', 'media', 'non-profit'
    ];
    
    const text = companyText.toLowerCase();
    for (const industry of industries) {
      if (text.includes(industry)) {
        return industry;
      }
    }
    
    return undefined;
  }

  private extractFoundedYear(companyText: string): number | undefined {
    const yearMatch = companyText.match(/founded\s*(?:in\s*)?(\d{4})/i);
    return yearMatch ? parseInt(yearMatch[1], 10) : undefined;
  }

  private extractHeadquarters(companyText: string): string | undefined {
    const hqMatch = companyText.match(/(?:headquarters|based|located)\s*(?:in\s*)?([^,\n]+)/i);
    return hqMatch ? hqMatch[1].trim() : undefined;
  }

  private extractPaginationInfo(data: any, selectors: any): JobScrapingResult['pagination'] | undefined {
    // Implementation would depend on the specific site structure
    // This is a simplified version
    return {
      currentPage: 1,
      totalPages: 1,
      totalJobs: Array.isArray(data.jobContainer) ? data.jobContainer.length : 0,
      hasNext: false
    };
  }

  private extractSearchMetadata(data: any, filters?: JobFilters): JobScrapingResult['searchMetadata'] {
    return {
      filters,
      resultsCount: Array.isArray(data.jobContainer) ? data.jobContainer.length : 0
    };
  }

  private generateJobListingId(title?: string, company?: string): string {
    const titlePart = title ? title.replace(/\s+/g, '-').toLowerCase() : 'job';
    const companyPart = company ? company.replace(/\s+/g, '-').toLowerCase() : 'company';
    return `${titlePart}-${companyPart}-${Date.now()}`;
  }

  private generateJobId(): string {
    return `jobs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async dispose(): Promise<void> {
    if (this.scraper) {
      await this.scraper.dispose();
      this.scraper = null;
    }
  }

  // Batch processing for multiple job boards
  async scrapeMultipleSites(
    urls: string[],
    options: JobScrapingOptions = {}
  ): Promise<JobScrapingResult[]> {
    const results: JobScrapingResult[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.scrapeJobs(url, options);
        results.push(result);
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
      } catch (error) {
        logger.error('Failed to scrape jobs in batch', error, { url });
        results.push({
          url,
          jobs: [],
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

export default JobsAgent;