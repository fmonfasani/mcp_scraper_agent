/**
 * Specialized agent for lead generation and contact scraping
 */

import type { IScraper, ScrapingConfig, ScrapingResult, LeadContact } from '@/types/scraping-types.js';
import { scraperFactory } from '@/core/scraper-factory.js';
import DataCleaner from '@/utils/data-cleaner.js';
import logger from '@/utils/logger.js';

export interface LeadScrapingOptions {
  extractEmails?: boolean;
  extractPhones?: boolean;
  extractSocialMedia?: boolean;
  extractCompanyInfo?: boolean;
  validateContacts?: boolean;
  followPagination?: boolean;
  maxPages?: number;
  maxLeadsPerPage?: number;
  criteria?: LeadCriteria;
  contactTypes?: Array<'email' | 'phone' | 'linkedin' | 'website'>;
  industryFocus?: string[];
  locationFilter?: string[];
}

export interface LeadCriteria {
  industry?: string;
  location?: string;
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  jobTitles?: string[];
  keywords?: string[];
  excludeKeywords?: string[];
  minEmployees?: number;
  maxEmployees?: number;
  revenue?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  fundingStage?: 'seed' | 'series-a' | 'series-b' | 'series-c' | 'ipo' | 'acquired';
}

export interface ExtendedLeadContact extends LeadContact {
  id?: string;
  jobLevel?: 'entry' | 'mid' | 'senior' | 'executive' | 'c-level';
  department?: string;
  companyDetails?: {
    employees?: number;
    revenue?: string;
    industry?: string;
    foundedYear?: number;
    description?: string;
    technologies?: string[];
    competitors?: string[];
    fundingInfo?: {
      stage?: string;
      amount?: number;
      currency?: string;
      lastRound?: Date;
    };
  };
  contactQuality?: {
    score: number; // 1-100
    emailVerified?: boolean;
    phoneVerified?: boolean;
    lastActive?: Date;
    responseRate?: number;
  };
  socialProfiles?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    facebook?: string;
    instagram?: string;
  };
  leadSource?: string;
  tags?: string[];
  notes?: string;
  lastUpdated?: Date;
}

export interface LeadScrapingResult extends ScrapingResult {
  leads: ExtendedLeadContact[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalLeads: number;
    hasNext: boolean;
    nextPageUrl?: string;
  };
  searchMetadata?: {
    criteria?: LeadCriteria;
    resultsCount: number;
    source: string;
    searchQuery?: string;
  };
  qualityMetrics?: {
    averageScore: number;
    emailsFound: number;
    phonesFound: number;
    linkedinProfilesFound: number;
    verifiedContacts: number;
  };
}

export class LeadsAgent {
  private scraper: IScraper | null = null;
  private dataCleaner: DataCleaner;
  private siteSelectors: Map<string, any> = new Map();
  private emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  private phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;

  constructor() {
    this.dataCleaner = new DataCleaner();
    this.initializeSiteSelectors();
  }

