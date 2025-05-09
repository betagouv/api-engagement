# Étape de construction
FROM node:18-alpine AS builder

WORKDIR /app

# Copier les fichiers de du00e9pendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le reste des fichiers source
COPY . .

# Construire l'application Next.js
RUN npm run build

# Étape de production
FROM node:18-alpine

WORKDIR /app

# Définir les variables d'environnement pour la production
ENV NODE_ENV=production
ENV PORT=8080

# Copier les fichiers de du00e9pendances
COPY package*.json ./

# Installer uniquement les du00e9pendances de production
RUN npm ci --only=production

# Copier les fichiers construits et nécessaires depuis l'étape de construction
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js .

# Exposer le port sur lequel l'application s'exécute
EXPOSE 8080

# Commande pour du00e9marrer l'application
CMD ["npm", "start"]
