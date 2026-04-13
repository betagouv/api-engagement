---
description: "Contextual linting"
name: "lint"
version: "1.0.0"
---

# Skill: Contextual Linting

Exécute le linting contextuel selon les domaines modifiés (ESLint + SQLFluff).

## Usage

```bash
/lint              # Lint les domaines modifiés
/lint --fix        # Lint avec auto-fix
/lint --all        # Lint tout le monorepo
```

## Workflow

### 1. Détecter les Domaines Modifiés

```bash
# Fichiers modifiés (staged + unstaged)
git diff --name-only HEAD

# Fichiers staged uniquement (si mode pre-commit)
git diff --cached --name-only
```

**Parser les chemins** pour déterminer les domaines :

- `api/**/*.{ts,js,tsx,jsx}` → **ESLint API**
- `app/**/*.{ts,js,tsx,jsx}` → **ESLint App**
- `widget/**/*.{ts,js,tsx,jsx}` → **ESLint Widget**
- `analytics/src/**/*.{ts,js}` → **ESLint Analytics**
- `analytics/dbt/models/**/*.sql` → **SQLFluff dbt**

**Exemple** :

```
Fichiers modifiés :
- api/src/controllers/events.ts
- api/src/services/tracking.ts
- widget/components/Filter.tsx
- analytics/dbt/models/missions/active.sql

→ Domaines détectés :
  - api (ESLint)
  - widget (ESLint)
  - analytics (SQLFluff)
```

### 2. Mode Sélection

#### Mode 1 : Domaines Modifiés (défaut)

Lint **seulement** les domaines avec fichiers modifiés.

**Avantages** :

- Rapide (cible les changements)
- Pertinent (lint ce qui a changé)

**Si aucun fichier lintable modifié** :

```
→ Aucun fichier à linter détecté

→ Fichiers modifiés : 3
  - README.md (documentation)
  - docker-compose.yml (config)
  - terraform/main.tf (infra)

→ Action : Aucun linting nécessaire
```

**STOP** : Exit code 0 (succès)

#### Mode 2 : Tout le Monorepo (flag `--all`)

Lint **tous** les domaines, même non modifiés.

```bash
/lint --all
```

**Avantages** :

- Détecte les erreurs globales
- Utile après changement de règles ESLint

**Inconvénients** :

- Plus lent (lint tout le code)

### 3. Exécuter ESLint

Pour chaque domaine ESLint détecté :

#### 4.1 API

```bash
# Lint API
cd api && npm run lint
```

**Commande sous-jacente** (voir `api/package.json`) :

```bash
eslint . --ext .ts,.js --max-warnings 0
```

**Si flag `--fix`** :

```bash
cd api && npm run lint:fix
# ou
cd api && eslint . --ext .ts,.js --fix
```

#### 4.2 App

```bash
# Lint App
cd app && npm run lint
```

#### 4.3 Widget

```bash
# Lint Widget
cd widget && npm run lint
```

**Commande sous-jacente** (Next.js) :

```bash
next lint --max-warnings 0
```

#### 4.4 Analytics

```bash
# Lint Analytics
cd analytics && npm run lint
```

### 4. Exécuter SQLFluff (dbt)

Si fichiers SQL modifiés dans `analytics/dbt/models/` :

```bash
# Lint dbt models
cd analytics/dbt && sqlfluff lint models/
```

**Configuration** : `.sqlfluff` (si existe dans `analytics/dbt/`)

**Si flag `--fix`** :

```bash
cd analytics/dbt && sqlfluff fix models/
```

### 5. Collecter les Résultats

Pour chaque domaine, collecter :

- **Exit code** : 0 (succès), 1 (erreurs), 2 (warnings)
- **Nombre d'erreurs** : Extraire depuis sortie
- **Nombre de warnings** : Extraire depuis sortie
- **Fichiers avec problèmes** : Lister les fichiers

**Parser la sortie ESLint** :

```
Exemple sortie :
/path/to/file.ts
  12:5  error  'foo' is not defined  no-undef
  24:10 warning Unexpected console statement  no-console

✖ 2 problems (1 error, 1 warning)
```

**Extraire** :

- Erreurs : 1
- Warnings : 1
- Fichiers : `file.ts`

**Parser la sortie SQLFluff** :

```
Exemple sortie :
== [models/missions/active.sql] FAIL
L:  12 | P:   5 | L034 | Select wildcards not allowed
L:  24 | P:  10 | L010 | Inconsistent capitalisation

All Finished. FAIL: 1 files
```

**Extraire** :

- Erreurs : 2
- Fichier : `models/missions/active.sql`

### 6. Afficher le Résumé

#### Cas 1 : Aucune Erreur

```
✅ Linting réussi

→ Domaines vérifiés : 3
  - api       : ✓ (45 fichiers)
  - widget    : ✓ (32 fichiers)
  - analytics : ✓ (12 models SQL)

→ Erreurs : 0
→ Warnings : 0
```

**Exit code 0**

#### Cas 2 : Warnings Uniquement

```
⚠️  Linting avec warnings

→ Domaines vérifiés : 2
  - api    : ⚠️  (2 warnings)
  - widget : ✓

→ Warnings : 2
  - api/src/controllers/events.ts:24 - Unexpected console statement

→ Action : Corriger les warnings ou exécuter /lint --fix
```

**Exit code 0** (warnings non bloquants selon config)

#### Cas 3 : Erreurs Détectées

