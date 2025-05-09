# Étape de construction
FROM node:18-slim AS builder

WORKDIR /app

# Copier les fichiers de du00e9pendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le reste des fichiers source
COPY . .

# Générer les fichiers Prisma
RUN npm run generate

# Construire l'application
RUN npm run build

# Étape de production
FROM node:18-slim

WORKDIR /app

# Définir les variables d'environnement pour la production
ENV NODE_ENV=production

# Copier les fichiers de du00e9pendances
COPY package*.json ./

# Installer uniquement les dépendances de production
RUN npm ci --only=production

# Copier les fichiers construits depuis l'étape de construction
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Exposer le port sur lequel l'application s'exécute
EXPOSE 8080

# Commande pour démarrer l'application
CMD ["node", "dist/index.js"]
