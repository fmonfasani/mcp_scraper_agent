/**
 * Main MCP Server for Scraping Agent
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import ToolsHandler from './tools-handler.js';
import logger from '@/utils/logger.js';

export interface MCPServerConfig {
  name: string;
  version: string;
  description?: string;
  maxConcurrentRequests?: number;
  timeout?: number;
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableRateLimit?: boolean;
  rateLimitConfig?: {
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
  };
}

export class ScrapingMCPServer {
  private server: Server;
  private toolsHandler: ToolsHandler;
  private config: MCPServerConfig;
  private requestCounts: Map<string, { minute: number; hour: number; lastReset: number }> = new Map();

  constructor(config: MCPServerConfig) {
    this.config = {
      maxConcurrentRequests: 10,
      timeout: 300000, // 5 minutes
      enableLogging: true,
      enableMetrics: true,
      enableRateLimit: true,
      rateLimitConfig: {
        maxRequestsPerMinute: 30,
        maxRequestsPerHour: 500
      },
      ...config
    };

    this.toolsHandler = new ToolsHandler();
    this.server = new Server(
      {
        name: this.config.name,
        version: this.config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
    
    if (this.config.enableLogging) {
      logger.info('MCP Server initialized', this.config);
    }
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      if (this.config.enableLogging) {
        logger.info('Listing available MCP tools');
      }

      return {
        tools: [
          // Basic scraping tools
          {
            name: 'scrape_url',
            description: 'Scrape a single URL with custom selectors and options',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  format: 'uri',
                  description: 'The URL to scrape'
                },
                selectors: {
                  type: 'object',
                  additionalProperties: { type: 'string' },
                  description: 'CSS selectors to extract specific data'
                },
                options: {
                  type: 'object',
                  properties: {
                    headless: { type: 'boolean', default: true },
                    timeout: { type: 'number', default: 30000 },
                    waitFor: { 
                      type: 'string', 
                      enum: ['load', 'domcontentloaded', 'networkidle'],
                      default: 'load'
                    },
                    useRandomUserAgent: { type: 'boolean', default: true },
                    stealth: { type: 'boolean', default: true },
                    extractImages: { type: 'boolean', default: false },
                    extractLinks: { type: 'boolean', default: false },
                    cleanData: { type: 'boolean', default: true }
                  }
                }
              },
              required: ['url']
            }
          },
          
          {
            name: 'batch_scrape',
            description: 'Scrape multiple URLs in batch with rate limiting',
            inputSchema: {
              type: 'object',
              properties: {
                urls: {
                  type: 'array',
                  items: { type: 'string', format: 'uri' },
                  minItems: 1,
                  maxItems: 50,
                  description: 'Array of URLs to scrape'
                },
                selectors: {
                  type: 'object',
                  additionalProperties: { type: 'string' },
                  description: 'CSS selectors to extract specific data'
                },
                options: {
                  type: 'object',
                  properties: {
                    maxConcurrent: { type: 'number', default: 2, minimum: 1, maximum: 5 },
                    delayBetweenRequests: { type: 'number', default: 1000 }
                  }
                }
              },
              required: ['urls']
            }
          },

          // Specialized scraping tools
          {
            name: 'scrape_ecommerce',
            description: 'Specialized scraping for e-commerce products with pricing, reviews, and variants',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', format: 'uri' },
                extractReviews: { type: 'boolean', default: false },
                extractVariants: { type: 'boolean', default: false },
                extractRelated: { type: 'boolean', default: false },
                maxReviews: { type: 'number', default: 50, maximum: 200 },
                maxVariants: { type: 'number', default: 20, maximum: 50 }
              },
              required: ['url']
            }
          },

          {
            name: 'scrape_jobs',
            description: 'Specialized scraping for job listings with filtering and pagination',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', format: 'uri' },
                extractDescription: { type: 'boolean', default: true },
                extractRequirements: { type: 'boolean', default: true },
                extractBenefits: { type: 'boolean', default: false },
                followPagination: { type: 'boolean', default: true },
                maxPages: { type: 'number', default: 5, maximum: 20 },
                filters: {
                  type: 'object',
                  properties: {
                    location: { type: 'string' },
                    jobType: { 
                      type: 'string',
                      enum: ['full-time', 'part-time', 'contract', 'internship']
                    },
                    remote: { type: 'boolean' },
                    salaryMin: { type: 'number' },
                    keywords: { type: 'array', items: { type: 'string' } }
                  }
                }
              },
              required: ['url']
            }
          },

          {
            name: 'scrape_news',
            description: 'Specialized scraping for news articles with content extraction',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', format: 'uri' },
                extractContent: { type: 'boolean', default: true },
                extractAuthor: { type: 'boolean', default: true },
                extractTags: { type: 'boolean', default: true },
                maxArticlesPerPage: { type: 'number', default: 20, maximum: 100 },
                dateRange: {
                  type: 'object',
                  properties: {
                    from: { type: 'string', format: 'date-time' },
                    to: { type: 'string', format: 'date-time' }
                  }
                }
              },
              required: ['url']
            }
          },

          {
            name: 'scrape_leads',
            description: 'Specialized scraping for lead generation with contact validation',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', format: 'uri' },
                extractEmails: { type: 'boolean', default: true },
                extractPhones: { type: 'boolean', default: false },
                extractSocialMedia: { type: 'boolean', default: true },
                validateContacts: { type: 'boolean', default: false },
                maxLeadsPerPage: { type: 'number', default: 50, maximum: 200 },
                criteria: {
                  type: 'object',
                  properties: {
                    industry: { type: 'string' },
                    location: { type: 'string' },
                    companySize: { 
                      type: 'string',
                      enum: ['startup', 'small', 'medium', 'large']
                    },
                    jobTitles: { type: 'array', items: { type: 'string' } }
                  }
                }
              },
              required: ['url']
            }
          },

          // Advanced tools
          {
            name: 'monitor_url',
            description: 'Monitor URL for changes with alerts and notifications',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', format: 'uri' },
                interval: { 
                  type: 'number', 
                  minimum: 60, 
                  maximum: 86400,
                  description: 'Monitoring interval in seconds'
                },
                alertThreshold: { 
                  type: 'number', 
                  minimum: 0, 
                  maximum: 100,
                  default: 10,
                  description: 'Percentage change to trigger alert'
                },
                webhook: { 
                  type: 'string', 
                  format: 'uri',
                  description: 'Webhook URL for notifications'
                }
              },
              required: ['url', 'interval']
            }
          },

          {
            name: 'competitor_analysis',
            description: 'Analyze competitors by comparing multiple websites',
            inputSchema: {
              type: 'object',
              properties: {
                urls: {
                  type: 'array',
                  items: { type: 'string', format: 'uri' },
                  minItems: 1,
                  maxItems: 10
                },
                analysisType: {
                  type: 'string',
                  enum: ['pricing', 'features', 'content', 'seo'],
                  default: 'pricing'
                },
                compareAgainst: { 
                  type: 'string', 
                  format: 'uri',
                  description: 'Base URL to compare against'
                }
              },
              required: ['urls']
            }
          },

          {
            name: 'bulk_processing',
            description: 'Process large batches of URLs asynchronously',
            inputSchema: {
              type: 'object',
              properties: {
                urls: {
                  type: 'array',
                  items: { type: 'string', format: 'uri' },
                  minItems: 1,
                  maxItems: 1000
                },
                processingType: {
                  type: 'string',
                  enum: ['ecommerce', 'jobs', 'news', 'leads', 'general']
                },
                batchSize: { type: 'number', default: 10, maximum: 50 },
                exportFormat: {
                  type: 'string',
                  enum: ['json', 'csv', 'xlsx'],
                  default: 'json'
                }
              },
              required: ['urls', 'processingType']
            }
          },

          // Management tools
          {
            name: 'job_management',
            description: 'Manage scraping jobs - list, status, cancel, pause, resume',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['list', 'status', 'cancel', 'pause', 'resume']
                },
                jobId: { type: 'string' }
              },
              required: ['action']
            }
          },

          {
            name: 'performance_analytics',
            description: 'Get performance metrics and analytics',
            inputSchema: {
              type: 'object',
              properties: {
                timeRange: {
                  type: 'string',
                  enum: ['hour', 'day', 'week', 'month'],
                  default: 'day'
                },
                includeDetails: { type: 'boolean', default: false }
              }
            }
          },

          {
            name: 'system_status',
            description: 'Get system health and status information',
            inputSchema: {
              type: 'object',
              properties: {
                component: {
                  type: 'string',
                  enum: ['all', 'scrapers', 'memory', 'proxies'],
                  default: 'all'
                },
                includeMetrics: { type: 'boolean', default: true }
              }
            }
          }
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const startTime = Date.now();

      try {
        // Rate limiting check
        if (this.config.enableRateLimit) {
          this.checkRateLimit(request.params.name);
        }

        if (this.config.enableLogging) {
          logger.info('MCP tool called', { toolName: name, args });
        }

        let result;

        switch (name) {
          case 'scrape_url':
            result = await this.toolsHandler.scrapeUrl(args);
            break;
          case 'batch_scrape':
            result = await this.toolsHandler.batchScrape(args);
            break;
          case 'scrape_ecommerce':
            result = await this.toolsHandler.scrapeEcommerce(args);
            break;
          case 'scrape_jobs':
            result = await this.toolsHandler.scrapeJobs(args);
            break;
          case 'scrape_news':
            result = await this.toolsHandler.scrapeNews(args);
            break;
          case 'scrape_leads':
            result = await this.toolsHandler.scrapeLeads(args);
            break;
          case 'monitor_url':
            result = await this.toolsHandler.monitorUrl(args);
            break;
          case 'competitor_analysis':
            result = await this.toolsHandler.competitorAnalysis(args);
            break;
          case 'bulk_processing':
            result = await this.toolsHandler.bulkProcessing(args);
            break;
          case 'job_management':
            result = await this.toolsHandler.jobManagement(args);
            break;
          case 'performance_analytics':
            result = await this.toolsHandler.performanceAnalytics(args);
            break;
          case 'system_status':
            result = await this.toolsHandler.systemStatus(args);
            break;
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }

        const executionTime = Date.now() - startTime;

        if (this.config.enableLogging) {
          logger.info('MCP tool completed', { 
            toolName: name, 
            success: result.success,
            executionTime 
          });
        }

        if (this.config.enableMetrics) {
          this.recordMetrics(name, result.success, executionTime);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };

      } catch (error) {
        const executionTime = Date.now() - startTime;
        
        logger.error('MCP tool error', error as Error, { 
          toolName: name, 
          args,
          executionTime 
        });

        if (this.config.enableMetrics) {
          this.recordMetrics(name, false, executionTime);
        }

        if (error instanceof McpError) {
          throw error;
        }

        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${(error as Error).message}`
        );
      }
    });
  }

  private setupErrorHandling(): void {
    // Handle server errors
    this.server.onerror = (error) => {
      logger.error('MCP Server error', error);
    };

    // Handle process errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception in MCP server', error);
      this.shutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection in MCP server', reason as Error, { promise });
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully');
      this.shutdown();
    });
  }

  private checkRateLimit(toolName: string): void {
    if (!this.config.rateLimitConfig) return;

    const now = Date.now();
    const windowStart = Math.floor(now / 60000) * 60000; // Round to minute
    const hourStart = Math.floor(now / 3600000) * 3600000; // Round to hour

    const clientId = 'default'; // In production, this would be based on authentication
    let counts = this.requestCounts.get(clientId);

    if (!counts || counts.lastReset < windowStart) {
      counts = { minute: 0, hour: 0, lastReset: windowStart };
      this.requestCounts.set(clientId, counts);
    }

    // Reset hour counter if needed
    if (counts.lastReset < hourStart) {
      counts.hour = 0;
    }

    counts.minute++;
    counts.hour++;

    const { maxRequestsPerMinute, maxRequestsPerHour } = this.config.rateLimitConfig;

    if (counts.minute > maxRequestsPerMinute) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Rate limit exceeded: ${maxRequestsPerMinute} requests per minute`
      );
    }

    if (counts.hour > maxRequestsPerHour) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Rate limit exceeded: ${maxRequestsPerHour} requests per hour`
      );
    }
  }

  private recordMetrics(toolName: string, success: boolean, executionTime: number): void {
    // In production, this would integrate with a metrics system like Prometheus
    logger.info('Tool metrics', {
      tool: toolName,
      success,
      executionTime,
      timestamp: new Date().toISOString()
    });
  }

  async start(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      if (this.config.enableLogging) {
        logger.info('MCP Scraping Server started successfully', {
          name: this.config.name,
          version: this.config.version,
          features: {
            rateLimiting: this.config.enableRateLimit,
            metrics: this.config.enableMetrics,
            logging: this.config.enableLogging
          }
        });
      }

      // Log performance metrics periodically
      if (this.config.enableMetrics) {
        setInterval(() => {
          logger.logPerformanceMetrics();
        }, 60000); // Every minute
      }

    } catch (error) {
      logger.error('Failed to start MCP server', error as Error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down MCP server...');
      
      // Cleanup resources
      await this.toolsHandler.dispose();
      await this.server.close();
      
      // Close logger
      await logger.close();
      
      logger.info('MCP server shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during MCP server shutdown', error as Error);
      process.exit(1);
    }
  }

  // Health check endpoint (for monitoring)
  getHealth(): any {
    const memUsage = process.memoryUsage();
    return {
      status: 'healthy',
      uptime: process.uptime(),
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      },
      version: this.config.version,
      timestamp: new Date().toISOString()
    };
  }

  // Get server statistics
  getStats(): any {
    return {
      server: this.config,
      metrics: logger.getMetrics(),
      activeJobs: this.toolsHandler ? 'available' : 'unavailable',
      rateLimits: Array.from(this.requestCounts.entries()).map(([clientId, counts]) => ({
        clientId,
        requestsThisMinute: counts.minute,
        requestsThisHour: counts.hour,
        lastReset: new Date(counts.lastReset).toISOString()
      }))
    };
  }
}

// Factory function for easy server creation
export function createScrapingMCPServer(config: Partial<MCPServerConfig> = {}): ScrapingMCPServer {
  const defaultConfig: MCPServerConfig = {
    name: 'scraping-mcp-agent',
    version: '1.0.0',
    description: 'Advanced web scraping MCP agent with specialized tools for e-commerce, jobs, news, and lead generation'
  };

  return new ScrapingMCPServer({ ...defaultConfig, ...config });
}


export default ScrapingMCPServer;