```
❌ Linting échoué

→ Domaines vérifiés : 3
  - api       : ❌ (3 errors, 1 warning)
  - widget    : ✓
  - analytics : ❌ (2 errors)

→ Erreurs : 5
→ Warnings : 1

→ Détails :

**API** :
  - api/src/controllers/events.ts:12 - 'foo' is not defined
  - api/src/controllers/events.ts:45 - Missing return type
  - api/src/services/tracking.ts:8 - Unused variable 'bar'

**Analytics (SQLFluff)** :
  - models/missions/active.sql:12 - Select wildcards not allowed
  - models/missions/active.sql:24 - Inconsistent capitalisation

→ Action : Corriger les erreurs ou exécuter /lint --fix
```

**Exit code 1**

### 7. Mode Fix (Auto-Correction)

Si flag `--fix` activé :

```bash
/lint --fix
```

**Exécuter avec auto-fix** :

```bash
# ESLint
eslint . --ext .ts,.js --fix

# SQLFluff
sqlfluff fix models/
```

**Afficher les corrections** :

```
🔧 Linting avec auto-fix

→ Corrections appliquées : 8
  - api       : 5 fixes
  - widget    : 2 fixes
  - analytics : 1 fix

→ Erreurs restantes : 2 (non auto-fixables)

→ Détails :

**Corrigé automatiquement** :
  - api/src/controllers/events.ts:24 - Console statement supprimé
  - api/src/services/tracking.ts:8 - Variable 'bar' supprimée
  - analytics/dbt/models/missions/active.sql:24 - Capitalisation corrigée

**Erreurs restantes (manuel requis)** :
  - api/src/controllers/events.ts:12 - 'foo' is not defined
  - analytics/dbt/models/missions/active.sql:12 - Select wildcards not allowed

→ Action : Corriger manuellement les erreurs restantes
```

**Vérifier les changements** :

```bash
git diff
```

**Proposer de commiter les fixes** :

```
→ Voulez-vous commiter les corrections automatiques ? (y/n)
```

Si `y` :

```bash
git add <fichiers_corrigés>
# Utiliser /commit avec scope approprié
```

### 8. Intégration avec `/commit`

Le skill `/commit` peut **optionnellement** exécuter `/lint` avant de commiter.

**Workflow recommandé** :

1. Faire des modifications
2. **`/lint`** (vérifier avant commit)
3. Si erreurs : corriger ou `/lint --fix`
4. `/commit` (créer le commit)

**Mode strict (optionnel)** :
Dans `/commit`, ajouter une vérification :

```bash
# Exécuter /lint en mode check
/lint

# Si exit code != 0 (erreurs)
if [ $? -ne 0 ]; then
  echo "❌ Linting échoué, commit bloqué"
  echo "→ Action : Corriger les erreurs via /lint --fix"
  exit 1
fi
```

## Exemples

### Exemple 1 : Lint API Modifié

```
Fichiers modifiés :
- api/src/controllers/events.ts
- api/src/services/tracking.ts

→ Commande : /lint

✅ Linting réussi
→ Domaines : api (✓)
→ Erreurs : 0
```

### Exemple 2 : Lint Multi-Domaines

```
Fichiers modifiés :
- api/src/controllers/events.ts
- widget/components/Filter.tsx
- analytics/dbt/models/missions/active.sql

→ Commande : /lint

❌ Linting échoué
→ Domaines :
  - api       : ✓
  - widget    : ⚠️  (1 warning)
  - analytics : ❌ (2 errors)

→ Erreurs : 2 (analytics)
```

### Exemple 3 : Lint avec Fix

```
Fichiers modifiés :
- api/src/controllers/events.ts (3 warnings)

→ Commande : /lint --fix

🔧 Corrections appliquées : 3
✅ Aucune erreur restante

→ Voulez-vous commiter les corrections ? (y/n)
```

### Exemple 4 : Lint Tout le Monorepo

```
→ Commande : /lint --all

✅ Linting réussi
→ Domaines : api, app, widget, analytics
→ Fichiers vérifiés : 342
→ Erreurs : 0
→ Durée : 12.5s
```

## Cas Spéciaux

### Fichiers Générés

Exclure automatiquement :

- `**/*.generated.ts`
- `**/prisma/generated/`
- `**/dbt/target/`
- `**/.next/`

**Configuration ESLint** : `.eslintignore`

### Règles Personnalisées par Domaine

Chaque domaine a sa config :

- `api/.eslintrc.json`
- `app/.eslintrc.json`
- `widget/.eslintrc.json`
- `analytics/.eslintrc.json`
- `analytics/dbt/.sqlfluff`

### Désactiver des Règles (Temporaire)

Pour ignorer temporairement (debugging) :

```bash
/lint --no-fail
```

Exécute le linting mais ne bloque pas (exit code 0 même avec erreurs).

**Afficher les erreurs** mais ne pas fail.

### Lint Spécifique (Avancé)

```bash
/lint --domain api
/lint --file api/src/controllers/events.ts
```

Lint seulement un domaine ou fichier spécifique.

## Configuration

Permissions requises dans `.claude/settings.local.json` :

- `Bash(npm run lint:*)`
- `Bash(git diff:*)`
- `Read(*)`

## Intégration avec CI

Le workflow `.github/workflows/lint.yml` :

- Tourne sur chaque PR
- Lint les domaines modifiés (selon paths)
- Exécute ESLint + SQLFluff

**Différence avec le skill** :

- **Workflow CI** : Automatique, bloquant, sur PR
- **Skill `/lint`** : Manuel, local, pré-commit

Le skill permet de **valider avant de pousser** (évite échecs CI).

## Notes

- **Contextuel par défaut** : Lint seulement ce qui a changé (rapide)
- **Support multi-domaines** : ESLint (TS/JS) + SQLFluff (SQL)
- **Auto-fix disponible** : Corrections automatiques pour règles simples
- **Compatible CI** : Même config que workflows GitHub Actions
- **Non bloquant par défaut** : Warnings ne bloquent pas (configurable)