  private initializeSiteSelectors(): void {
    // LinkedIn selectors (for public profiles)
    this.siteSelectors.set('linkedin', {
      profileContainer: '.pv-top-card, .profile-card',
      name: '.pv-top-card--photo h1, .profile-card__name',
      title: '.pv-top-card--experience-list h2, .profile-card__title',
      company: '.pv-top-card--experience-list .pv-entity__secondary-title, .profile-card__company',
      location: '.pv-top-card--location, .profile-card__location',
      industry: '.pv-top-card--industry',
      summary: '.pv-about__text, .profile-card__summary',
      experience: '.pv-profile-section__card-item',
      education: '.pv-education-entity',
      skills: '.pv-skill-category-entity__name'
    });

    // Apollo.io selectors
    this.siteSelectors.set('apollo', {
      leadContainer: '.finder-results-list-item, .contact-card',
      name: '.zp_Y6y8d, .contact-name',
      title: '.zp_aBhrx, .contact-title',
      company: '.zp_J1j8_, .contact-company',
      location: '.zp_Y6y8d, .contact-location',
      email: '.zp_Iu6Pf, .contact-email',
      phone: '.zp_xWEQy, .contact-phone',
      linkedin: '.zp_LJM8_, .contact-linkedin',
      industry: '.company-industry',
      companySize: '.company-size'
    });

    // ZoomInfo selectors
    this.siteSelectors.set('zoominfo', {
      leadContainer: '.contact-card, .person-card',
      name: '.contact-name, .person-name',
      title: '.contact-title, .person-title',
      company: '.contact-company, .company-name',
      location: '.contact-location',
      email: '.contact-email',
      phone: '.contact-phone',
      department: '.contact-department',
      companyInfo: '.company-details'
    });

    // Hunter.io selectors
    this.siteSelectors.set('hunter', {
      leadContainer: '.email-item, .contact-item',
      name: '.email-owner, .contact-name',
      title: '.email-position, .contact-title',
      company: '.email-company',
      email: '.email-address',
      confidence: '.email-confidence',
      sources: '.email-sources'
    });

    // Yellow Pages / Business directories
    this.siteSelectors.set('yellowpages', {
      businessContainer: '.result, .listing-item',
      name: '.business-name, .listing-title',
      address: '.street-address, .listing-address',
      phone: '.phone, .listing-phone',
      website: '.track-visit-website, .listing-website',
      category: '.categories, .listing-category',
      rating: '.rating, .listing-rating'
    });

    // Crunchbase selectors
    this.siteSelectors.set('crunchbase', {
      companyContainer: '.profile-section, .company-card',
      name: '.profile-header h1, .company-name',
      description: '.description, .company-description',
      industry: '.industry, .company-industry',
      location: '.location, .company-location',
      website: '.website-link',
      employees: '.employee-count',
      funding: '.funding-total',
      founders: '.founder-list .person-name'
    });

    // Generic business directory selectors
    this.siteSelectors.set('generic', {
      leadContainer: '.listing, .business, .contact, .person, [class*="contact"], [class*="listing"]',
      name: '.name, .title, .person-name, [class*="name"]',
      title: '.title, .position, .job-title, [class*="title"]',
      company: '.company, .business-name, [class*="company"]',
      email: '.email, [class*="email"], a[href^="mailto:"]',
      phone: '.phone, .tel, [class*="phone"], a[href^="tel:"]',
      website: '.website, .url, [class*="website"], a[href^="http"]',
      address: '.address, .location, [class*="address"]',
      linkedin: 'a[href*="linkedin.com"]',
      industry: '.industry, .category, [class*="industry"]'
    });
  }

