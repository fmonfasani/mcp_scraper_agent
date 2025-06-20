# 🚀 Quick Installation Guide

Get the **Scraping MCP Agent** up and running in minutes!

## ⚡ One-Line Installation

```bash
# Automated setup (recommended)
curl -fsSL https://raw.githubusercontent.com/your-repo/scraping-mcp-agent/main/scripts/setup-project.sh | bash

# Or clone and setup manually
git clone https://github.com/your-repo/scraping-mcp-agent.git
cd scraping-mcp-agent
chmod +x scripts/setup-project.sh
./scripts/setup-project.sh
```

## 📋 Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))
- **4GB+ RAM** recommended
- **2GB+ free disk space**

## 🛠️ Step-by-Step Installation

### 1. Clone Repository

```bash
git clone https://github.com/your-repo/scraping-mcp-agent.git
cd scraping-mcp-agent
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Playwright browsers (choose one)
npm run install-browsers:quick    # Chromium only (recommended)
npm run install-browsers:full     # All browsers (Chrome, Firefox, Safari)
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit configuration (optional)
nano .env
```

### 4. Build and Test

```bash
# Build the project
npm run build

# Test installation
npm run example:quick
```

### 5. Start the MCP Server

```bash
# Start the server
npm start

# The server is now ready to accept MCP tool calls!
```

## 🎯 Quick Test

Verify your installation works:

```bash
# Run the 10-minute demo
npm run example:quick

# Test e-commerce scraping
npm run example:ecommerce

# Test competitive intelligence
npm run example:competitive
```

## 🔧 Configuration Options

### Basic Configuration (.env)

```bash
# Server Settings
NODE_ENV=development
MCP_SERVER_NAME=scraping-mcp-agent
MAX_CONCURRENT_REQUESTS=10

# Rate Limiting
MAX_REQUESTS_PER_MINUTE=30
MAX_REQUESTS_PER_HOUR=500

# Scraping Options
ENABLE_STEALTH=true
ENABLE_USER_AGENT_ROTATION=true
SCRAPING_TIMEOUT=30000

# Logging
LOG_LEVEL=info
ENABLE_LOGGING=true
```

### Advanced Configuration (config/default.json)

```json
{
  "scraping": {
    "defaultTimeout": 30000,
    "maxRetries": 3,
    "enableStealth": true,
    "maxConcurrentTabs": 3
  },
  "agents": {
    "ecommerce": {
      "maxReviews": 50,
      "maxVariants": 20
    },
    "jobs": {
      "maxJobsPerPage": 50,
      "maxPages": 5
    }
  }
}
```

## 🚨 Troubleshooting

### Common Issues

#### ❌ "Browser not found" Error

```bash
# Reinstall browsers
npm run install-browsers:full

# On Linux, install system dependencies
sudo npx playwright install-deps
```

#### ❌ "Permission denied" Error

```bash
# Fix permissions
chmod +x scripts/*.sh
sudo chown -R $USER:$USER ~/.cache/ms-playwright
```

#### ❌ "Port already in use" Error

```bash
# Kill existing processes
pkill -f "scraping-mcp-agent"
# Or change port in .env
echo "PORT=3001" >> .env
```

#### ❌ Memory Issues

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Or add to .env
echo "NODE_OPTIONS=--max-old-space-size=4096" >> .env
```

### System-Specific Instructions

#### 🐧 Linux (Ubuntu/Debian)

```bash
# Install system dependencies
sudo apt-get update
sudo apt-get install -y libnss3-dev libatk-bridge2.0-dev libdrm2-dev libxcomposite-dev libxdamage-dev libxrandr-dev libgbm-dev libxss-dev libasound2-dev

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 🍎 macOS

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Install Xcode Command Line Tools (if prompted)
xcode-select --install
```

#### 🪟 Windows

```powershell
# Install Node.js using Chocolatey
choco install nodejs

# Or download from https://nodejs.org/

