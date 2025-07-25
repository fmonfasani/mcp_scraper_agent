#!/usr/bin/env node

/**
 * 🔍 Debug Login - Paso a paso para ver qué pasa
 */

import { chromium } from 'playwright';

const { LOGIN_EMAIL = '', LOGIN_PASSWORD = '' } = process.env;

// Simple logger inline para no depender de otros archivos
class Logger {
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
}

const logger = new Logger();

async function debugLogin() {
  logger.info('🔍 DEBUG: Iniciando análisis de la página de login');
  
  let browser;
  try {
    // 1. Abrir browser
    logger.step('1️⃣', 'Abriendo browser');
    browser = await chromium.launch({ 
      headless: false,  // Para ver qué pasa
      slowMo: 500      // Lento para ver cada acción
    });
    
    const page = await browser.newPage();
    
    // 2. Navegar a la página
    logger.step('2️⃣', 'Navegando a la página', { url: 'https://bullmarketbrokers.com/Security/SignIn' });
    await page.goto('https://bullmarketbrokers.com/Security/SignIn', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // 3. Ver qué hay en la página
    logger.step('3️⃣', 'Analizando contenido de la página');
    
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        hasEmailInput: !!document.querySelector('input[type="email"]'),
        hasPasswordInput: !!document.querySelector('input[type="password"]'),
        inputCount: document.querySelectorAll('input').length,
        formCount: document.querySelectorAll('form').length,
        buttonCount: document.querySelectorAll('button').length,
        bodyText: document.body.textContent?.substring(0, 200) + '...'
      };
    });
    
    logger.info('📊 Información de la página', pageInfo);
    
    // 4. Listar todos los inputs
    logger.step('4️⃣', 'Analizando todos los inputs');
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input')).map((input, index) => ({
        index,
        type: input.type,
        name: input.name,
        id: input.id,
        placeholder: input.placeholder,
        className: input.className,
        value: input.value
      }));
    });
    
    inputs.forEach((input) => {
      logger.debug(`Input ${input.index + 1}`, input);
    });
    
    // 5. Buscar botones
    logger.step('5️⃣', 'Analizando botones');
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, input[type="submit"]')).map((button, index) => ({
        index,
        type: button.type || 'button',
        textContent: button.textContent?.trim(),
        className: button.className,
        id: button.id,
        value: (button as HTMLInputElement).value || ''
      }));
    });
    
    buttons.forEach((button) => {
      logger.debug(`Button ${button.index + 1}`, button);
    });
    
    // 6. Verificar si hay formularios
    logger.step('6️⃣', 'Analizando formularios');
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map((form, index) => ({
        index,
        action: form.action,
        method: form.method,
        id: form.id,
        className: form.className
      }));
    });
    
    forms.forEach((form) => {
      logger.debug(`Form ${form.index + 1}`, form);
    });
    
    // 7. Intentar login básico
    logger.step('7️⃣', 'Intentando login básico');
    
    // Buscar campo email con múltiples selectores
    const emailSelectors = [
      'input[type="email"]',
      'input[name*="email" i]',
      'input[id*="email" i]',
      'input[placeholder*="email" i]',
      'input[name="EmailAddress"]',
      'input[id="EmailAddress"]'
    ];
    
    let emailField = null;
    for (const selector of emailSelectors) {
      try {
        emailField = await page.$(selector);
        if (emailField) {
          logger.success(`Campo email encontrado con selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continuar con el siguiente selector
      }
    }
    
    // Buscar campo password
    const passwordField = await page.$('input[type="password"]');
    
    if (emailField && passwordField) {
      logger.success('Ambos campos encontrados, procediendo con login');
      
      // Llenar campos
      logger.info('Llenando campo email...');
      await emailField.fill(LOGIN_EMAIL);
      await page.waitForTimeout(1000);
      
      logger.info('Llenando campo password...');
      await passwordField.fill(LOGIN_PASSWORD);
      await page.waitForTimeout(1000);
      
      // Buscar botón submit
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Sign In")',
        'button:has-text("Login")',
        'button:has-text("Log In")',
        '.btn-primary'
      ];
      
      let submitButton = null;
      for (const selector of submitSelectors) {
        try {
          submitButton = await page.$(selector);
          if (submitButton) {
            logger.success(`Botón submit encontrado: ${selector}`);
            break;
          }
        } catch (e) {
          // Continuar
        }
      }
      
      if (submitButton) {
        logger.info('Haciendo click en submit...');
        
        // Esperar por navegación o cambio
        const urlBeforeClick = page.url();
        await submitButton.click();
        
        logger.info('Esperando respuesta del servidor...');
        await page.waitForTimeout(5000);
        
        const urlAfterClick = page.url();
        logger.info('URLs', { before: urlBeforeClick, after: urlAfterClick });
        
        if (urlAfterClick !== urlBeforeClick) {
          logger.success('Login exitoso - URL cambió');
          
          // Extraer datos básicos de la nueva página
          const dashboardData = await page.evaluate(() => {
            return {
              title: document.title,
              url: window.location.href,
              hasAccountInfo: !!document.querySelector('[class*="account"], [class*="balance"], [class*="portfolio"]'),
              textPreview: document.body.textContent?.substring(0, 300) + '...'
            };
          });
          
          logger.success('Datos del dashboard obtenidos', dashboardData);
          
          // Buscar información financiera
          const financialData = await page.evaluate(() => {
            const amounts = Array.from(document.querySelectorAll('*')).map(el => el.textContent).join(' ').match(/\$[\d,]+\.?\d*/g) || [];
            const percentages = Array.from(document.querySelectorAll('*')).map(el => el.textContent).join(' ').match(/[\d.]+%/g) || [];
            
            return {
              amounts: amounts.slice(0, 10),
              percentages: percentages.slice(0, 10)
            };
          });
          
          logger.info('Datos financieros encontrados', financialData);
          
        } else {
          logger.warning('Login posiblemente falló - URL no cambió');
          
          // Buscar mensajes de error
          const errorMessages = await page.evaluate(() => {
            const errorSelectors = ['.error', '.alert-danger', '.validation-summary-errors', '[class*="error"]'];
            const errors = [];
            
            for (const selector of errorSelectors) {
              const elements = document.querySelectorAll(selector);
              for (const el of elements) {
                if (el.textContent?.trim()) {
                  errors.push(el.textContent.trim());
                }
              }
            }
            
            return errors;
          });
          
          if (errorMessages.length > 0) {
            logger.error('Mensajes de error encontrados', { errors: errorMessages });
          }
        }
        
      } else {
        logger.error('No se encontró botón de submit');
        logger.info('Intentando enviar con Enter...');
        await passwordField.press('Enter');
        await page.waitForTimeout(3000);
        
        const finalUrl = page.url();
        logger.info('URL después de Enter', { url: finalUrl });
      }
      
    } else {
      logger.error('No se encontraron campos de login', {
        emailField: !!emailField,
        passwordField: !!passwordField
      });
      
      // Mostrar todos los inputs disponibles para debugging
      logger.warning('Inputs disponibles para debugging');
      inputs.forEach(input => {
        if (input.type === 'text' || input.type === 'email' || input.type === 'password') {
          logger.debug('Input relevante', input);
        }
      });
    }
    
    // Esperar un poco antes de cerrar
    logger.info('Esperando 10 segundos antes de cerrar (puedes inspeccionar manualmente)...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    logger.error('Error durante debug', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  } finally {
    if (browser) {
      await browser.close();
      logger.info('Browser cerrado');
    }
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  debugLogin().catch((error) => {
    console.error('Error fatal:', error);
  });
}

export { debugLogin };