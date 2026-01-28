---
description: "Create conventional commits"
name: "commit"
---

# Skill: Conventional Commit

Crée un commit suivant les Conventional Commits du projet avec validation automatique.

## Usage

```bash
/commit
```

## Conventions du Projet

**Format de commit** : `type(scope): sujet`

- Types autorisés : `feat`, `refactor`, `fix`, `chore`, `test`
- Scopes autorisés : `app`, `api`, `analytics`, `widget`, `jobs`, `ci`
- Sujet max 72 caractères
- Langue : Anglais
- Validation : commitlint (hook Husky)

_(Voir AGENTS.md et commitlint.config.cjs pour détails)_

## Workflow

### 1. Détecter les Changements

```bash
# Fichiers modifiés/ajoutés/supprimés
git status --porcelain

# Diff détaillé (staged + unstaged)
git diff HEAD

# Diff stats
git diff HEAD --stat
```

**Parser les chemins** pour déterminer les domaines affectés :

- `api/**` → scope `api`
- `app/**` → scope `app`
- `analytics/**` → scope `analytics`
- `widget/**` → scope `widget`
- `terraform/**`, `.github/workflows/**` → scope `ci`
- Fichiers batch (`**/jobs/**`) → scope `jobs`

**Déterminer le scope principal** :

- Si un seul domaine : utiliser ce scope
- Si plusieurs domaines : suggérer le scope dominant (plus de fichiers modifiés)
- Si fichiers mixtes (ex: api + widget) : proposer les deux options

### 2. Exécuter Safety Checks

```bash
# CRITIQUE : Exécuter /safety-check AVANT de continuer
/safety-check
```

**Si `/safety-check` échoue (exit code 1)** :

```
❌ Commit bloqué par safety checks
→ Voir les erreurs ci-dessus
→ Action : Corriger les erreurs et relancer /commit
```

**STOP** : Ne pas créer le commit.

**Si warnings (exit code 0 avec warnings)** :
Demander confirmation utilisateur :

```
⚠️  Safety warnings détectés (voir ci-dessus)
→ Voulez-vous continuer le commit ? (y/n)
```

### 3. Analyser le Type de Changement

Basé sur les fichiers modifiés et le diff :

- Nouveaux fichiers (feature) → `feat`
- Corrections de bugs (fix patterns) → `fix`
- Refactoring (pas de changement comportemental) → `refactor`
- Tests uniquement → `test`
- Tâches de maintenance (config, deps, CI) → `chore`

**Heuristiques** :

- Présence de mots-clés dans le diff : `TODO`, `FIXME`, `bug`, `error`, `fix`
- Nouveaux tests : `*.test.ts`, `*.spec.ts`, `describe(`, `it(`
- Migrations DB : `prisma/migrations/`, `analytics/migrations/`
- Config : `package.json`, `.env.example`, `tsconfig.json`

### 4. Générer le Message de Commit

**Format** : `type(scope): subject`

Exemple de génération :

```
# Scope : api
# Fichiers : api/src/controllers/events.ts, api/src/services/tracking.ts
# Nouveaux : oui (feature)
# → Suggestion :

feat(api): add client tracking to stat events
```

**Règles de génération du sujet** :

- Impératif présent (add, update, fix, refactor, etc.)
- Pas de majuscule en début (sauf noms propres)
- Pas de point final
- Max 72 caractères
- Anglais

**Vérifier l'historique** pour cohérence du style :

```bash
git log --oneline -n 10 --pretty=format:"%s"
```

Analyser les patterns de messages existants pour garder la cohérence.

### 5. Valider le Message

```bash
# Tester avec commitlint (dry-run)
echo "feat(api): add client tracking" | npx commitlint --config commitlint.config.cjs
```

**Si validation échoue** :

```
❌ Message invalide selon commitlint
→ Erreur : [détails de l'erreur]
→ Suggestion : [message corrigé]
```

Proposer le message corrigé et redemander validation.

### 6. Stager les Fichiers

```bash
# Lister les fichiers non stagés
git status --porcelain | grep '^[ M?]'
```

**Exclure automatiquement** :

