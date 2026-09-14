FROM node:24

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY widget/package.json ./widget/
COPY packages/dto ./packages/dto

RUN chown -R node:node /workspace

USER node

RUN npm ci --workspace=widget

WORKDIR /workspace/widget

COPY --chown=node:node widget/ .

EXPOSE 3003

CMD ["npm", "run", "dev"]
