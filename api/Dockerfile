FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libcurl4 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY api/package*.json ./api/
COPY packages/taxonomy ./packages/taxonomy

RUN npm ci --workspace=api

COPY api ./api

WORKDIR /workspace/api

EXPOSE 3002

CMD ["npm", "run", "dev"]
