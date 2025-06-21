#!/usr/bin/env node

/**
 * 🔐 Login Scraper - Bull Market Brokers
 * 
 * Este script hace login y extrae datos de la plataforma
 */

import { chromium, Browser, Page } from 'playwright';

interface LoginConfig {
  email: string;
  password: string;
  loginUrl: string;
  headless?: boolean;
}

interface ScrapingResult {
  success: boolean;
  data?: any;
  error?: string;
  screenshots?: string[];
}

class LoginScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize(headless: boolean = false) {
    console.log('🚀 Inicializando browser...');
    
    this.browser = await chromium.launch({
      headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    this.page = await this.browser.newPage();
    
    // User agent real
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    // Viewport
    await this.page.setViewportSize({ width: 1920, height: 1080 });
  }

  async login(config: LoginConfig): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      console.log('🔐 Navegando a página de login...');
      await this.page.goto(config.loginUrl, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Screenshot inicial
      await this.page.screenshot({ path: 'screenshots/01-login-page.png' });
      console.log('📸 Screenshot: login page');

      // Buscar campos de login
      console.log('🔍 Buscando campos de login...');
      
      // Esperar que aparezcan los campos
      await this.page.waitForSelector('input[type="email"], input[name*="email"], input[id*="email"], input[placeholder*="email"]', { timeout: 10000 });
      
      // Intentar diferentes selectores para email
      const emailSelectors = [
        'input[type="email"]',
        'input[name*="email"]',
        'input[id*="email"]',
        'input[placeholder*="email"]',
        'input[name="EmailAddress"]',
        'input[id="EmailAddress"]'
      ];
      
      let emailField = null;
      for (const selector of emailSelectors) {
        try {
          emailField = await this.page.$(selector);
          if (emailField) {
            console.log(`✅ Campo email encontrado: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!emailField) {
        throw new Error('No se encontró el campo de email');
      }

      // Buscar campo de contraseña
      const passwordSelectors = [
        'input[type="password"]',
        'input[name*="password"]',
        'input[id*="password"]',
        'input[name="Password"]',
        'input[id="Password"]'
      ];
      
      let passwordField = null;
      for (const selector of passwordSelectors) {
        try {
          passwordField = await this.page.$(selector);
          if (passwordField) {
            console.log(`✅ Campo password encontrado: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!passwordField) {
        throw new Error('No se encontró el campo de contraseña');
      }

      // Llenar formulario
      console.log('⌨️ Llenando formulario...');
      await emailField.fill(config.email);
      await this.page.waitForTimeout(1000);
      
      await passwordField.fill(config.password);
      await this.page.waitForTimeout(1000);

      // Screenshot con datos llenos
      await this.page.screenshot({ path: 'screenshots/02-form-filled.png' });
      console.log('📸 Screenshot: form filled');

      // Buscar botón de submit
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Sign In")',
        'button:has-text("Login")',
        'button:has-text("Log In")',
        '.btn-primary',
        '.login-btn'
      ];

      let submitButton = null;
      for (const selector of submitSelectors) {
        try {
          submitButton = await this.page.$(selector);
          if (submitButton) {
            console.log(`✅ Botón submit encontrado: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!submitButton) {
        // Intentar enviar con Enter en el campo de contraseña
        console.log('⚠️ No se encontró botón, intentando con Enter...');
        await passwordField.press('Enter');
      } else {
        console.log('🖱️ Haciendo click en submit...');
        await submitButton.click();
      }

      // Esperar navegación o cambio
      console.log('⏳ Esperando respuesta del login...');
      
      try {
        // Esperar a que cambie la URL o aparezca contenido del dashboard
        await this.page.waitForFunction(
          () => window.location.href !== 'https://bullmarketbrokers.com/Security/SignIn',
          { timeout: 15000 }
        );
        
        console.log('✅ URL cambió, posible login exitoso');
        
        // Screenshot después del login
        await this.page.screenshot({ path: 'screenshots/03-after-login.png' });
        console.log('📸 Screenshot: after login');
        
        return true;
        
      } catch (e) {
        // Verificar si hay mensaje de error
        const errorMessage = await this.page.$('.error, .alert-danger, .validation-summary-errors');
        if (errorMessage) {
          const errorText = await errorMessage.textContent();
          throw new Error(`Login falló: ${errorText}`);
        }
        
        throw new Error('Login timeout - posible fallo de credenciales');
      }

    } catch (error) {
      console.error('❌ Error en login:', error);
      
      // Screenshot de error
      await this.page.screenshot({ path: 'screenshots/error-login.png' });
      
      return false;
    }
  }

  async scrapeAfterLogin(): Promise<ScrapingResult> {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      console.log('📊 Extrayendo datos del dashboard...');
      
      // Esperar que cargue la página
      await this.page.waitForLoadState('networkidle');
      
      // Extraer datos generales de la página
      const data = await this.page.evaluate(() => {
        // Información básica de la página
        const pageInfo = {
          title: document.title,
          url: window.location.href,
          timestamp: new Date().toISOString()
        };

        // Buscar tablas de datos
        const tables = Array.from(document.querySelectorAll('table')).map((table, index) => {
          const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim());
          const rows = Array.from(table.querySelectorAll('tbody tr')).map(row => 
            Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim())
          );
          return { index, headers, rows: rows.slice(0, 5) }; // Solo primeras 5 filas
        });

        // Buscar elementos con clases relacionadas a trading/finance
        const financialElements = Array.from(document.querySelectorAll('[class*="balance"], [class*="account"], [class*="portfolio"], [class*="position"], [class*="trade"]'))
          .map(el => ({
            tag: el.tagName,
            class: el.className,
            text: el.textContent?.trim().substring(0, 100)
          }));

        // Buscar números que parezcan montos o precios
        const textContent = document.body.textContent || '';
        const amounts = textContent.match(/\$[\d,]+\.?\d*/g) || [];
        const percentages = textContent.match(/[\d.]+%/g) || [];

        return {
          pageInfo,
          tables,
          financialElements: financialElements.slice(0, 10),
          amounts: amounts.slice(0, 10),
          percentages: percentages.slice(0, 10)
        };
      });

      // Screenshot final
      await this.page.screenshot({ path: 'screenshots/04-scraped-data.png' });
      console.log('📸 Screenshot: scraped data');

      console.log('✅ Datos extraídos exitosamente');
      
      return {
        success: true,
        data,
        screenshots: [
          'screenshots/01-login-page.png',
          'screenshots/02-form-filled.png', 
          'screenshots/03-after-login.png',
          'screenshots/04-scraped-data.png'
        ]
      };

    } catch (error) {
      console.error('❌ Error extrayendo datos:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Browser cerrado');
    }
  }
}

// Función principal
async function scrapeBullMarketBrokers() {
  // Crear carpeta para screenshots
  try {
    const fs = await import('fs');
    if (!fs.existsSync('screenshots')) {
      fs.mkdirSync('screenshots');
    }
  } catch (e) {
    console.log('⚠️ No se pudo crear carpeta screenshots');
  }

  const scraper = new LoginScraper();
  
  try {
    console.log('🎯 Iniciando scraping de Bull Market Brokers...');
    
    // Inicializar (headless: false para ver el proceso)
    await scraper.initialize(false);
    
    // Configuración de login
    const loginConfig: LoginConfig = {
      email: 'fmonfasani@gmail.com',
      password: '$Karaoke27570',
      loginUrl: 'https://bullmarketbrokers.com/Security/SignIn'
    };
    
    // Hacer login
    const loginSuccess = await scraper.login(loginConfig);
    
    if (!loginSuccess) {
      throw new Error('Login falló');
    }
    
    console.log('✅ Login exitoso!');
    
    // Extraer datos
    const result = await scraper.scrapeAfterLogin();
    
    if (result.success) {
      console.log('\n📊 DATOS EXTRAÍDOS:');
      console.log('=====================================');
      console.log('📄 Título:', result.data?.pageInfo?.title);
      console.log('🌐 URL:', result.data?.pageInfo?.url);
      console.log('📊 Tablas encontradas:', result.data?.tables?.length || 0);
      console.log('💰 Montos encontrados:', result.data?.amounts || []);
      console.log('📈 Porcentajes:', result.data?.percentages || []);
      
      if (result.data?.tables && result.data.tables.length > 0) {
        console.log('\n📋 PRIMERA TABLA:');
        console.log('Headers:', result.data.tables[0].headers);
        console.log('Primeras filas:', result.data.tables[0].rows);
      }
      
      console.log('\n📸 Screenshots guardados en carpeta screenshots/');
      
    } else {
      console.log('❌ Error extrayendo datos:', result.error);
    }
    
  } catch (error) {
    console.error('💥 Error general:', error);
  } finally {
    await scraper.close();
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeBullMarketBrokers().catch(console.error);
}

export { LoginScraper, scrapeBullMarketBrokers };