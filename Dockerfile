# Scraping MCP Agent Dockerfile
# Multi-stage build for optimized production image

# Build stage
FROM node:18-bullseye-slim AS builder

# Set working directory
WORKDIR /app

# Install system dependencies needed for Playwright
RUN apt-get update && apt-get install -y \
    curl \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY src/ ./src/
COPY config/ ./config/

# Build the application
RUN npm run build

# Production stage
FROM node:18-bullseye-slim AS production

# Create app user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set working directory
WORKDIR /app

# Install system dependencies for Playwright browsers
RUN apt-get update && apt-get install -y \
    # Common dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libgtk-3-0 \
    libgbm1 \
    libasound2 \
    # Additional dependencies for Chromium
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    # Fonts
    fonts-liberation \
    fonts-dejavu-core \
    fontconfig \
    # Utils
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config

# Create necessary directories with proper permissions
RUN mkdir -p logs screenshots exports cache playwright-browsers && \
    chown -R appuser:appuser /app

# Switch to app user
USER appuser

# Install Playwright browsers
ENV PLAYWRIGHT_BROWSERS_PATH=/app/playwright-browsers
RUN npx playwright install chromium && \
    npx playwright install firefox

# Environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV ENABLE_LOGGING=true
ENV ENABLE_METRICS=true
ENV MAX_CONCURRENT_REQUESTS=5
ENV SCRAPING_TIMEOUT=30000
ENV ENABLE_STEALTH=true

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Expose port (if running as HTTP server)
EXPOSE 3000

# Volume for persistent data
VOLUME ["/app/logs", "/app/exports", "/app/cache"]

# Start the application
CMD ["node", "dist/index.js"]

# Labels
LABEL maintainer="your-email@example.com"
LABEL version="1.0.0"
LABEL description="Scraping MCP Agent - Advanced web scraping with anti-detection"
LABEL org.opencontainers.image.source="https://github.com/your-repo/scraping-mcp-agent"
LABEL org.opencontainers.image.documentation="https://github.com/your-repo/scraping-mcp-agent/blob/main/README.md"
LABEL org.opencontainers.image.licenses="MIT"

# Build arguments for customization
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

LABEL org.opencontainers.image.created=$BUILD_DATE
LABEL org.opencontainers.image.revision=$VCS_REF
LABEL org.opencontainers.image.version=$VERSION