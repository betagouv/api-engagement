FROM node:24

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY plateform/package*.json ./plateform/
COPY packages/taxonomy ./packages/taxonomy

WORKDIR /workspace/plateform

RUN npm ci --workspace=plateform

COPY plateform/ .

EXPOSE 3005

CMD ["npm", "run", "dev"]
