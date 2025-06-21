import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Checking Scraping MCP Agent Setup...\n');

// Verificar Node.js version
function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
  
  console.log(`📦 Node.js version: ${nodeVersion}`);
  
  if (majorVersion >= 18) {
    console.log('✅ Node.js version is compatible');
  } else {
    console.log('❌ Node.js version is too old. Please upgrade to Node.js 18+');
    return false;
  }
  return true;
}

// Verificar dependencias instaladas
function checkDependencies() {
  console.log('\n📋 Checking dependencies...');
  
  const criticalDeps = [
    'playwright',
    '@modelcontextprotocol/sdk',
    'cheerio',
    'zod',
    'winston'
  ];
  
  try {
    const packageJson = JSON.parse(
      execSync('cat package.json', { encoding: 'utf8' })
    );
    
    const installedDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    let allInstalled = true;
    criticalDeps.forEach(dep => {
      if (installedDeps[dep]) {
        console.log(`✅ ${dep}: ${installedDeps[dep]}`);
      } else {
        console.log(`❌ ${dep}: NOT INSTALLED`);
        allInstalled = false;
      }
    });
    
    return allInstalled;
  } catch (error) {
    console.log('❌ Error checking dependencies:', error);
    return false;
  }
}

// Verificar browsers de Playwright
function checkPlaywrightBrowsers() {
  console.log('\n🌐 Checking Playwright browsers...');
  
  try {
    execSync('npx playwright --version', { stdio: 'pipe' });
    console.log('✅ Playwright CLI is available');
    
    // Intentar verificar browsers instalados
    try {
      const output = execSync('npx playwright install --dry-run', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      if (output.includes('is already installed')) {
        console.log('✅ Playwright browsers are installed');
        return true;
      } else {
        console.log('⚠️ Playwright browsers may need installation');
        console.log('💡 Run: npx playwright install');
        return false;
      }
    } catch {
      console.log('⚠️ Unable to verify browser installation');
      return false;
    }
  } catch (error) {
    console.log('❌ Playwright is not properly installed');
    return false;
  }
}

// Verificar estructura de carpetas
function checkFolderStructure() {
  console.log('\n📁 Checking folder structure...');
  
  const requiredFolders = [
    'src',
    'src/core',
    'src/mcp',
    'src/agents',
    'src/utils',
    'src/types',
    'examples',
    'scripts',
    'config'
  ];
  
  let allFoldersExist = true;
  requiredFolders.forEach(folder => {
    if (existsSync(folder)) {
      console.log(`✅ ${folder}/`);
    } else {
      console.log(`❌ ${folder}/ - MISSING`);
      allFoldersExist = false;
    }
  });
  
  // Crear carpeta logs si no existe
  if (!existsSync('logs')) {
    try {
      mkdirSync('logs');
      console.log('✅ logs/ - CREATED');
    } catch (error) {
      console.log('❌ logs/ - FAILED TO CREATE');
      allFoldersExist = false;
    }
  } else {
    console.log('✅ logs/');
  }
  
  return allFoldersExist;
}

// Verificar archivos de configuración
function checkConfigFiles() {
  console.log('\n⚙️ Checking configuration files...');
  
  const configFiles = [
    'package.json',
    'tsconfig.json',
    '.env'
  ];
  
  let allConfigExists = true;
  configFiles.forEach(file => {
    if (existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`⚠️ ${file} - MISSING`);
      if (file === '.env') {
        console.log('💡 Create .env file based on .env.example');
      }
      if (file !== '.env') allConfigExists = false;
    }
  });
  
  return allConfigExists;
}

// Test de compilación TypeScript
function checkTypeScriptCompilation() {
  console.log('\n🔧 Testing TypeScript compilation...');
  
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    console.log('✅ TypeScript compilation successful');
    return true;
  } catch (error) {
    console.log('❌ TypeScript compilation failed');
    console.log('💡 Check your TypeScript files for errors');
    return false;
  }
}

// Test básico de importación
async function checkBasicImports() {
  console.log('\n📦 Testing basic imports...');
  
  try {
    // Test import de módulos principales
    const { ScrapingLogger } = await import('../src/utils/logger.js');
    const logger = ScrapingLogger.getInstance();
    console.log('✅ Logger import successful');
    
    // Más tests pueden ir aquí...
    return true;
  } catch (error) {
    console.log('❌ Import test failed:', error);
    return false;
  }
}

// Ejecutar todas las verificaciones
async function runAllChecks() {
  const checks = [
    { name: 'Node.js Version', fn: checkNodeVersion },
    { name: 'Dependencies', fn: checkDependencies },
    { name: 'Playwright Browsers', fn: checkPlaywrightBrowsers },
    { name: 'Folder Structure', fn: checkFolderStructure },
    { name: 'Config Files', fn: checkConfigFiles },
    { name: 'TypeScript Compilation', fn: checkTypeScriptCompilation }
  ];
  
  const results = [];
  
  for (const check of checks) {
    const result = await check.fn();
    results.push({ name: check.name, passed: result });
    console.log(''); // Separador
  }
  
  // Resumen final
  console.log('📊 SETUP CHECK SUMMARY:');
  console.log('=' .repeat(30));
  
  let allPassed = true;
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    if (!result.passed) allPassed = false;
  });
  
  console.log('=' .repeat(30));
  
  if (allPassed) {
    console.log('🎉 All checks passed! Your setup is ready.');
    console.log('💡 Next steps:');
    console.log('   - npm run dev (start development)');
    console.log('   - tsx examples/simple-test.ts (run test)');
  } else {
    console.log('⚠️ Some checks failed. Please fix the issues above.');
    console.log('💡 Quick fixes:');
    console.log('   - npm install (install dependencies)');
    console.log('   - npx playwright install (install browsers)');
    console.log('   - cp .env.example .env (create environment file)');
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllChecks().catch(console.error);
}