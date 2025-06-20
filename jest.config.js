module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts#!/bin/bash

# 🚀 SCRAPING MCP AGENT - SETUP SCRIPT
# Este script crea toda la estructura del proyecto con archivos base

set -e  # Exit on any error

PROJECT_NAME="scraping-mcp-agent"
CURRENT_DIR=$(pwd)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🚀 CREANDO PROYECTO: $PROJECT_NAME${NC}"
echo -e "${BLUE}======================================${NC}"

# 1. Crear directorio principal
echo -e "${YELLOW}📁 Creando estructura de carpetas...${NC}"
mkdir -p $PROJECT_NAME
cd $PROJECT_NAME

# 2. Crear estructura de directorios
mkdir -p src/{core,mcp,agents,utils,types}
mkdir -p {examples,scripts,config,docs,tests}

echo -e "${GREEN}✅ Estructura de carpetas creada${NC}"

# 3. Crear package.json
echo -e "${YELLOW}📄 Creando package.json...${NC}"
cat > package.json << 'EOF'
{
  "name": "scraping-mcp-agent",
  "version": "1.0.0",
  "description": "Professional web scraping agent with MCP integration for AI-powered data extraction",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write src/**/*.ts",
    "install-browsers": "playwright install",
    "example:quick": "tsx examples/quick-start.ts",
    "example:ecommerce": "tsx examples/ecommerce-example.ts",
    "benchmark": "tsx scripts/benchmark.ts",
    "clean": "rimraf dist",
    "setup": "npm install && npm run install-browsers",
    "prepublishOnly": "npm run clean && npm run build"
  },
  "keywords": [
    "web-scraping",
    "mcp",
    "ai-agent",
    "playwright",
    "cheerio",
    "data-extraction",
    "automation"
  ],
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/scraping-mcp-agent.git"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.3.0",
    "cheerio": "^1.0.0-rc.12",
    "playwright": "^1.40.0",
    "zod": "^3.22.4",
    "winston": "^3.11.0",
    "p-queue": "^8.0.1",
    "lodash": "^4.17.21",
    "dotenv": "^16.3.1",
    "user-agents": "^1.0.1417"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/lodash": "^4.14.202",
    "@typescript-eslint/eslint-plugin": "^6.13.1",
    "@typescript-eslint/parser": "^6.13.1",
    "eslint": "^8.54.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.8",
    "ts-jest": "^29.1.1",
    "tsx": "^4.6.0",
    "typescript": "^5.3.2",
    "prettier": "^3.1.0",
    "rimraf": "^5.0.5"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
