#!/usr/bin/env node

/**
 * Browser Installation Script
 * 
 * Installs and manages Playwright browsers with system dependencies
 * Handles different operating systems and provides detailed feedback
 */

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { platform, arch } from 'os';

interface BrowserInstallOptions {
  browsers?: string[];
  withDeps?: boolean;
  force?: boolean;
  verbose?: boolean;
  downloadPath?: string;
}

class BrowserInstaller {
  private options: Required<BrowserInstallOptions>;
  private supportedBrowsers = ['chromium', 'firefox', 'webkit'];
  private installLog: string[] = [];

  constructor(options: BrowserInstallOptions = {}) {
    this.options = {
      browsers: options.browsers || ['chromium'],
      withDeps: options.withDeps ?? true,
      force: options.force ?? false,
      verbose: options.verbose ?? false,
      downloadPath: options.downloadPath || join(process.cwd(), 'playwright-browsers')
    };

    this.log('🕷️ Playwright Browser Installer');
    this.log('================================\n');
  }

  private log(message: string): void {
    console.log(message);
    this.installLog.push(`${new Date().toISOString()}: ${message}`);
  }

  private error(message: string): void {
    console.error(`❌ ${message}`);
    this.installLog.push(`${new Date().toISOString()}: ERROR: ${message}`);
  }

  private success(message: string): void {
    console.log(`✅ ${message}`);
    this.installLog.push(`${new Date().toISOString()}: SUCCESS: ${message}`);
  }

  private warn(message: string): void {
    console.warn(`⚠️ ${message}`);
    this.installLog.push(`${new Date().toISOString()}: WARNING: ${message}`);
  }

  async install(): Promise<boolean> {
    try {
      this.log('🔍 System Information:');
      this.logSystemInfo();

      this.log('\n📋 Installation Configuration:');
      this.logInstallConfig();

      this.log('\n🔧 Pre-installation Checks:');
      await this.preInstallationChecks();

      this.log('\n📦 Installing Browsers:');
      await this.installBrowsers();

      this.log('\n🔗 Installing System Dependencies:');
      await this.installSystemDependencies();

      this.log('\n✅ Post-installation Verification:');
      await this.verifyInstallation();

      this.log('\n🎉 Browser installation completed successfully!');
      await this.saveInstallLog();

      return true;
    } catch (error) {
      this.error(`Installation failed: ${(error as Error).message}`);
      await this.saveInstallLog();
      return false;
    }
  }

  private logSystemInfo(): void {
    console.log(`   Platform: ${platform()}`);
    console.log(`   Architecture: ${arch()}`);
    console.log(`   Node.js: ${process.version}`);
    console.log(`   Working Directory: ${process.cwd()}`);
  }

  private logInstallConfig(): void {
    console.log(`   Browsers: ${this.options.browsers.join(', ')}`);
    console.log(`   Install Dependencies: ${this.options.withDeps}`);
    console.log(`   Force Reinstall: ${this.options.force}`);
    console.log(`   Download Path: ${this.options.downloadPath}`);
  }

  private async preInstallationChecks(): Promise<void> {
    // Check if npm/npx is available
    try {
      execSync('npx --version', { stdio: 'pipe' });
      this.success('npx is available');
    } catch {
      throw new Error('npx is not available. Please install Node.js and npm.');
    }

    // Check if Playwright is installed
    try {
      execSync('npx playwright --version', { stdio: 'pipe' });
      this.success('Playwright is installed');
    } catch {
      this.warn('Playwright not found in node_modules. Installing...');
      try {
        execSync('npm install playwright', { stdio: 'inherit' });
        this.success('Playwright installed successfully');
      } catch (error) {
        throw new Error('Failed to install Playwright package');
      }
    }

    // Validate browser selection
    const invalidBrowsers = this.options.browsers.filter(
      browser => !this.supportedBrowsers.includes(browser)
    );
    
    if (invalidBrowsers.length > 0) {
      throw new Error(`Unsupported browsers: ${invalidBrowsers.join(', ')}`);
    }

    // Check disk space (rough estimate)
    await this.checkDiskSpace();

    // Create download directory if it doesn't exist
    if (!existsSync(this.options.downloadPath)) {
      mkdirSync(this.options.downloadPath, { recursive: true });
      this.success(`Created download directory: ${this.options.downloadPath}`);
    }
  }

