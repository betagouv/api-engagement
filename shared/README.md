# API Engagement - Code Partagé

Ce répertoire contient le code partagé entre les différents sous-projets du monorepo api-engagement.

## Structure

- `/models/mongoose` : Modèles MongoDB partagés
- `/models/prisma` : Schéma Prisma partagé
- `/config` : Configurations communes (ESLint, etc.)
- `/services` : Services et helpers communs
- `/types` : Types TypeScript partagés

## Installation

Le package `@api-engagement/shared` est installé automatiquement dans les sous-projets grâce à la configuration du monorepo.

## Utilisation

```typescript
// Importer les modèles MongoDB
import { MissionModel, OrganizationModel } from '@api-engagement/shared';

// Importer le client Prisma
import { getPrismaClient } from '@api-engagement/shared';

// Utiliser les services partagés
import { connectToMongoDB } from '@api-engagement/shared';
```

## Développement

Pour compiler le code partagé :

```bash
npm run build:shared
```

Pour compiler le code partagé en mode watch :

```bash
npm run watch:shared
```
