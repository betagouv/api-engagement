---
description: "Create formatted branches"
name: "branch"
---

# Skill: Create Branch

Crée une branche formatée selon les conventions du projet.

## Usage

```bash
/branch
```

## Conventions du Projet

**Format de branche** : `[nom]/[type]/[sujet]`

- Types autorisés : `feat`, `refactor`, `fix`, `chore`, `test`
- Branche parente : `staging`

_(Voir AGENTS.md pour détails)_

## Workflow

### 1. Vérifier l'État Actuel

```bash
# Vérifier la branche actuelle
git branch --show-current

# Vérifier s'il y a des changements non commités
git status --porcelain
```

**Si changements non commités** :

```
⚠️  WARNING: Changements non commités détectés
→ Fichiers modifiés : 3
→ Action suggérée : Commiter ou stasher avant de créer une branche
→ Voulez-vous continuer quand même ? (y/n)
```

**Si branche actuelle != staging** :

```
⚠️  WARNING: Vous n'êtes pas sur staging
→ Branche actuelle : main
→ AGENTS.md: Les branches partent de staging
→ Voulez-vous basculer sur staging ? (y/n)
```

### 2. Basculer sur `staging` (si nécessaire)

```bash
# Passer sur staging
git checkout staging

# Mettre à jour staging (optionnel)
git pull origin staging
```

**Demander confirmation** pour le pull :

```
→ Voulez-vous mettre à jour staging depuis origin ? (y/n)
```

### 3. Demander les Informations de Branche

**Prompt interactif** pour collecter :

#### 4.1 Nom (développeur)

```
→ Nom du développeur (ex: valentin) : _____
```

**Validation** :

- Pas d'espaces
- Minuscules uniquement
- Caractères alphanumériques + tirets

#### 4.2 Type

```
→ Type de branche :
  1. feat      - Nouvelle fonctionnalité
  2. refactor  - Refactorisation de code
  3. fix       - Correction de bug
  4. chore     - Tâche de maintenance
  5. test      - Ajout/modification de tests

Choix (1-5) : _____
```

Map vers :

- `1` → `feat`
- `2` → `refactor`
- `3` → `fix`
- `4` → `chore`
- `5` → `test`

**Validation** : Type doit être dans la liste autorisée.

#### 4.3 Sujet

```
→ Sujet de la branche (ex: add-client-tracking) : _____
```

**Validation** :

- Pas d'espaces (remplacer par `-`)
- Minuscules uniquement
- Caractères alphanumériques + tirets
- Pas de caractères spéciaux (/, \, :, etc.)
- Max 50 caractères

**Auto-conversion** :

- `Add Client Tracking` → `add-client-tracking`
- `Fix: Date Picker Bug` → `fix-date-picker-bug`

### 4. Construire le Nom de Branche

**Format final** : `[nom]/[type]/[sujet]`

Exemple :

```
Nom : valentin
Type : feat
Sujet : add-client-tracking

→ Branche : valentin/feat/add-client-tracking
```

### 5. Vérifier l'Existence

```bash
# Vérifier si la branche existe déjà (locale)
git branch --list "valentin/feat/add-client-tracking"

# Vérifier si la branche existe déjà (remote)
git ls-remote --heads origin "valentin/feat/add-client-tracking"
```

**Si branche existe** :

```
❌ ERREUR: Branche déjà existante
→ Branche : valentin/feat/add-client-tracking
→ Local : oui
→ Remote : oui

→ Actions suggérées :
  1. Utiliser un autre nom/sujet
  2. Basculer sur la branche existante : git checkout valentin/feat/add-client-tracking
  3. Supprimer la branche existante (si obsolète) : git branch -D valentin/feat/add-client-tracking
```

**STOP** : Ne pas créer la branche.

### 6. Créer la Branche

```bash
# Créer et basculer sur la nouvelle branche
git checkout -b valentin/feat/add-client-tracking
```

### 7. Confirmation

```bash
# Afficher la branche actuelle
git branch --show-current

# Afficher le dernier commit (hérité de staging)
git log -1 --oneline
```

**Message de succès** :

```
✅ Branche créée avec succès

→ Branche : valentin/feat/add-client-tracking
→ Parent : staging
→ Dernier commit : 9d1ba65 - chore(api): add Claude workflows

→ Prochaines étapes suggérées :
  1. Faire vos modifications
  2. Commiter : /commit
  3. Créer une PR : /pr
```

## Exemples

### Exemple 1 : Feature API

```
→ Nom : valentin
→ Type : feat
→ Sujet : add-event-client-id

✅ Branche créée : valentin/feat/add-event-client-id
```

### Exemple 2 : Fix Widget

```
→ Nom : marie
→ Type : fix
→ Sujet : date-picker-validation

✅ Branche créée : marie/fix/date-picker-validation
```

### Exemple 3 : Refactor Analytics

```
→ Nom : thomas
→ Type : refactor
→ Sujet : simplify-export-job

✅ Branche créée : thomas/refactor/simplify-export-job
```

### Exemple 4 : Chore CI

```
→ Nom : valentin
→ Type : chore
→ Sujet : update-dependencies

✅ Branche créée : valentin/chore/update-dependencies
```

### Exemple 5 : Test Widget

```
→ Nom : sophie
→ Type : test
→ Sujet : add-e2e-filters

✅ Branche créée : sophie/test/add-e2e-filters
```

## Gestion des Cas Spéciaux

### Nom avec Espaces/Accents

Entrée utilisateur : `Valéntín Müller`

Auto-conversion :

- Supprimer accents : `Valentin Muller`
- Minuscules : `valentin muller`
- Remplacer espaces : `valentin-muller`

Résultat : `valentin-muller/feat/...`

### Sujet avec Caractères Spéciaux

Entrée utilisateur : `Add: Client Tracking (V2)`

Auto-conversion :

- Supprimer ponctuation : `Add Client Tracking V2`
- Minuscules : `add client tracking v2`
- Remplacer espaces : `add-client-tracking-v2`

Résultat : `.../add-client-tracking-v2`

### Sujet Trop Long

Entrée utilisateur (> 50 chars) : `add-comprehensive-client-tracking-with-analytics-support`

**Warning** :

```
⚠️  WARNING: Sujet trop long (56 caractères, max 50)
→ Sujet : add-comprehensive-client-tracking-with-analytics-support
→ Suggestion : add-client-tracking-with-analytics
→ Utiliser la suggestion ? (y/n)
```

### Mode Non-Interactif (Avancé)

Pour automatisation, supporter les arguments :

```bash
/branch --name valentin --type feat --subject add-client-tracking
```

**Skip les prompts** et créer directement la branche.

## Configuration

Permissions requises dans `.claude/settings.local.json` :

- `Bash(git branch:*)`
- `Bash(git checkout:*)`
- `Bash(git status:*)`
- `Bash(git log:*)`
- `Read(*)`

## Intégration

Ce skill peut être utilisé :

- **Standalone** : Développeur crée une branche manuellement
- **Avec /commit** : Workflow complet (branch → commit → PR)
- **Depuis /pr** : Si pas de branche feature, suggérer de créer via `/branch`

## Notes

- **Toujours partir de `staging`** (convention du projet)
- Valider le format avant création (évite les erreurs)
- Proposer auto-conversion pour faciliter l'UX
- Gérer les conflits de noms (branches existantes)
- Compatible avec les conventions Git Flow (feature branches)
