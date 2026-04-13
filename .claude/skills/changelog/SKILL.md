---
description: "Generate deployment summary"
name: "changelog"
version: "1.0.0"
---

# Skill: Release Notes

Génère un résumé des changements entre staging (pré-prod) et main (prod) pour communication.

## Usage

```bash
/changelog                    # Affiche le résumé staging → main
/changelog --save             # Sauvegarde dans release-notes.md
/changelog --from <commit>    # Affiche le résumé depuis un commit → dernier de staging
/changelog --from <commit> --save
/changelog --slack            # Affiche un rendu optimisé pour Slack
/changelog --slack --compact   # Version Slack compacte
```

## Objectif

Ce skill génère un **résumé de déploiement** accessible, regroupé par application, pour communiquer les changements aux utilisateurs non techniques.

**Important** : Ce skill ne modifie **PAS** le fichier `CHANGELOG.md` à la racine, qui est géré automatiquement par le workflow GitHub Actions `.github/workflows/changelog.yml`.

## Workflow

### 1. Comparer staging et main (ou depuis un commit)

```bash
# Définir la plage de commits
RANGE="main..staging"
# En mode --from, utiliser :
# RANGE="<commit>..staging"

# Lister les commits sur la plage
git log "$RANGE" --oneline --no-merges

# Compter les commits
COMMIT_COUNT=$(git log "$RANGE" --oneline --no-merges | wc -l | xargs)
```

**Si aucun commit** :

```
✅ Aucune différence entre staging et main

→ staging et main sont synchronisés
→ Pas de déploiement en attente
```

**STOP**

### 1.b Vérifier la validité du commit (si `--from`)

```bash
# Vérifier que le commit existe
git cat-file -e <commit>^{commit}

# Vérifier que le commit est bien ancêtre de staging
git merge-base --is-ancestor <commit> staging
```

**Si le commit est invalide ou hors de l'historique de `staging`** :

```
❌ Commit invalide ou absent de l'historique de staging

→ Vérifier l'identifiant fourni
→ Utiliser un commit présent sur la branche staging
```

**STOP**

### 2. Parser les Commits par Domaine

```bash
# Extraire commits par domaine
git log "$RANGE" --pretty=format:"%s" --no-merges
```

**Grouper par scope** :

- `feat(api):` / `fix(api):` → **API**
- `feat(app):` / `fix(app):` → **App (Back-office)**
- `feat(widget):` / `fix(widget):` → **Widget**
- `feat(analytics):` / `fix(analytics):` → **Analytics**
- `feat(jobs):` / `fix(jobs):` → **Jobs**
- `chore(ci):` → **Infrastructure**

**Ignorer** :

- `chore(deps):` (dépendances)
- `test:` (tests)
- `refactor:` (refactoring interne)

### 3. Traduire en Langage Accessible

**Mapping type → langage utilisateur** :

| Type    | Langage technique | Langage accessible        |
| ------- | ----------------- | ------------------------- |
| `feat`  | Feature           | ✨ Nouveauté              |
| `fix`   | Bug fix           | 🐛 Correction             |
| `chore` | Maintenance       | 🔧 Amélioration technique |

**Exemples de traduction** :

```
Commit technique :
feat(api): add client tracking to stat events

→ Traduction accessible :
✨ API : Ajout du suivi par client pour les événements statistiques
```

```
Commit technique :
fix(widget): correct date picker validation

→ Traduction accessible :
🐛 Widget : Correction de la validation du sélecteur de dates
```

```
Commit technique :
feat(app): add organization filter to missions page

→ Traduction accessible :
✨ Back-office : Nouveau filtre par organisation sur la page missions
```

### 4. Générer le Résumé

**Format markdown** :

