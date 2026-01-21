# Use Node.js 24
FROM node:24 AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY vite.config.js ./

RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
