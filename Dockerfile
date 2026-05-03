# Multi-stage build for production
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Set production environment
ENV NODE_ENV=production

# Cloud Run injects PORT environment variable, 
# but we expose it for local testing/documentation.
EXPOSE 8080

# Start application
CMD ["npm", "start"]