```markdown
# 🚀 Résumé de Déploiement

**Période** : [Date dernière release main] → Aujourd'hui
**Environnement** : staging → production
**Commits** : 15 changements

---

## 📱 Widget (Widgets Publics)

### ✨ Nouveautés

- Nouveau filtre par organisation sur le widget bénévolat
- Ajout de la pagination pour afficher plus de missions

### 🐛 Corrections

- Correction de la validation du sélecteur de dates
- Amélioration de l'affichage mobile sur petits écrans

---

## 🖥️ Back-office (Interface Admin)

### ✨ Nouveautés

- Ajout d'un tableau de bord pour les statistiques par client
- Export CSV des missions avec filtres avancés

### 🐛 Corrections

- Correction du tri par date de création

---

## 🔌 API

### ✨ Nouveautés

- Ajout du suivi par client pour les événements statistiques
- Nouveau endpoint `/api/v2/stats/by-client`

### 🐛 Corrections

- Correction de la validation des paramètres de date

---

## 📊 Analytics

### ✨ Nouveautés

- Nouveaux modèles dbt pour le tracking des missions actives
- Ajout d'indicateurs de performance par organisation

---

## 🔧 Infrastructure

- Mise à jour des dépendances de sécurité
- Amélioration des performances des tests d'intégration

---

**Note** : Ce résumé est généré automatiquement à partir des commits entre `main` et `staging` (ou entre `<commit>` et `staging` en mode `--from`).
```

**Format Slack (texte)** :

```
🚀 Résumé de déploiement (staging → prod)
Période : 12/02 → 18/02 · 15 changements

📱 Widget
✨ Nouveautés
- Nouveau filtre par organisation
🐛 Corrections
- Correction de la validation des dates

🖥️ Back-office
✨ Nouveautés
- Export CSV avec filtres avancés
```

**Format Slack compact** :

```
🚀 Résumé de déploiement (staging → prod)
Période : 12/02 → 18/02 · 15 changements

📱 Widget : ✨ 2 · 🐛 1
🖥️ Back-office : ✨ 1
🔌 API : ✨ 3 · 🐛 2
📊 Analytics : ✨ 2
🔧 Infrastructure : 🔧 1
```

### 5. Afficher le Résumé

**Mode console** :

```
→ Génération du résumé de déploiement...

✅ Résumé généré (15 commits)

[Affichage du markdown ci-dessus]

→ Applications impactées :
  - Widget : 4 changements (2 nouveautés, 2 corrections)
  - Back-office : 3 changements (2 nouveautés, 1 correction)
  - API : 5 changements (3 nouveautés, 2 corrections)
  - Analytics : 2 changements (2 nouveautés)
  - Infrastructure : 1 changement

→ Actions :
  1. Copier ce résumé pour communication (Slack, email, etc.)
  2. Sauvegarder : /changelog --save
  3. Déployer après validation : git checkout main && git merge staging
```

**Mode Slack** :

```
→ Génération du résumé (format Slack)...

✅ Résumé Slack généré (15 commits)

[Affichage du texte Slack ci-dessus]

→ Copier/coller directement dans Slack
```

### 6. Sauvegarder (Option `--save`)

Si flag `--save` activé :

```bash
# Sauvegarder dans un fichier temporaire
cat > release-notes.md << 'EOF'
[Contenu du résumé]
EOF
```

**Afficher** :

```
✅ Résumé sauvegardé : release-notes.md

→ Fichier : release-notes.md
→ Usage :
  - Partager sur Slack/email
  - Ajouter aux notes de release GitHub
  - Archiver dans documentation

→ Le fichier release-notes.md n'est PAS versionné (ajouté au .gitignore)
```

## Exemples

### Exemple 1 : Afficher le Résumé

```bash
/changelog
```

**Sortie** :

```
→ Comparaison main...staging

→ Commits trouvés : 15
  - Widget : 4
  - Back-office : 3
  - API : 5
  - Analytics : 2
  - Infrastructure : 1

[Affichage du résumé markdown]

→ Copier le résumé ci-dessus pour communication
```

### Exemple 2 : Sauvegarder le Résumé

```bash
/changelog --save
```

**Sortie** :

```
→ Génération du résumé...

✅ Résumé sauvegardé : release-notes.md

→ Contenu : 15 commits, 5 applications
→ Fichier : release-notes.md (non versionné)
```

### Exemple 3 : Résumé Depuis un Commit

```bash
/changelog --from a1b2c3d
```

**Sortie** :

```
→ Comparaison a1b2c3d...staging

→ Commits trouvés : 6
  - Widget : 2
  - Back-office : 1
  - API : 2
  - Infrastructure : 1

[Affichage du résumé markdown]

→ Copier le résumé ci-dessus pour communication
```

