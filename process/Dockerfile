FROM node:18-bullseye-slim

# Installer les dépendances système nécessaires pour MongoDB Memory Server
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcurl4 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer toutes les dépendances (y compris celles de développement)
RUN npm ci

# Copier le reste des fichiers source
COPY . .

# Générer les fichiers Prisma
RUN npm run generate

# Exposer le port pour le développement
EXPOSE 3002

# Commande par défaut pour le développement
CMD ["npm", "run", "dev"]
