/**
 * Anti-detection utilities for stealth web scraping
 */

import UserAgent from 'user-agents';
import { Page, BrowserContext, Browser } from 'playwright';
import type { ProxyConfig } from '@/types/scraping-types.js';
import logger from './logger.js';

export interface StealthConfig {
  enableUserAgentRotation: boolean;
  enableViewportRandomization: boolean;
  enableTimingRandomization: boolean;
  enableNavigationPatterns: boolean;
  enableJavaScriptContext: boolean;
  enableWebGLFingerprinting: boolean;
  enableCanvasFingerprinting: boolean;
  enableAudioFingerprinting: boolean;
  customHeaders?: Record<string, string>;
  proxyRotation?: boolean;
  proxyList?: ProxyConfig[];
}

export class AntiDetectionManager {
  private userAgents: string[] = [];
  private currentUserAgent = '';
  private proxyPool: ProxyConfig[] = [];
  private currentProxyIndex = 0;
  private requestCount = 0;
  private lastRequestTime = 0;

  constructor(private config: StealthConfig = this.getDefaultConfig()) {
    this.initializeUserAgents();
    if (config.proxyList) {
      this.proxyPool = config.proxyList;
    }
  }

  private getDefaultConfig(): StealthConfig {
    return {
      enableUserAgentRotation: true,
      enableViewportRandomization: true,
      enableTimingRandomization: true,
      enableNavigationPatterns: true,
      enableJavaScriptContext: true,
      enableWebGLFingerprinting: true,
      enableCanvasFingerprinting: true,
      enableAudioFingerprinting: true,
      proxyRotation: false
    };
  }

  private initializeUserAgents(): void {
    // Generate diverse user agents
    const userAgentGenerator = new UserAgent([
      /Chrome/,
      /Firefox/,
      /Safari/,
      /Edge/
    ]);

    this.userAgents = Array.from({ length: 50 }, () => 
      userAgentGenerator.random().toString()
    );

    // Add some specific high-quality user agents
    this.userAgents.push(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
    );

    this.currentUserAgent = this.getRandomUserAgent();
  }

  getRandomUserAgent(): string {
    const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    if (this.config.enableUserAgentRotation && userAgent !== this.currentUserAgent) {
      logger.logUserAgentRotation(this.currentUserAgent, userAgent);
      this.currentUserAgent = userAgent;
    }
    return userAgent;
  }

