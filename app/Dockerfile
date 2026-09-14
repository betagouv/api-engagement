FROM node:24

RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY app/package.json ./app/

RUN chown -R node:node /workspace

USER node

RUN npm ci --workspace=app

WORKDIR /workspace/app

COPY --chown=node:node app/ .

EXPOSE 3000

CMD ["npm", "run", "dev"]
