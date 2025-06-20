/**
 * Advanced data cleaning and validation utilities
 */

import { z } from 'zod';
import type { DataValidationConfig, ValidationRule } from '@/types/scraping-types.js';
import logger from './logger.js';

export interface CleaningOptions {
  removeEmptyValues: boolean;
  trimWhitespace: boolean;
  normalizeUrls: boolean;
  parseNumbers: boolean;
  parseDates: boolean;
  removeHtmlTags: boolean;
  deduplication: boolean;
  maxLength?: number;
  allowedDomains?: string[];
  blockedWords?: string[];
}

export interface CleaningResult<T = any> {
  data: T;
  cleaned: number;
  removed: number;
  errors: Array<{ field: string; value: any; error: string }>;
  warnings: Array<{ field: string; value: any; warning: string }>;
}

export class DataCleaner {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
  private static readonly PHONE_REGEX = /^[\+]?[1-9][\d]{0,15}$/;
  private static readonly HTML_TAG_REGEX = /<[^>]*>/g;
  private static readonly WHITESPACE_REGEX = /\s+/g;

  constructor(private defaultOptions: CleaningOptions = this.getDefaultOptions()) {}

  private getDefaultOptions(): CleaningOptions {
    return {
      removeEmptyValues: true,
      trimWhitespace: true,
      normalizeUrls: true,
      parseNumbers: true,
      parseDates: true,
      removeHtmlTags: true,
      deduplication: true,
      maxLength: 10000
    };
  }

