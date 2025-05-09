# Étape de construction
FROM node:18-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le reste des fichiers source
COPY . .

# Construire l'application
RUN npm run build

# Étape de production
FROM node:18-alpine

WORKDIR /app

# Définir les variables d'environnement pour la production
ENV NODE_ENV=production

# Copier les fichiers du serveur Express
COPY server ./server

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer uniquement les dépendances de production
RUN npm ci --only=production

# Copier les fichiers construits depuis l'étape de construction
COPY --from=builder /app/dist ./dist

# Exposer le port sur lequel l'application s'exécute
EXPOSE 8080

# Commande pour démarrer l'application
CMD ["node", "server/index.js"]
