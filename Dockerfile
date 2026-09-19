# Multi-stage build for production
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application code
COPY . .

# Set production environment
ENV NODE_ENV=production

# PORT is injected by the cloud platform (Render: 10000, Docker local: 3000).
# We expose 3000 as a default for local docker-compose usage.
EXPOSE 3000

# Start application
CMD ["npm", "start"]
