# Use bullseye (Debian 11) for Mongo compatibility
FROM node:18-bullseye-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    libcurl4 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run generate

EXPOSE 3002

CMD ["npm", "run", "dev"]