  async cleanData<T extends Record<string, any>>(
    data: T | T[],
    config?: DataValidationConfig,
    options?: Partial<CleaningOptions>
  ): Promise<CleaningResult<T | T[]>> {
    const cleaningOptions = { ...this.defaultOptions, ...options };
    const isArray = Array.isArray(data);
    const items = isArray ? data : [data];
    
    const result: CleaningResult<T | T[]> = {
      data: isArray ? [] : {} as T,
      cleaned: 0,
      removed: 0,
      errors: [],
      warnings: []
    };

    const cleanedItems: T[] = [];

    for (const item of items) {
      try {
        const cleanedItem = await this.cleanSingleItem(item, cleaningOptions);
        
        if (config) {
          const validationResult = this.validateItem(cleanedItem, config);
          result.errors.push(...validationResult.errors);
          result.warnings.push(...validationResult.warnings);
          
          if (config.strictMode && validationResult.errors.length > 0) {
            result.removed++;
            continue;
          }
        }

        cleanedItems.push(cleanedItem);
        result.cleaned++;
      } catch (error) {
        result.errors.push({
          field: 'general',
          value: item,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        result.removed++;
      }
    }

    // Deduplication
    if (cleaningOptions.deduplication && isArray) {
      const beforeCount = cleanedItems.length;
      const deduplicated = this.deduplicateArray(cleanedItems);
      result.removed += beforeCount - deduplicated.length;
      result.data = deduplicated as T | T[];
    } else {
      result.data = isArray ? cleanedItems : cleanedItems[0] || {} as T;
    }

    logger.debug('Data cleaning completed', {
      original: items.length,
      cleaned: result.cleaned,
      removed: result.removed,
      errors: result.errors.length,
      warnings: result.warnings.length
    });

    return result;
  }

  private async cleanSingleItem<T extends Record<string, any>>(
    item: T,
    options: CleaningOptions
  ): Promise<T> {
    const cleaned = { ...item };

    for (const [key, value] of Object.entries(cleaned)) {
      try {
        cleaned[key] = await this.cleanValue(value, key, options);
      } catch (error) {
        logger.warn(`Failed to clean field ${key}`, { key, value, error });
        // Keep original value if cleaning fails
      }
    }

    // Remove empty values if configured
    if (options.removeEmptyValues) {
      for (const [key, value] of Object.entries(cleaned)) {
        if (this.isEmpty(value)) {
          delete cleaned[key];
        }
      }
    }

    return cleaned;
  }

  private async cleanValue(value: any, fieldName: string, options: CleaningOptions): Promise<any> {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this.cleanString(value, fieldName, options);
    }

    if (Array.isArray(value)) {
      const cleaned = await Promise.all(
        value.map(item => this.cleanValue(item, fieldName, options))
      );
      return options.removeEmptyValues ? cleaned.filter(item => !this.isEmpty(item)) : cleaned;
    }

    if (typeof value === 'object') {
      return this.cleanSingleItem(value, options);
    }

    return value;
  }

  private cleanString(value: string, fieldName: string, options: CleaningOptions): string {
    let cleaned = value;

    // Remove HTML tags
    if (options.removeHtmlTags) {
      cleaned = cleaned.replace(DataCleaner.HTML_TAG_REGEX, '');
    }

    // Trim whitespace
    if (options.trimWhitespace) {
      cleaned = cleaned.trim();
      cleaned = cleaned.replace(DataCleaner.WHITESPACE_REGEX, ' ');
    }

    // Normalize URLs
    if (options.normalizeUrls && this.isUrl(cleaned)) {
      cleaned = this.normalizeUrl(cleaned);
    }

    // Parse numbers for numeric fields
    if (options.parseNumbers && this.isNumericField(fieldName) && this.isNumeric(cleaned)) {
      return this.parseNumber(cleaned).toString();
    }

    // Parse dates for date fields
    if (options.parseDates && this.isDateField(fieldName)) {
      const date = this.parseDate(cleaned);
      if (date) {
        return date.toISOString();
      }
    }

    // Enforce max length
    if (options.maxLength && cleaned.length > options.maxLength) {
      cleaned = cleaned.substring(0, options.maxLength) + '...';
    }

    // Check for blocked words
    if (options.blockedWords && this.containsBlockedWords(cleaned, options.blockedWords)) {
      throw new Error(`Content contains blocked words: ${fieldName}`);
    }

    return cleaned;
  }

  private validateItem<T extends Record<string, any>>(
    item: T,
    config: DataValidationConfig
  ): { errors: Array<{ field: string; value: any; error: string }>; warnings: Array<{ field: string; value: any; warning: string }> } {
    const errors: Array<{ field: string; value: any; error: string }> = [];
    const warnings: Array<{ field: string; value: any; warning: string }> = [];

    for (const rule of config.rules) {
      const value = item[rule.field];

      // Check required fields
      if (rule.required && this.isEmpty(value)) {
        errors.push({
          field: rule.field,
          value,
          error: `Field ${rule.field} is required`
        });
        continue;
      }

      // Skip validation for empty optional fields
      if (this.isEmpty(value)) {
        continue;
      }

      // Type validation
      if (!this.validateType(value, rule.type)) {
        errors.push({
          field: rule.field,
          value,
          error: `Field ${rule.field} must be of type ${rule.type}`
        });
        continue;
      }

      // Length validation for strings
      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push({
            field: rule.field,
            value,
            error: `Field ${rule.field} must be at least ${rule.minLength} characters`
          });
        }

        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push({
            field: rule.field,
            value,
            error: `Field ${rule.field} must not exceed ${rule.maxLength} characters`
          });
        }
      }

      // Pattern validation
      if (rule.pattern && typeof value === 'string') {
        const regex = new RegExp(rule.pattern);
        if (!regex.test(value)) {
          errors.push({
            field: rule.field,
            value,
            error: `Field ${rule.field} does not match required pattern`
          });
        }
      }

