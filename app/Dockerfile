FROM node:24

RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY app/package.json ./app/

RUN npm ci --workspace=app

WORKDIR /workspace/app

COPY app/ .

EXPOSE 3000

CMD ["npm", "run", "dev"]