### Exemple 4 : Format Slack

```bash
/changelog --slack
```

**Sortie** :

```
→ Génération du résumé (format Slack)...

✅ Résumé Slack généré (15 commits)

[Affichage du texte Slack]
```

### Exemple 5 : Aucun Changement

```bash
/changelog
```

**Sortie** :

```
✅ Aucune différence entre staging et main

→ staging et main sont synchronisés
→ Pas de déploiement en attente
```

## Ton et Style

### Principes

**Ton** :

- Neutre et professionnel
- Enjoué mais pas infantilisant
- Pédagogue (expliquer sans jargon)

**Style** :

- Phrases courtes et claires
- Vocabulaire accessible (éviter jargon technique)
- Emojis pour clarté visuelle (modération)
- Regroupement logique par application

### Guidelines de Traduction

**❌ À éviter** :

```
- "Implémentation du tracking client via événements stat"
- "Refactorisation du repository Prisma"
- "Fix du bug de validation Zod"
```

**✅ Bon** :

```
- "Ajout du suivi par client dans les statistiques"
- "Amélioration technique de la base de données"
- "Correction de la validation des formulaires"
```

**Niveaux de détail** :

- **Widget / Back-office** : Focus sur l'expérience utilisateur
- **API** : Rester technique mais compréhensible
- **Analytics** : Expliquer l'impact métier
- **Infrastructure** : Simplifier au maximum

### Exemples de Traduction

#### Widget

```
Technique : feat(widget): add client filter to dashboard
Accessible : Nouveau filtre par client sur le tableau de bord

Technique : fix(widget): correct responsive layout on mobile
Accessible : Correction de l'affichage mobile pour une meilleure lisibilité
```

#### Back-office

```
Technique : feat(app): add CSV export with advanced filters
Accessible : Export CSV des données avec filtres personnalisables

Technique : fix(app): fix date sorting in missions table
Accessible : Correction du tri par date dans la liste des missions
```

#### API

```
Technique : feat(api): add /v2/stats/by-client endpoint
Accessible : Nouveau point d'accès API pour les statistiques par client

Technique : fix(api): validate date parameters in queries
Accessible : Amélioration de la validation des dates dans les requêtes
```

#### Analytics

```
Technique : feat(analytics): add active missions dbt model
Accessible : Nouveaux indicateurs pour suivre les missions en cours

Technique : feat(analytics): create organization performance metrics
Accessible : Calcul automatique des performances par organisation
```

## Workflow GitHub Actions

**Important** : Le fichier `CHANGELOG.md` à la racine est géré par `.github/workflows/changelog.yml` :

- Exécution : Chaque lundi à 08:00 (ou manuel)
- Outil : git-cliff
- Format : Conventional Commits technique
- Branche : main
- Public : Développeurs

**Ce skill est complémentaire** :

- Exécution : Manuelle avant déploiement
- Outil : Parsing custom
- Format : Résumé accessible
- Comparaison : staging → main
- Public : Product owners, utilisateurs

## Configuration

Permissions requises dans `.claude/settings.local.json` :

- `Bash(git log:*)`
- `Bash(git diff:*)`
- `Read(*)`
- `Write(release-notes.md)` (optionnel)

## Intégration

Ce skill fait partie du workflow de release :

1. **Développement** : Commits sur branches features
2. **Merge staging** : PR vers staging
3. **Tests pré-prod** : Validation sur staging
4. **`/changelog`** : Générer résumé de déploiement
5. **Communication** : Partager le résumé (Slack, email)
6. **Déploiement** : Merge staging → main
7. **GitHub Actions** : Mise à jour automatique de CHANGELOG.md

## Notes

- **Non destructif** : N'affecte pas CHANGELOG.md
- **Communication** : Focus sur l'expérience utilisateur
- **Accessible** : Vocabulaire compréhensible par tous
- **Regroupement** : Par application (widget, app, api, analytics)
- **Flexibilité** : Affichage console ou sauvegarde fichier
- **Complémentaire** : Coexiste avec workflow GitHub Actions
