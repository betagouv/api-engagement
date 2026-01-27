---
description: "Create pull requests"
---

# Skill: Create Pull Request

Crée une Pull Request avec titre EN (Conventional Commits) et corps FR (template).

## Usage

```bash
/pr
```


## Workflow

### 1. Vérifier les Prérequis

```bash
# Vérifier la branche actuelle
CURRENT_BRANCH=$(git branch --show-current)

# Vérifier si on est sur staging/main (interdit)
if [[ "$CURRENT_BRANCH" == "staging" || "$CURRENT_BRANCH" == "main" ]]; then
  echo "❌ ERREUR: Impossible de créer une PR depuis staging/main"
  echo "→ Action : Créer une feature branch via /branch"
  exit 1
fi

# Vérifier s'il y a des changements non commités
git status --porcelain
```

**Si changements non commités** :
```
⚠️  WARNING: Changements non commités détectés
→ Fichiers modifiés : 3
→ Action suggérée : Commiter via /commit avant de créer la PR
→ Voulez-vous continuer quand même ? (y/n)
```

### 2. Analyser les Changements

```bash
# Diff depuis staging
git diff staging...HEAD --stat

# Log des commits
git log staging..HEAD --oneline --no-merges

# Fichiers modifiés
git diff staging...HEAD --name-only
```

**Parser les fichiers** pour déterminer :
- **Scopes** : api, app, analytics, widget, jobs, ci
- **Scope principal** : domaine avec le plus de fichiers modifiés

**Compter les commits** :
```bash
COMMIT_COUNT=$(git log staging..HEAD --oneline --no-merges | wc -l)
```

**Si aucun commit** :
```
❌ ERREUR: Aucun commit depuis staging
→ Branche : valentin/feat/add-client-tracking
→ Action : Faire des commits via /commit
```

**STOP** : Ne pas créer la PR.

### 3. Déterminer le Type et Scope

**Analyser les messages de commits** :
```bash
git log staging..HEAD --pretty=format:"%s" --no-merges
```

**Heuristiques** :
- Si tous les commits sont `feat(api):` → Type `feat`, Scope `api`
- Si mélange `feat(api):` + `fix(api):` → Type du commit principal (dernier ou plus important)
- Si multiples scopes (api + widget) → Scope principal (plus de commits)

**Extraire le type dominant** :
- Compter les occurrences de `feat`, `fix`, `refactor`, `chore`, `test`
- Type avec le plus d'occurrences = type principal

**Exemples** :
```
Commits :
- feat(api): add client_id to events
- feat(api): add client tracking service
- test(api): add client tracking tests

→ Type : feat
→ Scope : api
```

```
Commits :
- feat(api): add client_id to events
- feat(widget): add client filter
- fix(widget): fix date picker

→ Type : feat (2 feat vs 1 fix)
→ Scope : widget (2 widget vs 1 api) OU api,widget si équivalent
```

### 4. Générer le Titre (EN)

**Format** : `type(scope): subject`

**Règles de génération** :
- Impératif présent (add, update, fix, refactor, remove)
- Pas de majuscule en début (sauf noms propres)
- Pas de point final
- Max 72 caractères
- **Anglais**

**Stratégie de génération** :
1. Si **un seul commit** : Utiliser le message du commit
2. Si **plusieurs commits même sujet** : Généraliser le sujet
3. Si **commits variés** : Résumer la feature/fix principale

**Exemples** :

**Cas 1 : Un seul commit**
```
Commit : feat(api): add client tracking to stat events

→ Titre PR : feat(api): add client tracking to stat events
```

**Cas 2 : Plusieurs commits même feature**
```
Commits :
- feat(api): add client_id column to stat_event
- feat(api): add client tracking service
- feat(api): update event controller
- test(api): add client tracking tests

→ Titre PR : feat(api): add client tracking support
```

**Cas 3 : Feature multi-domaines**
```
Commits :
- feat(api): add client_id to events endpoint
- feat(widget): add client filter to dashboard

→ Titre PR : feat(api,widget): add client tracking
```

**Cas 4 : Fix avec refactor**
```
Commits :
- fix(widget): fix date picker validation
- refactor(widget): simplify date utils

→ Titre PR : fix(widget): correct date picker validation
```

### 5. Valider le Titre

```bash
# Tester avec pr-title-lint (simulation)
echo "feat(api): add client tracking" | npx @action-semantic/pull-request validate \
  --types feat,refactor,fix,chore,test \
  --scopes app,api,analytics,widget,jobs,ci
```

