FROM node:24

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY plateform/package.json ./plateform/
COPY packages/taxonomy ./packages/taxonomy
COPY packages/dto ./packages/dto

RUN chown -R node:node /workspace

USER node

WORKDIR /workspace/plateform

RUN npm ci --workspace=plateform

COPY --chown=node:node plateform/ .

EXPOSE 3005

CMD ["npm", "run", "dev"]
