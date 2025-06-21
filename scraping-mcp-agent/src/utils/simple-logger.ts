// Simple logger que funciona sin dependencias complejas
export class SimpleLogger {
  private static instance: SimpleLogger;
  
  static getInstance(): SimpleLogger {
    if (!SimpleLogger.instance) {
      SimpleLogger.instance = new SimpleLogger();
    }
    return SimpleLogger.instance;
  }

  private log(level: string, message: string, meta?: any): void {
    const timestamp = new Date().toISOString().substring(11, 19);
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    console.log(`${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`);
  }

  info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }

  debug(message: string, meta?: any): void {
    this.log('debug', message, meta);
  }

  error(message: string, meta?: any): void {
    this.log('error', message, meta);
  }

  success(message: string, meta?: any): void {
    this.log('success', '✅ ' + message, meta);
  }

  warning(message: string, meta?: any): void {
    this.log('warn', '⚠️ ' + message, meta);
  }

  step(step: string, message: string, meta?: any): void {
    this.log('step', `${step} ${message}`, meta);
  }

  logScrapingStart(url: string, agent?: string): void {
    this.info('🚀 Starting scraping operation', { url, agent });
  }

  logScrapingSuccess(url: string, duration: number, dataCount: number, agent?: string): void {
    this.success('Scraping completed successfully', { url, duration, dataCount, agent });
  }

  logScrapingError(url: string, error: string, agent?: string): void {
    this.error('❌ Scraping failed', { url, error, agent });
  }
}

export const logger = SimpleLogger.getInstance();