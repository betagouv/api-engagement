# Skills Claude - API Engagement

Ce dossier contient les skills Claude pour automatiser les workflows courants du monorepo API Engagement.

## 🎯 Skills Disponibles

- **`/safety-check`** - Validation sécurité pré-commit (secrets, .env, schemas protégés)
- **`/commit`** - Conventional Commits avec validation commitlint
- **`/branch`** - Création de branches formatées ([nom]/[type]/[sujet])
- **`/pr`** - Création de PR (titre EN, corps FR, template)
- **`/changelog`** - Résumé de déploiement accessible (staging → main, ou depuis un commit)
- **`/lint`** - Linting contextuel (ESLint + SQLFluff)

## 🎨 Philosophie

Les skills sont conçus pour être :

- **Autonomes** : Documentation self-contained (pas de lecture systématique de AGENTS.md)
- **Portables** : Chemins relatifs (fonctionnent sur tous les environnements)
- **Accessibles** : Conventions documentées directement dans chaque skill
- **Sûrs** : Validations automatiques avant opérations critiques

## 🔒 Règles de Sécurité

Les skills appliquent automatiquement :

- Blocage des fichiers `.env` et secrets hardcodés
- Protection du schéma analytics Prisma (lecture seule)
- Validation avant opérations destructrices
- Pas de logs de PII (données personnelles)

## 🚀 Utilisation

Les skills sont chargés automatiquement via `.claude/settings.local.json`.

### Exemples

```bash
# Créer un commit conventionnel
/commit

# Créer une branche
/branch

# Créer une PR
/pr

# Résumé de déploiement (staging → main)
/changelog

# Résumé de déploiement depuis un commit
/changelog --from <commit>

# Linter le code modifié
/lint
```

## 📖 Documentation

Voir chaque fichier skill (`SKILL.md`) pour la documentation détaillée de chaque commande.

## ⚙️ Configuration

La configuration globale est dans `.claude/settings.local.json` :

- Permissions pour les commandes autorisées/bloquées
- Autoload des skills
- Répertoire des skills
