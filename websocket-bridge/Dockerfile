# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S websocket -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production && \
    npm cache clean --force

# Copy application code
COPY server.js ./

# Change ownership to non-root user
RUN chown -R websocket:nodejs /app

# Switch to non-root user
USER websocket

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "server.js"]