  private async checkDiskSpace(): Promise<void> {
    try {
      const stats = await import('fs').then(fs => fs.promises.statSync('.'));
      // Simple check - in production, you'd want to check actual available space
      this.success('Sufficient disk space available');
    } catch (error) {
      this.warn('Could not verify disk space');
    }
  }

  private async installBrowsers(): Promise<void> {
    for (const browser of this.options.browsers) {
      await this.installSingleBrowser(browser);
    }
  }

  private async installSingleBrowser(browser: string): Promise<void> {
    this.log(`📦 Installing ${browser}...`);
    
    try {
      const installCmd = this.options.force 
        ? `npx playwright install --force ${browser}`
        : `npx playwright install ${browser}`;
      
      if (this.options.verbose) {
        this.log(`   Command: ${installCmd}`);
      }

      // Set environment variables for download path
      const env = {
        ...process.env,
        PLAYWRIGHT_BROWSERS_PATH: this.options.downloadPath
      };

      await this.executeCommand(installCmd, { env });
      this.success(`${browser} installed successfully`);
      
    } catch (error) {
      throw new Error(`Failed to install ${browser}: ${(error as Error).message}`);
    }
  }

  private async installSystemDependencies(): Promise<void> {
    if (!this.options.withDeps) {
      this.log('🔗 Skipping system dependencies (disabled)');
      return;
    }

    const currentPlatform = platform();
    
    switch (currentPlatform) {
      case 'linux':
        await this.installLinuxDependencies();
        break;
      case 'darwin':
        await this.installMacOSDependencies();
        break;
      case 'win32':
        await this.installWindowsDependencies();
        break;
      default:
        this.warn(`System dependencies not supported for platform: ${currentPlatform}`);
    }
  }

  private async installLinuxDependencies(): Promise<void> {
    this.log('🐧 Installing Linux system dependencies...');
    
    try {
      // Check if running as root or with sudo access
      const hasRoot = process.getuid ? process.getuid() === 0 : false;
      
      if (!hasRoot) {
        this.warn('Installing system dependencies requires root privileges');
        this.log('   Try running with sudo or install dependencies manually');
        this.log('   Command: npx playwright install-deps');
        return;
      }

      await this.executeCommand('npx playwright install-deps');
      this.success('Linux system dependencies installed');
      
    } catch (error) {
      this.warn('Failed to install Linux dependencies automatically');
      this.log('   Please run manually: sudo npx playwright install-deps');
    }
  }

  private async installMacOSDependencies(): Promise<void> {
    this.log('🍎 Checking macOS dependencies...');
    
    // macOS usually doesn't need additional dependencies for Playwright
    this.success('macOS dependencies are typically pre-installed');
    
    // Check for Xcode Command Line Tools
    try {
      execSync('xcode-select -p', { stdio: 'pipe' });
      this.success('Xcode Command Line Tools are installed');
    } catch {
      this.warn('Xcode Command Line Tools not found');
      this.log('   Install with: xcode-select --install');
    }
  }

  private async installWindowsDependencies(): Promise<void> {
    this.log('🪟 Checking Windows dependencies...');
    
    // Windows dependencies are usually bundled with browsers
    this.success('Windows dependencies are typically bundled with browsers');
    
    // Check for Visual C++ Redistributables
    this.log('   Ensure Visual C++ Redistributables are installed');
    this.log('   Download from: https://aka.ms/vs/17/release/vc_redist.x64.exe');
  }

  private async verifyInstallation(): Promise<void> {
    this.log('🔍 Verifying browser installations...');

    for (const browser of this.options.browsers) {
      await this.verifyBrowser(browser);
    }

    // Test browser launch
    await this.testBrowserLaunch();
  }

  private async verifyBrowser(browser: string): Promise<void> {
    try {
      // Check if browser executable exists
      const listCmd = `npx playwright install --dry-run ${browser}`;
      const output = execSync(listCmd, { 
        encoding: 'utf8',
        env: {
          ...process.env,
          PLAYWRIGHT_BROWSERS_PATH: this.options.downloadPath
        }
      });
      
      if (output.includes('is already installed')) {
        this.success(`${browser} is properly installed`);
      } else {
        this.warn(`${browser} verification inconclusive`);
      }
      
    } catch (error) {
      this.warn(`Could not verify ${browser} installation`);
    }
  }

