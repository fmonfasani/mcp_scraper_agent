// Scraper focalizado en las secciones más valiosas encontradas
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

async function scrapeFocusedData() {
  console.log('🎯 Scraper focalizado en secciones de alto valor...');
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 500 
  });
  
  const page = await browser.newPage();
  
  // Secciones prioritarias con más datos financieros
  const prioritySections = [
    {
      name: 'Estado de Cuenta',
      url: 'https://bullmarketbrokers.com/clients/dashboard/',
      description: 'Dashboard principal con portfolio'
    },
    {
      name: 'Cotizaciones Acciones',
      url: 'https://bullmarketbrokers.com/Cotizaciones/Acciones',
      description: 'Precios en tiempo real de acciones'
    },
    {
      name: 'Cuenta Corriente',
      url: 'https://bullmarketbrokers.com/Clients/accountbalance',
      description: 'Balance y movimientos de cuenta'
    },
    {
      name: 'Evolución de Cartera',
      url: 'https://bullmarketbrokers.com/Clients/accountevolution',
      description: 'Performance histórica del portfolio'
    },
    {
      name: 'Estado de Órdenes',
      url: 'https://bullmarketbrokers.com/clients/orderstate/',
      description: 'Órdenes activas y ejecutadas'
    }
  ];
  
  const results = {
    scrapingInfo: {
      timestamp: new Date().toISOString(),
      totalSections: prioritySections.length,
      focus: 'High-value financial data sections'
    },
    sections: {}
  };
  
  try {
    // 1. LOGIN
    console.log('🔐 Realizando login...');
    await page.goto('https://bullmarketbrokers.com/Security/SignIn');
    
    await page.fill('input[type="email"]', 'fmonfasani@gmail.com');
    await page.fill('input[type="password"]', '$Karaoke27570');
    await page.click('#submitButton');
    
    await page.waitForURL('**/Dashboard', { timeout: 15000 });
    console.log('✅ Login exitoso');
    
    // 2. EXTRAER DATOS DETALLADOS DE CADA SECCIÓN
    for (const [index, section] of prioritySections.entries()) {
      console.log(`\n📊 ${index + 1}/${prioritySections.length} - ${section.name}`);
      console.log(`📍 ${section.url}`);
      
      try {
        await page.goto(section.url, { 
          waitUntil: 'domcontentloaded', 
          timeout: 20000 
        });
        
        await page.waitForTimeout(3000);
        
        // Extraer datos específicos y detallados
        const sectionData = await page.evaluate((sectionName) => {
          const data = {
            basic: {
              title: document.title,
              url: window.location.href,
              timestamp: new Date().toISOString()
            },
            tables: [],
            financialSummary: {},
            rawContent: {}
          };
          
          // 1. EXTRAER TODAS LAS TABLAS CON DATOS COMPLETOS
          const tables = Array.from(document.querySelectorAll('table'));
          
          data.tables = tables.map((table, tableIndex) => {
            // Headers
            const headers = Array.from(table.querySelectorAll('th')).map(th => 
              th.textContent?.trim().replace(/\s+/g, ' ') || ''
            );
            
            // Todas las filas (no solo muestra)
            const allRows = Array.from(table.querySelectorAll('tbody tr')).map(row => 
              Array.from(row.querySelectorAll('td')).map(cell => 
                cell.textContent?.trim().replace(/\s+/g, ' ') || ''
              )
            );
            
            // Detectar tipo de tabla por headers
            const headerText = headers.join(' ').toLowerCase();
            let tableType = 'unknown';
            
            if (headerText.includes('producto') || headerText.includes('símbolo')) {
              tableType = 'portfolio';
            } else if (headerText.includes('fecha') && headerText.includes('movimiento')) {
              tableType = 'movements';
            } else if (headerText.includes('precio') || headerText.includes('cotización')) {
              tableType = 'prices';
            } else if (headerText.includes('orden')) {
              tableType = 'orders';
            }
            
            return {
              index: tableIndex,
              type: tableType,
              headers,
              rowCount: allRows.length,
              data: allRows
            };
          });
          
          // 2. EXTRAER DATOS FINANCIEROS ESPECÍFICOS
          const bodyText = document.body.textContent || '';
          
          data.financialSummary = {
            // Montos específicos
            arsAmounts: bodyText.match(/ARS\s*[\d,]+\.?\d*/g) || [],
            usdAmounts: bodyText.match(/USD\s*[\d,]+\.?\d*/g) || [],
            generalAmounts: bodyText.match(/\$\s*[\d,]+\.?\d*/g) || [],
            
            // Variaciones y porcentajes
            percentages: bodyText.match(/[-+]?[\d.]+%/g) || [],
            variations: bodyText.match(/[-+]\s*ARS\s*[\d,]+\.?\d*/g) || [],
            
            // Códigos de instrumentos
            stockCodes: bodyText.match(/[A-Z]{3,6}(?=\s|\*|$|\.)/g) || [],
            
            // Fechas
            dates: bodyText.match(/\d{1,2}\/\d{1,2}\/\d{4}/g) || [],
            
            // Totales y balances
            totals: bodyText.match(/Total[:\s]*ARS\s*[\d,]+\.?\d*/gi) || [],
            balances: bodyText.match(/Saldo[:\s]*ARS\s*[\d,]+\.?\d*/gi) || []
          };
          
          // 3. CONTENIDO ESPECÍFICO POR TIPO DE SECCIÓN
          if (sectionName.includes('Cotizaciones')) {
            data.marketData = {
              symbols: Array.from(document.querySelectorAll('td')).map(td => td.textContent?.trim()).filter(text => /^[A-Z]{3,6}$/.test(text)),
              prices: bodyText.match(/[\d,]+\.?\d*(?=\s*ARS|\s*USD)/g) || [],
              volumes: bodyText.match(/Vol[:\s]*[\d,]+/gi) || []
            };
          }
          
          if (sectionName.includes('Portfolio') || sectionName.includes('Estado')) {
            data.portfolioMetrics = {
              positions: bodyText.match(/\d+(?:\.\d+)?\s*acciones?/gi) || [],
              pnl: bodyText.match(/Gan-Per|Pérdida|Ganancia[:\s]*[-+]?ARS\s*[\d,]+/gi) || [],
              totalValue: bodyText.match(/Total[:\s]*ARS\s*[\d,]+\.?\d*/gi) || []
            };
          }
          
          if (sectionName.includes('Cuenta Corriente') || sectionName.includes('Balance')) {
            data.accountData = {
              movements: bodyText.match(/\d{1,2}\/\d{1,2}\/\d{4}[^ARS]*ARS\s*[\d,]+/g) || [],
              credits: bodyText.match(/Crédito|Ingreso[:\s]*ARS\s*[\d,]+/gi) || [],
              debits: bodyText.match(/Débito|Egreso[:\s]*ARS\s*[\d,]+/gi) || []
            };
          }
          
          return data;
        }, section.name);
        
        results.sections[section.name] = {
          ...section,
          success: true,
          data: sectionData
        };
        
        // Log de resultados
        console.log(`   ✅ Tablas: ${sectionData.tables.length}`);
        console.log(`   💰 Montos ARS: ${sectionData.financialSummary.arsAmounts.length}`);
        console.log(`   💵 Montos USD: ${sectionData.financialSummary.usdAmounts.length}`);
        console.log(`   📈 Porcentajes: ${sectionData.financialSummary.percentages.length}`);
        console.log(`   🏷️ Códigos: ${sectionData.financialSummary.stockCodes.length}`);
        
        // Mostrar datos específicos importantes
        if (sectionData.tables.length > 0) {
          const mainTable = sectionData.tables[0];
          console.log(`   📊 Tabla principal (${mainTable.type}): ${mainTable.rowCount} filas`);
          
          if (mainTable.headers.length > 0) {
            console.log(`   🏷️ Headers: ${mainTable.headers.slice(0, 4).join(', ')}${mainTable.headers.length > 4 ? '...' : ''}`);
          }
        }
        
        // Mostrar datos financieros clave
        if (sectionData.financialSummary.totals.length > 0) {
          console.log(`   💰 Totales: ${sectionData.financialSummary.totals.slice(0, 2).join(', ')}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        results.sections[section.name] = {
          ...section,
          success: false,
          error: error.message
        };
      }
    }
    
    // 3. ANÁLISIS Y CONSOLIDACIÓN
    console.log('\n📈 === ANÁLISIS CONSOLIDADO ===');
    
    const consolidatedData = {
      totalTables: 0,
      totalMontos: 0,
      allStockCodes: new Set(),
      allArsAmounts: [],
      allUsdAmounts: [],
      keyMetrics: {}
    };
    
    Object.values(results.sections).forEach(section => {
      if (section.success) {
        consolidatedData.totalTables += section.data.tables.length;
        consolidatedData.totalMontos += section.data.financialSummary.arsAmounts.length + section.data.financialSummary.usdAmounts.length;
        
        section.data.financialSummary.stockCodes.forEach(code => 
          consolidatedData.allStockCodes.add(code)
        );
        
        consolidatedData.allArsAmounts.push(...section.data.financialSummary.arsAmounts);
        consolidatedData.allUsdAmounts.push(...section.data.financialSummary.usdAmounts);
      }
    });
    
    results.consolidatedAnalysis = consolidatedData;
    
    console.log(`📊 Total de tablas extraídas: ${consolidatedData.totalTables}`);
    console.log(`💰 Total de montos encontrados: ${consolidatedData.totalMontos}`);
    console.log(`🏷️ Códigos únicos de instrumentos: ${consolidatedData.allStockCodes.size}`);
    console.log(`💵 Códigos encontrados: ${Array.from(consolidatedData.allStockCodes).slice(0, 5).join(', ')}...`);
    
    // 4. GUARDAR RESULTADOS
    const filename = `focused_financial_data_${Date.now()}.json`;
    writeFileSync(filename, JSON.stringify(results, null, 2));
    
    console.log(`\n💾 Datos completos guardados en: ${filename}`);
    
    console.log('\n⏳ Esperando 5 segundos...');
    await page.waitForTimeout(5000);
    
    return results;
    
  } catch (error) {
    console.error('💥 Error general:', error.message);
    return { error: error.message, success: false };
  } finally {
    await browser.close();
    console.log('🔒 Browser cerrado');
  }
}

// Ejecutar scraper focalizado
scrapeFocusedData()
  .then(result => {
    if (result.success !== false) {
      console.log('\n🎉 Scraping focalizado completado exitosamente');
    } else {
      console.log('❌ Scraping falló:', result.error);
    }
  })
  .catch(console.error);