# Install Visual C++ Redistributables
# Download from: https://aka.ms/vs/17/release/vc_redist.x64.exe
```

## 🎮 Usage Examples

### Basic Scraping

```javascript
import { scraperFactory } from 'scraping-mcp-agent';

const scraper = await scraperFactory.createScraper('auto');
const result = await scraper.scrape({
  url: 'https://example.com',
  selectors: {
    title: 'h1',
    price: '.price'
  }
});
```

### E-commerce Scraping

```javascript
import { EcommerceAgent } from 'scraping-mcp-agent';

const agent = new EcommerceAgent();
const product = await agent.scrapeProduct('https://shop.example.com/product', {
  extractReviews: true,
  maxReviews: 50
});
```

### MCP Tool Usage

```json
{
  "name": "scrape_url",
  "arguments": {
    "url": "https://example.com",
    "selectors": {
      "title": "h1",
      "content": ".content"
    },
    "options": {
      "stealth": true,
      "timeout": 30000
    }
  }
}
```

## 📊 Performance Optimization

### For High-Volume Scraping

```bash
# Increase system limits
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Configure environment for production
cp config/production.json config/local.json
export NODE_ENV=production
```

### Memory Optimization

```bash
# Enable garbage collection
export ENABLE_GARBAGE_COLLECTION=true
export GC_INTERVAL=300000

# Limit concurrent operations
export MAX_CONCURRENT_REQUESTS=5
export MAX_CONCURRENT_TABS=2
```

## 🔐 Security Setup

### Basic Security

```bash
# Create separate user for scraping
sudo useradd -m -s /bin/bash scraper
sudo usermod -aG docker scraper  # If using Docker

# Set secure permissions
chmod 600 .env
chmod 755 scripts/*.sh
```

### Production Security

```bash
# Enable request validation
export ENABLE_REQUEST_VALIDATION=true
export ENABLE_INPUT_SANITIZATION=true

# Set up firewall rules
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw enable
```

## 🚀 Production Deployment

### Docker Deployment

```bash
# Build Docker image
docker build -t scraping-mcp-agent .

# Run container
docker run -d \
  --name scraping-agent \
  -p 3000:3000 \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/config:/app/config \
  scraping-mcp-agent
```

### PM2 Process Manager

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start npm --name "scraping-agent" -- start

# Setup auto-restart
pm2 startup
pm2 save
```

### systemd Service

```bash
# Create systemd service
sudo tee /etc/systemd/system/scraping-agent.service > /dev/null <<EOF
[Unit]
Description=Scraping MCP Agent
After=network.target

[Service]
Type=simple
User=scraper
WorkingDirectory=/opt/scraping-mcp-agent
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable scraping-agent
sudo systemctl start scraping-agent
```

## 📈 Monitoring Setup

### Basic Monitoring

```bash
# View logs
npm run logs

# Check metrics
npm run metrics

# Health check
npm run health
```

### Advanced Monitoring

```bash
# Setup log rotation
sudo tee /etc/logrotate.d/scraping-agent > /dev/null <<EOF
/opt/scraping-mcp-agent/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF
```

## 🆘 Getting Help

### Documentation

- 📖 **Full Documentation**: [README.md](README.md)
- ⚖️ **Legal Guidelines**: [LEGAL.md](LEGAL.md)
- 🔧 **API Reference**: [docs/api-reference.md](docs/api-reference.md)

### Support Channels

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-repo/scraping-mcp-agent/issues)
- 💬 **Community**: [Discord Server](https://discord.gg/your-discord)
- 📧 **Email Support**: support@your-domain.com
- 📚 **Stack Overflow**: Tag `scraping-mcp-agent`

### Professional Support

- 🏢 **Enterprise Support**: enterprise@your-domain.com
- 🎓 **Training**: training@your-domain.com
- 🛠️ **Custom Development**: consulting@your-domain.com

---

**🎉 You're all set! Happy scraping with the MCP Agent!**

*Need help? Check our [troubleshooting guide](docs/troubleshooting.md) or [contact support](#getting-help).*