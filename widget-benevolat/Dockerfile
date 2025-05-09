# Use Node.js 18 for development
FROM node:18 AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source files
COPY . .

# Expose development port
EXPOSE 3001

# Default command for development
CMD ["npm", "run", "dev"]