**Si validation échoue** :
```
❌ Titre invalide selon pr-title-lint
→ Erreur : [détails]
→ Titre : feat(api): add client tracking
→ Suggestion : [titre corrigé]
```

Proposer le titre corrigé et redemander validation.

### 6. Générer le Corps (FR)

**Charger le template** :
```markdown
## Description

[Description de la PR]

## Liens utiles

- 📝 Ticket Notion : [Lien vers le ticket](https://www.notion.so/...)

## Type de changement

- [x] Nouvelle fonctionnalité
- [ ] Correction de bug
- [ ] Amélioration de performance
- [ ] Refactoring
- [ ] Documentation

## Checklist

- [ ] Code testé localement
- [ ] Tests unitaires ajoutés/modifiés si nécessaire
- [ ] Respect des standards de code (ESLint)
- [ ] Migration de données nécessaire

## Notes complémentaires

[Notes pour le reviewer]
```

**Remplir automatiquement** :

#### 7.1 Description

Générer une description en français basée sur les commits :
```
Commits analysés :
- feat(api): add client_id to events
- feat(api): add client tracking service
- test(api): add tests

→ Description :
Ajoute le support du tracking client dans les événements stat.

**Changements** :
- Ajout colonne `client_id` dans `stat_event`
- Nouveau service `ClientTrackingService`
- Tests unitaires et d'intégration
```

#### 7.2 Type de changement

Cocher automatiquement basé sur le type :
- `feat` → `[x] Nouvelle fonctionnalité`
- `fix` → `[x] Correction de bug`
- `refactor` → `[x] Refactoring`
- `chore` → Aucun (ou Documentation si config/deps)
- `test` → Aucun

#### 7.3 Checklist

Cocher automatiquement selon contexte :

**`[x] Code testé localement`** : Toujours coché

**`[x] Tests unitaires ajoutés/modifiés`** : Si fichiers `*.test.ts`, `*.spec.ts` modifiés

**`[x] Respect des standards de code (ESLint)`** : Si `/lint` a été exécuté avec succès

**`[x] Migration de données nécessaire`** : Si migrations Prisma/dbmate détectées
```bash
git diff staging...HEAD --name-only | grep -E '(prisma/migrations|analytics/migrations)'
```

#### 7.4 Notes complémentaires

Ajouter automatiquement :
- **Migrations DB** : Lister les migrations avec noms
- **Breaking changes** : Extraire depuis commits (BREAKING CHANGE:)
- **Dépendances** : Si `package.json` modifié, lister nouvelles deps
- **Fichiers volumineux** : Si gros diffs (> 500 lignes)

**Exemple de notes auto-générées** :
```markdown
## Notes complémentaires

**Migrations DB** :
- `20260127_add_client_id_to_stat_event` : Ajout colonne client_id

**Dépendances** :
- Ajout : `@prisma/client@5.8.0`

**Points d'attention** :
- Le champ `client_id` est nullable pour compatibilité avec événements existants
- Tests E2E à exécuter manuellement après déploiement
```

### 7. Pousser la Branche (si nécessaire)

```bash
# Vérifier si la branche est poussée
git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null
```

**Si branche non poussée** :
```bash
# Pousser la branche avec tracking
git push -u origin $(git branch --show-current)
```

**Message** :
```
→ Branche non poussée sur origin
→ Push en cours : git push -u origin valentin/feat/add-client-tracking
✓ Branche poussée
```

### 8. Créer la PR

```bash
# Créer la PR avec gh CLI
gh pr create \
  --base staging \
  --title "feat(api): add client tracking support" \
  --body "$(cat <<'EOF'
## Description

Ajoute le support du tracking client dans les événements stat.

**Changements** :
- Ajout colonne `client_id` dans `stat_event`
- Nouveau service `ClientTrackingService`
- Tests unitaires et d'intégration

## Liens utiles

- 📝 Ticket Notion : [Lien vers le ticket](https://www.notion.so/...)

## Type de changement

- [x] Nouvelle fonctionnalité
- [ ] Correction de bug
- [ ] Amélioration de performance
- [ ] Refactoring
- [ ] Documentation

## Checklist

- [x] Code testé localement
- [x] Tests unitaires ajoutés/modifiés si nécessaire
- [x] Respect des standards de code (ESLint)
- [x] Migration de données nécessaire

## Notes complémentaires

**Migrations DB** :
- `20260127_add_client_id_to_stat_event` : Ajout colonne client_id

**Points d'attention** :
- Le champ `client_id` est nullable pour compatibilité avec événements existants
EOF
)"
```

