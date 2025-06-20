/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

import { jest } from '@jest/globals';

// Extend Jest timeout for scraping operations
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeAll(() => {
  // Suppress console output during tests unless DEBUG is set
  if (!process.env.DEBUG) {
    console.error = jest.fn();
    console.warn = jest.fn();
    console.log = jest.fn();
  }
});

afterAll(() => {
  // Restore console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});

// Global test utilities
(global as any).testUtils = {
  // Helper to create test URLs
  createTestUrl: (path: string = '') => {
    const baseUrl = process.env.TEST_BASE_URL || 'https://httpbin.org';
    return `${baseUrl}${path}`;
  },

  // Helper to wait for a specified time
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to create test selectors
  createTestSelectors: () => ({
    title: 'title',
    heading: 'h1',
    content: 'body',
    links: 'a'
  }),

  // Helper to validate scraping result structure
  validateScrapingResult: (result: any) => {
    expect(result).toBeDefined();
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('metadata');
    expect(result.metadata).toHaveProperty('responseTime');
    expect(result.metadata).toHaveProperty('timestamp');
    
    if (result.success) {
      expect(result).toHaveProperty('data');
    } else {
      expect(result).toHaveProperty('error');
    }
  },

  // Helper to validate MCP tool response structure
  validateMCPResponse: (response: any) => {
    expect(response).toBeDefined();
    expect(response).toHaveProperty('success');
    expect(response).toHaveProperty('metadata');
    expect(response.metadata).toHaveProperty('toolName');
    expect(response.metadata).toHaveProperty('executionTime');
    expect(response.metadata).toHaveProperty('timestamp');
    expect(response.metadata).toHaveProperty('version');
  }
};

// Environment-specific setup
if (process.env.NODE_ENV === 'test') {
  // Set test-specific environment variables
  process.env.LOG_LEVEL = 'error';
  process.env.ENABLE_LOGGING = 'false';
  process.env.ENABLE_METRICS = 'false';
  process.env.MAX_CONCURRENT_REQUESTS = '2';
  process.env.SCRAPING_TIMEOUT = '10000';
}

// Cleanup after each test
afterEach(async () => {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

// Global error handler for unhandled rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in test:', reason);
});

// Add custom Jest matchers
expect.extend({
  toBeValidUrl(received: string) {
    try {
      new URL(received);
      return {
        message: () => `expected ${received} not to be a valid URL`,
        pass: true,
      };
    } catch {
      return {
        message: () => `expected ${received} to be a valid URL`,
        pass: false,
      };
    }
  },

  toHaveValidResponseTime(received: any) {
    const responseTime = received?.metadata?.responseTime;
    const isValid = typeof responseTime === 'number' && responseTime > 0 && responseTime < 60000;
    
    return {
      message: () => isValid 
        ? `expected response time ${responseTime} to be invalid`
        : `expected response time ${responseTime} to be a valid number between 0 and 60000`,
      pass: isValid,
    };
  },

  toBeSuccessfulScrapeResult(received: any) {
    const isValid = received?.success === true && 
                   received?.data !== undefined && 
                   received?.metadata?.responseTime > 0;
    
    return {
      message: () => isValid
        ? `expected scrape result to be unsuccessful`
        : `expected scrape result to be successful with data and valid metadata`,
      pass: isValid,
    };
  }
});

// Declare custom matchers for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUrl(): R;
      toHaveValidResponseTime(): R;
      toBeSuccessfulScrapeResult(): R;
    }
  }
}