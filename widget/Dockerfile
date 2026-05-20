FROM node:24

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY widget/package.json ./widget/

RUN npm ci --workspace=widget

WORKDIR /workspace/widget

COPY widget/ .

EXPOSE 3003

CMD ["npm", "run", "dev"]