      // Custom validation
      if (rule.customValidator && !rule.customValidator(value)) {
        errors.push({
          field: rule.field,
          value,
          error: `Field ${rule.field} failed custom validation`
        });
      }
    }

    return { errors, warnings };
  }

  // Utility methods
  private isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  private isUrl(value: string): boolean {
    return DataCleaner.URL_REGEX.test(value);
  }

  private isEmail(value: string): boolean {
    return DataCleaner.EMAIL_REGEX.test(value);
  }

  private isPhone(value: string): boolean {
    const cleaned = value.replace(/[\s\-\(\)]/g, '');
    return DataCleaner.PHONE_REGEX.test(cleaned);
  }

  private isNumeric(value: string): boolean {
    return !isNaN(Number(value)) && !isNaN(parseFloat(value));
  }

  private isNumericField(fieldName: string): boolean {
    const numericFields = ['price', 'cost', 'amount', 'total', 'count', 'rating', 'score', 'number'];
    return numericFields.some(field => fieldName.toLowerCase().includes(field));
  }

  private isDateField(fieldName: string): boolean {
    const dateFields = ['date', 'time', 'created', 'updated', 'published', 'posted'];
    return dateFields.some(field => fieldName.toLowerCase().includes(field));
  }

  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove trailing slash and normalize
      return urlObj.href.replace(/\/$/, '');
    } catch {
      return url;
    }
  }

  private parseNumber(value: string): number {
    // Remove common non-numeric characters
    const cleaned = value.replace(/[$,\s]/g, '');
    return parseFloat(cleaned);
  }

  private parseDate(value: string): Date | null {
    // Try various date formats
    const formats = [
      // ISO format
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      // US format
      /^\d{1,2}\/\d{1,2}\/\d{4}/,
      // EU format
      /^\d{1,2}-\d{1,2}-\d{4}/,
      // Timestamp
      /^\d{10,13}$/
    ];

    for (const format of formats) {
      if (format.test(value)) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return null;
  }

  private containsBlockedWords(value: string, blockedWords: string[]): boolean {
    const lowerValue = value.toLowerCase();
    return blockedWords.some(word => lowerValue.includes(word.toLowerCase()));
  }

  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' || this.isNumeric(String(value));
      case 'boolean':
        return typeof value === 'boolean';
      case 'email':
        return typeof value === 'string' && this.isEmail(value);
      case 'url':
        return typeof value === 'string' && this.isUrl(value);
      case 'date':
        return value instanceof Date || this.parseDate(String(value)) !== null;
      default:
        return true;
    }
  }

  private deduplicateArray<T>(items: T[]): T[] {
    const seen = new Set();
    return items.filter(item => {
      const key = typeof item === 'object' ? JSON.stringify(item) : item;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Specialized cleaning methods
  static cleanProductData(data: any): any {
    const cleaner = new DataCleaner({
      removeEmptyValues: true,
      trimWhitespace: true,
      normalizeUrls: true,
      parseNumbers: true,
      parseDates: false,
      removeHtmlTags: true,
      deduplication: false
    });

    // Add product-specific validation rules
    const config: DataValidationConfig = {
      rules: [
        { field: 'name', type: 'string', required: true, minLength: 1, maxLength: 500 },
        { field: 'price', type: 'number', required: true },
        { field: 'url', type: 'url', required: true },
        { field: 'rating', type: 'number', customValidator: (v) => v >= 0 && v <= 5 },
        { field: 'availability', type: 'string', pattern: '^(in-stock|out-of-stock|limited)$' }
      ],
      strictMode: false
    };

    return cleaner.cleanData(data, config);
  }

  static cleanJobData(data: any): any {
    const cleaner = new DataCleaner({
      removeEmptyValues: true,
      trimWhitespace: true,
      normalizeUrls: true,
      parseNumbers: false,
      parseDates: true,
      removeHtmlTags: true,
      deduplication: true
    });

    const config: DataValidationConfig = {
      rules: [
        { field: 'title', type: 'string', required: true, minLength: 5, maxLength: 200 },
        { field: 'company', type: 'string', required: true, minLength: 2, maxLength: 100 },
        { field: 'location', type: 'string', required: true },
        { field: 'url', type: 'url', required: true },
        { field: 'jobType', type: 'string', pattern: '^(full-time|part-time|contract|internship)$' }
      ]
    };

    return cleaner.cleanData(data, config);
  }

  static cleanContactData(data: any): any {
    const cleaner = new DataCleaner({
      removeEmptyValues: true,
      trimWhitespace: true,
      normalizeUrls: true,
      parseNumbers: false,
      parseDates: false,
      removeHtmlTags: true,
      deduplication: true
    });

    const config: DataValidationConfig = {
      rules: [
        { field: 'name', type: 'string', required: true, minLength: 2, maxLength: 100 },
        { field: 'email', type: 'email', required: false },
        { field: 'website', type: 'url', required: false },
        { field: 'company', type: 'string', required: true, minLength: 2, maxLength: 100 }
      ]
    };

    return cleaner.cleanData(data, config);
  }
}

export default DataCleaner;