  async scrapeLeads(
    url: string,
    options: LeadScrapingOptions = {}
  ): Promise<LeadScrapingResult> {
    const jobId = this.generateJobId();
    logger.info('Starting lead generation scraping', { jobId, url, options });

    try {
      // Create optimized scraper for lead generation (more cautious)
      this.scraper = await scraperFactory.createLeadScraper();

      // Detect site type and get appropriate selectors
      const siteType = this.detectSiteType(url);
      const selectors = this.getSiteSelectors(siteType);

      logger.debug('Lead source detected', { siteType, url });

      // Configure scraping with lead-specific options (conservative settings)
      const config: ScrapingConfig = {
        url,
        selectors: this.buildSelectorsConfig(selectors, options),
        options: {
          waitFor: 'networkidle',
          timeout: 20000,
          useRandomUserAgent: true,
          stealth: true,
          humanLikeDelay: true,
          maxConcurrent: 1, // Very conservative for lead generation
          delayBetweenRequests: 3000,
          extractLinks: true,
          cleanData: true,
          followPagination: options.followPagination,
          maxPages: options.maxPages || 3
        }
      };

      const result = await this.scraper.scrape(config);
      
      if (!result.success) {
        return result as LeadScrapingResult;
      }

      // Process and structure the lead data
      const leadResult = await this.processLeadData(
        result,
        selectors,
        options,
        siteType
      );

      logger.logScrapingSuccess(
        jobId,
        url,
        result.metadata.responseTime,
        leadResult.leads.length
      );

      return leadResult;

    } catch (error) {
      logger.logScrapingError(jobId, url, error as Error);
      
      return {
        url,
        leads: [],
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
    
    if (hostname.includes('linkedin.')) return 'linkedin';
    if (hostname.includes('apollo.')) return 'apollo';
    if (hostname.includes('zoominfo.')) return 'zoominfo';
    if (hostname.includes('hunter.')) return 'hunter';
    if (hostname.includes('yellowpages.')) return 'yellowpages';
    if (hostname.includes('crunchbase.')) return 'crunchbase';
    if (hostname.includes('salesnavigator.')) return 'salesnavigator';
    if (hostname.includes('rocketreach.')) return 'rocketreach';
    
    return 'generic';
  }

  private getSiteSelectors(siteType: string): any {
    return this.siteSelectors.get(siteType) || this.siteSelectors.get('generic');
  }

  private buildSelectorsConfig(selectors: any, options: LeadScrapingOptions): Record<string, string> {
    const config: Record<string, string> = {
      leadContainer: selectors.leadContainer || selectors.businessContainer || selectors.profileContainer,
      name: selectors.name,
      company: selectors.company
    };

    // Add optional selectors based on options
    if (selectors.title) config.title = selectors.title;
    if (selectors.location) config.location = selectors.location;
    if (selectors.industry) config.industry = selectors.industry;
    if (selectors.address) config.address = selectors.address;
    
    if (options.extractEmails && selectors.email) {
      config.email = selectors.email;
    }
    
    if (options.extractPhones && selectors.phone) {
      config.phone = selectors.phone;
    }
    
    if (options.extractSocialMedia) {
      if (selectors.linkedin) config.linkedin = selectors.linkedin;
      if (selectors.twitter) config.twitter = selectors.twitter;
      if (selectors.website) config.website = selectors.website;
    }
    
    if (options.extractCompanyInfo) {
      if (selectors.companyInfo) config.companyInfo = selectors.companyInfo;
      if (selectors.companySize) config.companySize = selectors.companySize;
      if (selectors.employees) config.employees = selectors.employees;
      if (selectors.funding) config.funding = selectors.funding;
    }

    return config;
  }

  private async processLeadData(
    result: ScrapingResult,
    selectors: any,
    options: LeadScrapingOptions,
    siteType: string
  ): Promise<LeadScrapingResult> {
    const data = result.data as any;
    
    // Extract leads
    const leads = await this.extractLeads(data, selectors, options, siteType);
    
    // Filter by criteria if specified
    const filteredLeads = this.filterByCriteria(leads, options.criteria);
    
    // Validate contacts if requested
    const validatedLeads = options.validateContacts ? 
      await this.validateContacts(filteredLeads) : filteredLeads;
    
    // Calculate quality scores
    const scoredLeads = this.calculateQualityScores(validatedLeads);
    
    // Extract pagination info
    const pagination = this.extractPaginationInfo(data, selectors);
    
    // Extract search metadata
    const searchMetadata = this.extractSearchMetadata(data, options, siteType);
    
    // Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics(scoredLeads);

    // Clean lead data
    const cleaningResult = await DataCleaner.cleanContactData(scoredLeads);

    return {
      ...result,
      leads: cleaningResult.data,
      pagination,
      searchMetadata,
      qualityMetrics,
      data: {
        leads: cleaningResult.data,
        pagination,
        searchMetadata,
        qualityMetrics
      }
    };
  }

  private async extractLeads(
    data: any,
    selectors: any,
    options: LeadScrapingOptions,
    siteType: string
  ): Promise<ExtendedLeadContact[]> {
    const leads: ExtendedLeadContact[] = [];
    
    const containerData = data.leadContainer || data.businessContainer || data.profileContainer;
    if (!Array.isArray(containerData)) {
      // Single lead page
      const lead = await this.extractSingleLead(data, siteType, options);
      if (lead) leads.push(lead);
      return leads;
    }

    const maxLeads = options.maxLeadsPerPage || 50;
    
    for (const leadData of containerData.slice(0, maxLeads)) {
      try {
        const lead = await this.extractSingleLead(leadData, siteType, options);
        if (lead && lead.name && (lead.email || lead.phone || lead.website)) {
          leads.push(lead);
        }
      } catch (error) {
        logger.warn('Failed to extract lead', { 
          error: (error as Error).message 
        });
      }
    }

    return leads;
  }

  private async extractSingleLead(
    leadData: any,
    siteType: string,
    options: LeadScrapingOptions
  ): Promise<ExtendedLeadContact | null> {
    const lead: ExtendedLeadContact = {
      name: this.cleanText(leadData.name) || '',
      title: this.cleanText(leadData.title),
      company: this.cleanText(leadData.company) || '',
      email: options.extractEmails ? this.extractEmail(leadData.email, leadData) : undefined,
      phone: options.extractPhones ? this.extractPhone(leadData.phone, leadData) : undefined,
      website: this.extractWebsite(leadData.website),
      address: this.cleanText(leadData.address || leadData.location),
      industry: this.cleanText(leadData.industry),
      id: this.generateLeadId(leadData.name, leadData.company),
      leadSource: siteType,
      lastUpdated: new Date()
    };

    // Extract LinkedIn profile
    if (options.extractSocialMedia && leadData.linkedin) {
      lead.linkedinUrl = this.extractLinkedInUrl(leadData.linkedin);
    }

    // Extract additional social media profiles
    if (options.extractSocialMedia) {
      lead.socialProfiles = this.extractSocialProfiles(leadData);
    }

    // Extract job level and department
    if (lead.title) {
      lead.jobLevel = this.extractJobLevel(lead.title);
      lead.department = this.extractDepartment(lead.title);
    }

    // Extract company details if available
    if (options.extractCompanyInfo) {
      lead.companyDetails = this.extractCompanyDetails(leadData);
    }

    // Add tags based on extracted data
    lead.tags = this.generateTags(lead);

    return lead.name && lead.company ? lead : null;
  }

  private extractEmail(emailData: any, fullData: any): string | undefined {
    let email: string | undefined;
    
    // Direct email extraction
    if (emailData && typeof emailData === 'string') {
      email = emailData;
    } else if (emailData && typeof emailData === 'object' && emailData.href) {
      email = emailData.href.replace('mailto:', '');
    }
    
    // Search for emails in full data if not found
    if (!email) {
      const fullText = JSON.stringify(fullData);
      const emailMatch = fullText.match(this.emailRegex);
      if (emailMatch) {
        email = emailMatch[0];
      }
    }
    
    return this.validateEmail(email) ? email : undefined;
  }

  private extractPhone(phoneData: any, fullData: any): string | undefined {
    let phone: string | undefined;
    
    // Direct phone extraction
    if (phoneData && typeof phoneData === 'string') {
      phone = phoneData;
    } else if (phoneData && typeof phoneData === 'object' && phoneData.href) {
      phone = phoneData.href.replace('tel:', '');
    }
    
    // Search for phones in full data if not found
    if (!phone) {
      const fullText = JSON.stringify(fullData);
      const phoneMatch = fullText.match(this.phoneRegex);
      if (phoneMatch) {
        phone = phoneMatch[0];
      }
    }
    
    return this.validatePhone(phone) ? this.formatPhone(phone) : undefined;
  }

  private extractWebsite(websiteData: any): string | undefined {
    if (!websiteData) return undefined;
    
    if (typeof websiteData === 'string') {
      return this.validateUrl(websiteData) ? websiteData : undefined;
    }
    
    if (typeof websiteData === 'object' && websiteData.href) {
      return this.validateUrl(websiteData.href) ? websiteData.href : undefined;
    }
    
    return undefined;
  }

  private extractLinkedInUrl(linkedinData: any): string | undefined {
    if (!linkedinData) return undefined;
    
    let url: string;
    if (typeof linkedinData === 'string') {
      url = linkedinData;
    } else if (typeof linkedinData === 'object' && linkedinData.href) {
      url = linkedinData.href;
    } else {
      return undefined;
    }
    
    return url.includes('linkedin.com') ? url : undefined;
  }

  private extractSocialProfiles(leadData: any): ExtendedLeadContact['socialProfiles'] {
    const profiles: ExtendedLeadContact['socialProfiles'] = {};
    
    if (leadData.linkedin) profiles.linkedin = this.extractLinkedInUrl(leadData.linkedin);
    if (leadData.twitter) profiles.twitter = this.extractSocialUrl(leadData.twitter, 'twitter.com');
    if (leadData.github) profiles.github = this.extractSocialUrl(leadData.github, 'github.com');
    if (leadData.facebook) profiles.facebook = this.extractSocialUrl(leadData.facebook, 'facebook.com');
    if (leadData.instagram) profiles.instagram = this.extractSocialUrl(leadData.instagram, 'instagram.com');
    
    return Object.keys(profiles).length > 0 ? profiles : undefined;
  }

  private extractSocialUrl(socialData: any, platform: string): string | undefined {
    if (!socialData) return undefined;
    
    let url: string;
    if (typeof socialData === 'string') {
      url = socialData;
    } else if (typeof socialData === 'object' && socialData.href) {
      url = socialData.href;
    } else {
      return undefined;
    }
    
    return url.includes(platform) ? url : undefined;
  }

  private extractJobLevel(title: string): ExtendedLeadContact['jobLevel'] {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('ceo') || lowerTitle.includes('cto') || lowerTitle.includes('cfo') ||
        lowerTitle.includes('president') || lowerTitle.includes('founder')) {
      return 'c-level';
    }
    
    if (lowerTitle.includes('vp') || lowerTitle.includes('vice president') ||
        lowerTitle.includes('director') || lowerTitle.includes('head of')) {
      return 'executive';
    }
    
    if (lowerTitle.includes('senior') || lowerTitle.includes('lead') ||
        lowerTitle.includes('principal') || lowerTitle.includes('manager')) {
      return 'senior';
    }
    
    if (lowerTitle.includes('junior') || lowerTitle.includes('entry') ||
        lowerTitle.includes('assistant') || lowerTitle.includes('intern')) {
      return 'entry';
    }
    
    return 'mid';
  }

  private extractDepartment(title: string): string | undefined {
    const lowerTitle = title.toLowerCase();
    
    const departments = [
      { keywords: ['sales', 'business development', 'account'], name: 'Sales' },
      { keywords: ['marketing', 'growth', 'demand generation'], name: 'Marketing' },
      { keywords: ['engineering', 'developer', 'software', 'technical'], name: 'Engineering' },
      { keywords: ['product', 'product management'], name: 'Product' },
      { keywords: ['hr', 'human resources', 'people'], name: 'Human Resources' },
      { keywords: ['finance', 'accounting', 'financial'], name: 'Finance' },
      { keywords: ['operations', 'ops', 'operational'], name: 'Operations' },
      { keywords: ['legal', 'compliance'], name: 'Legal' },
      { keywords: ['customer success', 'support', 'service'], name: 'Customer Success' }
    ];
    
    for (const dept of departments) {
      if (dept.keywords.some(keyword => lowerTitle.includes(keyword))) {
        return dept.name;
      }
    }
    
    return undefined;
  }

  private extractCompanyDetails(leadData: any): ExtendedLeadContact['companyDetails'] {
    const details: ExtendedLeadContact['companyDetails'] = {};
    
    if (leadData.employees) {
      details.employees = this.parseNumber(leadData.employees);
    }
    
    if (leadData.revenue) {
      details.revenue = this.cleanText(leadData.revenue);
    }
    
    if (leadData.industry) {
      details.industry = this.cleanText(leadData.industry);
    }
    
    if (leadData.founded || leadData.foundedYear) {
      details.foundedYear = this.parseNumber(leadData.founded || leadData.foundedYear);
    }
    
    if (leadData.description) {
      details.description = this.cleanText(leadData.description);
    }
    
    if (leadData.funding) {
      details.fundingInfo = this.extractFundingInfo(leadData.funding);
    }
    
    return Object.keys(details).length > 0 ? details : undefined;
  }

  private extractFundingInfo(fundingData: any): ExtendedLeadContact['companyDetails']['fundingInfo'] {
    if (!fundingData) return undefined;
    
    const fundingText = String(fundingData);
    const amountMatch = fundingText.match(/\$?([\d.]+)([MBK]?)/);
    
    if (amountMatch) {
      let amount = parseFloat(amountMatch[1]);
      const unit = amountMatch[2];
      
      if (unit === 'K') amount *= 1000;
      if (unit === 'M') amount *= 1000000;
      if (unit === 'B') amount *= 1000000000;
      
      return {
        amount,
        currency: 'USD',
        stage: this.extractFundingStage(fundingText)
      };
    }
    
    return undefined;
  }

  private extractFundingStage(fundingText: string): string | undefined {
    const lowerText = fundingText.toLowerCase();
    
    if (lowerText.includes('seed')) return 'seed';
    if (lowerText.includes('series a')) return 'series-a';
    if (lowerText.includes('series b')) return 'series-b';
    if (lowerText.includes('series c')) return 'series-c';
    if (lowerText.includes('ipo')) return 'ipo';
    if (lowerText.includes('acquired')) return 'acquired';
    
    return undefined;
  }

  private generateTags(lead: ExtendedLeadContact): string[] {
    const tags: string[] = [];
    
    if (lead.jobLevel) tags.push(lead.jobLevel);
    if (lead.department) tags.push(lead.department);
    if (lead.industry) tags.push(lead.industry);
    if (lead.email) tags.push('has-email');
    if (lead.phone) tags.push('has-phone');
    if (lead.linkedinUrl) tags.push('has-linkedin');
    if (lead.companyDetails?.employees) {
      if (lead.companyDetails.employees < 50) tags.push('small-company');
      else if (lead.companyDetails.employees < 200) tags.push('medium-company');
      else tags.push('large-company');
    }
    
    return tags;
  }

  private filterByCriteria(
    leads: ExtendedLeadContact[],
    criteria?: LeadCriteria
  ): ExtendedLeadContact[] {
    if (!criteria) return leads;
    
    return leads.filter(lead => {
      // Industry filter
      if (criteria.industry && lead.industry && 
          !lead.industry.toLowerCase().includes(criteria.industry.toLowerCase())) {
        return false;
      }
      
      // Location filter
      if (criteria.location && lead.address && 
          !lead.address.toLowerCase().includes(criteria.location.toLowerCase())) {
        return false;
      }
      
      // Job title filter
      if (criteria.jobTitles && criteria.jobTitles.length > 0 && lead.title) {
        const hasMatchingTitle = criteria.jobTitles.some(title => 
          lead.title!.toLowerCase().includes(title.toLowerCase())
        );
        if (!hasMatchingTitle) return false;
      }
      
      // Company size filter
      if (criteria.companySize && lead.companyDetails?.employees) {
        const employees = lead.companyDetails.employees;
        switch (criteria.companySize) {
          case 'startup':
            if (employees >= 50) return false;
            break;
          case 'small':
            if (employees < 50 || employees >= 200) return false;
            break;
          case 'medium':
            if (employees < 200 || employees >= 1000) return false;
            break;
          case 'large':
            if (employees < 1000) return false;
            break;
        }
      }
      
      // Keywords filter
      if (criteria.keywords && criteria.keywords.length > 0) {
        const searchText = `${lead.name} ${lead.title} ${lead.company} ${lead.industry}`.toLowerCase();
        const hasKeyword = criteria.keywords.some(keyword => 
          searchText.includes(keyword.toLowerCase())
        );
        if (!hasKeyword) return false;
      }
      
      // Exclude keywords filter
      if (criteria.excludeKeywords && criteria.excludeKeywords.length > 0) {
        const searchText = `${lead.name} ${lead.title} ${lead.company} ${lead.industry}`.toLowerCase();
        const hasExcludedKeyword = criteria.excludeKeywords.some(keyword => 
          searchText.includes(keyword.toLowerCase())
        );
        if (hasExcludedKeyword) return false;
      }
      
      return true;
    });
  }

  private async validateContacts(leads: ExtendedLeadContact[]): Promise<ExtendedLeadContact[]> {
    // Basic validation - in production, you'd integrate with email/phone validation services
    return leads.map(lead => {
      if (!lead.contactQuality) {
        lead.contactQuality = { score: 0 };
      }
      
      if (lead.email) {
        lead.contactQuality.emailVerified = this.validateEmail(lead.email);
      }
      
      if (lead.phone) {
        lead.contactQuality.phoneVerified = this.validatePhone(lead.phone);
      }
      
      return lead;
    });
  }

  private calculateQualityScores(leads: ExtendedLeadContact[]): ExtendedLeadContact[] {
    return leads.map(lead => {
      let score = 0;
      
      // Basic info
      if (lead.name) score += 10;
      if (lead.title) score += 15;
      if (lead.company) score += 10;
      
      // Contact info
      if (lead.email) score += 25;
      if (lead.phone) score += 20;
      if (lead.website) score += 10;
      if (lead.linkedinUrl) score += 15;
      
      // Quality indicators
      if (lead.contactQuality?.emailVerified) score += 10;
      if (lead.contactQuality?.phoneVerified) score += 10;
      if (lead.industry) score += 5;
      if (lead.address) score += 5;
      
      // Job level bonus
      if (lead.jobLevel === 'c-level') score += 15;
      else if (lead.jobLevel === 'executive') score += 10;
      else if (lead.jobLevel === 'senior') score += 5;
      
      if (!lead.contactQuality) {
        lead.contactQuality = { score: 0 };
      }
      lead.contactQuality.score = Math.min(100, score);
      
      return lead;
    });
  }

  private calculateQualityMetrics(leads: ExtendedLeadContact[]): LeadScrapingResult['qualityMetrics'] {
    const totalLeads = leads.length;
    if (totalLeads === 0) {
      return {
        averageScore: 0,
        emailsFound: 0,
        phonesFound: 0,
        linkedinProfilesFound: 0,
        verifiedContacts: 0
      };
    }
    
    const totalScore = leads.reduce((sum, lead) => sum + (lead.contactQuality?.score || 0), 0);
    const emailsFound = leads.filter(lead => lead.email).length;
    const phonesFound = leads.filter(lead => lead.phone).length;
    const linkedinProfilesFound = leads.filter(lead => lead.linkedinUrl).length;
    const verifiedContacts = leads.filter(lead => 
      lead.contactQuality?.emailVerified || lead.contactQuality?.phoneVerified
    ).length;
    
    return {
      averageScore: Math.round(totalScore / totalLeads),
      emailsFound,
      phonesFound,
      linkedinProfilesFound,
      verifiedContacts
    };
  }

  // Utility methods
  private cleanText(text: any): string | undefined {
    if (!text) return undefined;
    return String(text).trim().replace(/\s+/g, ' ') || undefined;
  }

  private parseNumber(value: any): number | undefined {
    if (!value) return undefined;
    const num = parseInt(String(value).replace(/[^\d]/g, ''), 10);
    return isNaN(num) ? undefined : num;
  }

  private validateEmail(email?: string): boolean {
    if (!email) return false;
    return this.emailRegex.test(email);
  }

  private validatePhone(phone?: string): boolean {
    if (!phone) return false;
    return this.phoneRegex.test(phone);
  }

  private validateUrl(url?: string): boolean {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private formatPhone(phone?: string): string | undefined {
    if (!phone) return undefined;
    return phone.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  }

  private extractPaginationInfo(data: any, selectors: any): LeadScrapingResult['pagination'] | undefined {
    const containerData = data.leadContainer || data.businessContainer || data.profileContainer;
    return {
      currentPage: 1,
      totalPages: 1,
      totalLeads: Array.isArray(containerData) ? containerData.length : 1,
      hasNext: false
    };
  }

  private extractSearchMetadata(
    data: any,
    options: LeadScrapingOptions,
    siteType: string
  ): LeadScrapingResult['searchMetadata'] {
    const containerData = data.leadContainer || data.businessContainer || data.profileContainer;
    return {
      criteria: options.criteria,
      resultsCount: Array.isArray(containerData) ? containerData.length : 1,
      source: siteType
    };
  }

  private generateLeadId(name?: any, company?: any): string {
    const namePart = name ? String(name).replace(/\s+/g, '-').toLowerCase() : 'lead';
    const companyPart = company ? String(company).replace(/\s+/g, '-').toLowerCase() : 'company';
    return `${namePart}-${companyPart}-${Date.now()}`;
  }

  private generateJobId(): string {
    return `leads_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async dispose(): Promise<void> {
    if (this.scraper) {
      await this.scraper.dispose();
      this.scraper = null;
    }
  }

  // Batch processing for multiple lead sources
  async scrapeMultipleSources(
    urls: string[],
    options: LeadScrapingOptions = {}
  ): Promise<LeadScrapingResult[]> {
    const results: LeadScrapingResult[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.scrapeLeads(url, options);
        results.push(result);
        
        // Add significant delay between requests for lead generation
        await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 5000));
      } catch (error) {
        logger.error('Failed to scrape leads in batch', error, { url });
        results.push({
          url,
          leads: [],
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

  // Specialized methods for different lead types
  async scrapeTechLeads(url: string): Promise<LeadScrapingResult> {
    return this.scrapeLeads(url, {
      extractEmails: true,
      extractSocialMedia: true,
      extractCompanyInfo: true,
      validateContacts: true,
      criteria: {
        industry: 'technology',
        jobTitles: ['developer', 'engineer', 'architect', 'tech lead', 'cto'],
        keywords: ['software', 'programming', 'development', 'engineering']
      }
    });
  }

  async scrapeSalesLeads(url: string): Promise<LeadScrapingResult> {
    return this.scrapeLeads(url, {
      extractEmails: true,
      extractPhones: true,
      extractSocialMedia: true,
      validateContacts: true,
      criteria: {
        jobTitles: ['sales', 'business development', 'account manager', 'revenue'],
        keywords: ['sales', 'business', 'revenue', 'growth']
      }
    });
  }

  async scrapeExecutiveLeads(url: string): Promise<LeadScrapingResult> {
    return this.scrapeLeads(url, {
      extractEmails: true,
      extractSocialMedia: true,
      extractCompanyInfo: true,
      validateContacts: true,
      criteria: {
        jobTitles: ['ceo', 'cto', 'cfo', 'vp', 'director', 'president', 'founder'],
        keywords: ['executive', 'leadership', 'management', 'c-level']
      }
    });
  }
}

export default LeadsAgent;