  getRandomViewport(): { width: number; height: number } {
    if (!this.config.enableViewportRandomization) {
      return { width: 1920, height: 1080 };
    }

    const commonViewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1536, height: 864 },
      { width: 1440, height: 900 },
      { width: 1280, height: 720 },
      { width: 2560, height: 1440 },
      { width: 1680, height: 1050 }
    ];

    return commonViewports[Math.floor(Math.random() * commonViewports.length)];
  }

  async getHumanLikeDelay(): Promise<number> {
    if (!this.config.enableTimingRandomization) {
      return 0;
    }

    // Simulate human-like delays between requests
    const baseDelay = 800 + Math.random() * 2200; // 0.8-3 seconds
    const variation = Math.random() * 500 - 250; // ±250ms variation
    const delay = Math.max(100, baseDelay + variation);
    
    logger.logHumanLikeDelay(delay);
    return delay;
  }

  getCurrentProxy(): ProxyConfig | null {
    if (!this.config.proxyRotation || this.proxyPool.length === 0) {
      return null;
    }
    return this.proxyPool[this.currentProxyIndex];
  }

  rotateProxy(): ProxyConfig | null {
    if (!this.config.proxyRotation || this.proxyPool.length === 0) {
      return null;
    }

    const oldProxy = this.getCurrentProxy();
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxyPool.length;
    const newProxy = this.getCurrentProxy();

    if (oldProxy && newProxy) {
      logger.logProxyRotation(
        `${oldProxy.host}:${oldProxy.port}`,
        `${newProxy.host}:${newProxy.port}`
      );
    }

    return newProxy;
  }

  getStealthHeaders(url: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    };

    // Add referer for better stealth (not for first request)
    if (this.requestCount > 0) {
      const urlObj = new URL(url);
      headers['Referer'] = `${urlObj.protocol}//${urlObj.hostname}`;
    }

    // Add custom headers if provided
    if (this.config.customHeaders) {
      Object.assign(headers, this.config.customHeaders);
    }

    return headers;
  }

  async applyStealthMode(page: Page, url: string): Promise<void> {
    logger.logStealthModeEnabled(url);

    // Set user agent
    if (this.config.enableUserAgentRotation) {
      await page.setUserAgent(this.getRandomUserAgent());
    }

    // Set viewport
    if (this.config.enableViewportRandomization) {
      const viewport = this.getRandomViewport();
      await page.setViewportSize(viewport);
    }

    // Set headers
    await page.setExtraHTTPHeaders(this.getStealthHeaders(url));

    // Apply JavaScript context modifications
    if (this.config.enableJavaScriptContext) {
      await this.injectStealthScript(page);
    }

    // Add navigation patterns
    if (this.config.enableNavigationPatterns) {
      await this.simulateHumanBehavior(page);
    }

    this.requestCount++;
  }

  private async injectStealthScript(page: Page): Promise<void> {
    await page.addInitScript(() => {
      // Override navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Override navigator.languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Override navigator.permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Override plugin array
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Override chrome runtime
      if (!window.chrome) {
        window.chrome = {};
      }
      if (!window.chrome.runtime) {
        window.chrome.runtime = {};
      }

      // Override WebGL fingerprinting
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter(parameter);
      };

      // Override canvas fingerprinting
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type) {
        if (type === 'image/png') {
          // Add slight randomization to canvas fingerprint
          const context = this.getContext('2d');
          if (context) {
            const imageData = context.getImageData(0, 0, this.width, this.height);
            for (let i = 0; i < imageData.data.length; i += 4) {
              if (Math.random() < 0.001) {
                imageData.data[i] = Math.floor(Math.random() * 255);
              }
            }
            context.putImageData(imageData, 0, 0);
          }
        }
        return originalToDataURL.apply(this, arguments);
      };

      // Override audio fingerprinting
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
        AudioContext.prototype.createAnalyser = function() {
          const analyser = originalCreateAnalyser.call(this);
          const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
          analyser.getFloatFrequencyData = function(array) {
            originalGetFloatFrequencyData.call(this, array);
            // Add slight noise to audio fingerprint
            for (let i = 0; i < array.length; i++) {
              array[i] += Math.random() * 0.0001 - 0.00005;
            }
          };
          return analyser;
        };
      }
    });
  }

  private async simulateHumanBehavior(page: Page): Promise<void> {
    // Random mouse movements
    await page.mouse.move(
      Math.random() * 100 + 100,
      Math.random() * 100 + 100
    );

    // Random scroll behavior
    if (Math.random() < 0.3) {
      await page.mouse.wheel(0, Math.random() * 200 + 100);
    }

    // Random short delay
    await page.waitForTimeout(Math.random() * 500 + 200);
  }

  async handleRateLimiting(page: Page, url: string): Promise<void> {
    const currentTime = Date.now();
    const minDelay = 1000; // Minimum 1 second between requests
    
    if (this.lastRequestTime && (currentTime - this.lastRequestTime) < minDelay) {
      const waitTime = minDelay - (currentTime - this.lastRequestTime);
      logger.logRateLimitHit(url, waitTime);
      await page.waitForTimeout(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  async rotateIdentity(): Promise<void> {
    if (this.config.enableUserAgentRotation) {
      this.currentUserAgent = this.getRandomUserAgent();
    }
    
    if (this.config.proxyRotation) {
      this.rotateProxy();
    }
  }

  getStealthStats(): object {
    return {
      userAgentsCount: this.userAgents.length,
      currentUserAgent: this.currentUserAgent,
      proxiesCount: this.proxyPool.length,
      currentProxyIndex: this.currentProxyIndex,
      requestCount: this.requestCount,
      stealthConfig: this.config
    };
  }

  // Static utility methods
  static generateRandomFingerprint(): object {
    return {
      screen: {
        width: 1920 + Math.floor(Math.random() * 640),
        height: 1080 + Math.floor(Math.random() * 360),
        colorDepth: 24,
        pixelDepth: 24
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: 'en-US',
      platform: ['Win32', 'MacIntel', 'Linux x86_64'][Math.floor(Math.random() * 3)],
      cookieEnabled: true,
      doNotTrack: '1'
    };
  }

  static isDetectionRisk(response: { status: number; headers: Record<string, string> }): boolean {
    // Check for common anti-bot signals
    const riskIndicators = [
      response.status === 403,
      response.status === 429,
      response.status === 503,
      response.headers['cf-ray'], // Cloudflare
      response.headers['x-cache']?.includes('MISS'),
      response.headers['server']?.includes('cloudflare'),
      response.headers['x-frame-options'],
      response.headers['content-security-policy']?.includes('frame-ancestors')
    ];

    return riskIndicators.some(indicator => indicator);
  }
}

export default AntiDetectionManager;