FROM node:22-alpine

# Dépendances natives de sharp (images) et de strapi.
RUN apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev git > /dev/null 2>&1

WORKDIR /opt/app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN chown -R node:node /opt/app

USER node

EXPOSE 1337

CMD ["npm", "run", "dev"]