- `**/.env`, `**/.env.*`
- `**/node_modules/**`
- `**/dist/`, `**/build/`, `**/.next/`
- Artefacts (dbt target/, logs/, playwright reports/)

```bash
# Stager les fichiers pertinents
git add <fichiers_pertinents>
```

**Demander confirmation** si fichiers sensibles détectés (ex: `package-lock.json` avec beaucoup de changements).

### 7. Créer le Commit

```bash
git commit -m "$(cat <<'EOF'
feat(api): add client tracking to stat events

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

**Format du commit** :

- Ligne 1 : `type(scope): subject`
- Ligne 2 : (vide)
- Ligne 3+ : Corps optionnel (si nécessaire pour contexte)
- Ligne finale : `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`

### 8. Post-Commit

```bash
# Afficher le commit créé
git log -1 --pretty=format:"%h - %s (%an, %ar)"

# Afficher les fichiers commités
git show --name-only --pretty=format:"" HEAD
```

**Suggérer prochaines actions** :

```
✅ Commit créé avec succès : feat(api): add client tracking

→ Prochaines étapes suggérées :
  1. Vérifier les tests : npm run test (ou /api/test)
  2. Linter le code : npm run lint (ou /lint)
  3. Pousser la branche : git push
  4. Créer une PR : /pr
```

## Exemples

### Exemple 1 : Feature API

```
Fichiers modifiés :
- api/src/controllers/events.ts (+45 -10)
- api/src/services/tracking.ts (+120 -0)
- api/src/types/event.ts (+15 -5)

→ Scope : api
→ Type : feat (nouveaux fichiers + feature)
→ Message : feat(api): add client tracking to stat events
```

### Exemple 2 : Fix Widget

```
Fichiers modifiés :
- widget/components/DatePicker.tsx (+5 -5)

→ Scope : widget
→ Type : fix (correction de bug)
→ Message : fix(widget): correct date filter validation
```

### Exemple 3 : Chore Multiple Scopes

```
Fichiers modifiés :
- package.json (+2 -2)
- api/package.json (+1 -1)
- widget/package.json (+1 -1)

→ Scope : ci (config globale)
→ Type : chore (maintenance)
→ Message : chore(ci): update dependencies
```

### Exemple 4 : Refactor Analytics

```
Fichiers modifiés :
- analytics/src/jobs/export.ts (+80 -120)
- analytics/src/utils/helpers.ts (+30 -60)

→ Scope : analytics
→ Type : refactor (restructuration sans changement comportemental)
→ Message : refactor(analytics): simplify export job logic
```

## Gestion des Cas Spéciaux

### Migrations DB

Si migrations Prisma détectées :

```bash
git diff --name-only | grep 'api/prisma/migrations/'
```

Ajouter dans le corps du commit :

```
feat(api): add client_id to stat_event table

Adds client_id column to track event origin.
Migration: 20260127_add_client_id_to_stat_event

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Breaking Changes

Si breaking change détecté (suppression de champs API, modification de schéma) :

```
feat(api)!: remove deprecated analytics endpoints

BREAKING CHANGE: /analytics/* endpoints removed, use /stats/* instead

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Multiples Scopes

Si vraiment nécessaire (rare) :

```
feat(api,widget): add cross-origin event tracking
```

Mais préférer découper en plusieurs commits si possible.

## Configuration

Permissions requises dans `.claude/settings.local.json` :

- `Bash(git status:*)`
- `Bash(git diff:*)`
- `Bash(git log:*)`
- `Bash(git add:*)`
- `Bash(git commit:*)`
- `Bash(npx commitlint:*)`
- `Read(*)`

## Intégration

Ce skill est utilisé par :

- `/pr` (pour valider les commits avant création de PR)
- Workflows manuels (développeur utilise `/commit` directement)

## Notes

- **Toujours exécuter `/safety-check` avant de créer le commit**
- Respecter le format HEREDOC pour le message de commit (évite les problèmes de quotes)
- Le hook Husky `commit-msg` exécute `commitlint` en parallèle (validation supplémentaire)
- Les commits multi-lignes sont supportés (sujet + corps + Co-Authored-By)