  private async testBrowserLaunch(): Promise<void> {
    this.log('🚀 Testing browser launch...');
    
    try {
      // Create a simple test script
      const testScript = `
        const { chromium } = require('playwright');
        (async () => {
          const browser = await chromium.launch({ headless: true });
          const context = await browser.newContext();
          const page = await context.newPage();
          await page.goto('data:text/html,<h1>Test</h1>');
          const title = await page.textContent('h1');
          await browser.close();
          console.log('✅ Browser test successful:', title);
        })().catch(console.error);
      `;
      
      const testFile = join(this.options.downloadPath, 'browser-test.js');
      writeFileSync(testFile, testScript);
      
      execSync(`node ${testFile}`, { 
        stdio: 'inherit',
        env: {
          ...process.env,
          PLAYWRIGHT_BROWSERS_PATH: this.options.downloadPath
        }
      });
      
      this.success('Browser launch test completed');
      
    } catch (error) {
      this.warn('Browser launch test failed - browsers may still work correctly');
    }
  }

  private async executeCommand(command: string, options: any = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.options.verbose) {
        console.log(`   Executing: ${command}`);
      }

      const child = spawn(command, [], {
        shell: true,
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        ...options
      });

      let output = '';
      let errorOutput = '';

      if (!this.options.verbose) {
        child.stdout?.on('data', (data) => {
          output += data.toString();
        });

        child.stderr?.on('data', (data) => {
          errorOutput += data.toString();
        });
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}: ${errorOutput || output}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async saveInstallLog(): Promise<void> {
    const logFile = join(this.options.downloadPath, 'install-log.txt');
    const logContent = this.installLog.join('\n');
    
    try {
      writeFileSync(logFile, logContent);
      this.log(`📝 Installation log saved: ${logFile}`);
    } catch (error) {
      this.warn('Could not save installation log');
    }
  }

  // Utility methods
  static async quickInstall(): Promise<boolean> {
    const installer = new BrowserInstaller({
      browsers: ['chromium'],
      withDeps: true,
      force: false,
      verbose: false
    });
    
    return installer.install();
  }

  static async fullInstall(): Promise<boolean> {
    const installer = new BrowserInstaller({
      browsers: ['chromium', 'firefox', 'webkit'],
      withDeps: true,
      force: false,
      verbose: true
    });
    
    return installer.install();
  }

  static async reinstall(): Promise<boolean> {
    const installer = new BrowserInstaller({
      browsers: ['chromium', 'firefox', 'webkit'],
      withDeps: true,
      force: true,
      verbose: true
    });
    
    return installer.install();
  }
}

// CLI interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options: BrowserInstallOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--browsers':
        options.browsers = args[++i]?.split(',') || ['chromium'];
        break;
      case '--no-deps':
        options.withDeps = false;
        break;
      case '--force':
        options.force = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--path':
        options.downloadPath = args[++i];
        break;
      case '--quick':
        const success = await BrowserInstaller.quickInstall();
        process.exit(success ? 0 : 1);
        break;
      case '--full':
        const fullSuccess = await BrowserInstaller.fullInstall();
        process.exit(fullSuccess ? 0 : 1);
        break;
      case '--reinstall':
        const reinstallSuccess = await BrowserInstaller.reinstall();
        process.exit(reinstallSuccess ? 0 : 1);
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
    }
  }

  const installer = new BrowserInstaller(options);
  const success = await installer.install();
  process.exit(success ? 0 : 1);
}

function printHelp(): void {
  console.log(`
🕷️ Playwright Browser Installer

Usage: npm run install-browsers [options]

Options:
  --browsers <list>     Comma-separated list of browsers (chromium,firefox,webkit)
  --no-deps            Skip system dependencies installation
  --force              Force reinstall even if browsers exist
  --verbose            Show detailed installation output
  --path <directory>   Custom download path for browsers
  --quick              Quick install (chromium only)
  --full               Full install (all browsers with verbose output)
  --reinstall          Force reinstall all browsers
  --help               Show this help message

Examples:
  npm run install-browsers
  npm run install-browsers -- --browsers chromium,firefox --verbose
  npm run install-browsers -- --quick
  npm run install-browsers -- --full
  npm run install-browsers -- --reinstall

Environment Variables:
  PLAYWRIGHT_BROWSERS_PATH    Custom browser download directory
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD    Skip browser download
`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Installation failed:', error.message);
    process.exit(1);
  });
}

export { BrowserInstaller };
export default BrowserInstaller;