### 9. Confirmation

```bash
# Récupérer l'URL de la PR
PR_URL=$(gh pr view --json url -q .url)
```

**Message de succès** :
```
✅ Pull Request créée avec succès

→ Titre : feat(api): add client tracking support
→ Base : staging
→ URL : https://github.com/betagouv/api-engagement/pull/123

→ Checks CI en cours :
  - lint.yml (ESLint API)
  - tests.yml (Prisma migration + tests API)
  - build-check.yml (TypeScript API)
  - pr-title-lint.yml (Validation titre)

→ Prochaines étapes :
  1. Attendre les checks CI (≈ 5-10 min)
  2. Demander une review (@team)
  3. Merger la PR après approval
```

## Exemples Complets

### Exemple 1 : Feature API Simple

```
Branche : valentin/feat/add-client-tracking
Commits : 1
- feat(api): add client tracking to stat events

→ Titre : feat(api): add client tracking to stat events
→ Scope : api
→ Type : Nouvelle fonctionnalité

✅ PR créée : https://github.com/.../pull/123
```

### Exemple 2 : Feature Multi-Domaines

```
Branche : marie/feat/client-filter
Commits : 3
- feat(api): add client_id to events endpoint
- feat(widget): add client filter component
- test(widget): add filter tests

→ Titre : feat(api,widget): add client filtering
→ Scopes : api, widget
→ Type : Nouvelle fonctionnalité

✅ PR créée : https://github.com/.../pull/124
```

### Exemple 3 : Fix avec Refactor

```
Branche : thomas/fix/date-validation
Commits : 2
- fix(widget): fix date picker validation
- refactor(widget): simplify date utils

→ Titre : fix(widget): correct date picker validation
→ Scope : widget
→ Type : Correction de bug

✅ PR créée : https://github.com/.../pull/125
```

### Exemple 4 : Chore CI

```
Branche : valentin/chore/update-deps
Commits : 1
- chore(ci): update dependencies

→ Titre : chore(ci): update dependencies
→ Scope : ci
→ Type : Documentation (ou aucune case cochée)

✅ PR créée : https://github.com/.../pull/126
```

## Gestion des Cas Spéciaux

### PR avec Migrations DB

Détecter et inclure dans les notes :
```markdown
## Notes complémentaires

**Migrations DB** :
- Prisma : `20260127_add_client_id_to_stat_event`
- dbmate : `20260127_create_analytics_export_table`

**Actions post-merge** :
- Exécuter migrations en staging : `npm run prisma:migrate:core`
- Vérifier les données : `SELECT COUNT(*) FROM stat_event WHERE client_id IS NOT NULL`
```

### PR avec Breaking Changes

Extraire depuis commits et mettre en avant :
```markdown
## Description

⚠️ **BREAKING CHANGE** : Suppression des endpoints `/analytics/*` (deprecated)

Migrer vers les nouveaux endpoints `/stats/*`.

...
```

### PR avec Dépendances Majeures

Si `package.json` modifié avec versions majeures :
```markdown
## Notes complémentaires

**Dépendances mises à jour** :
- `@prisma/client` : `5.7.0` → `5.8.0` (minor)
- `express` : `4.18.0` → `5.0.0` (major ⚠️)

**Breaking changes potentiels** :
- Express 5 : [Lien vers migration guide](https://expressjs.com/en/guide/migrating-5.html)
```

### PR Draft (Optionnel)

Supporter création de draft PR :
```bash
/pr --draft
```

```bash
gh pr create --draft \
  --base staging \
  --title "feat(api): add client tracking (WIP)" \
  --body "..."
```

## Configuration

Permissions requises dans `.claude/settings.local.json` :
- `Bash(git branch:*)`
- `Bash(git status:*)`
- `Bash(git diff:*)`
- `Bash(git log:*)`
- `Bash(git push:*)`
- `Bash(gh pr create:*)`
- `Bash(gh pr view:*)`
- `Read(*)`

## Intégration

Ce skill est le point culminant du workflow :
1. `/branch` → Créer branche
2. [Modifications + commits via `/commit`]
3. **`/pr`** → Créer Pull Request

## Notes

- **Toujours partir de `staging`** (branche de base par défaut)
- Titre EN, Corps FR (convention du projet)
- Auto-remplir le template pour faciliter la review
- Pousser la branche si nécessaire (évite erreurs)
- Détecter contexte (migrations, breaking changes, deps) pour notes
- Compatible avec `gh` CLI (GitHub officiel)
