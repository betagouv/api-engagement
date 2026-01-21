# Build
FROM node:24 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3003

CMD ["npm", "run", "dev"]
