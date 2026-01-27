# Skill: Safety Check

Valide la sécurité des fichiers avant commit (secrets, .env, schemas protégés, fichiers volumineux).

## Usage

```bash
/safety-check
```


## Règles de Sécurité

- Ne jamais ajouter de secrets en dur (tokens, credentials, DSN, clés)
- Ne pas committer de `.env` / `.env.*`
- Éviter de logguer des données personnelles
- Schéma analytics Prisma : **READ-ONLY** (deprecated)

*(Voir AGENTS.md pour détails)*

## Workflow

### 1. Détecter les Fichiers Staged

```bash
git status --porcelain
```

Parser la sortie pour obtenir la liste des fichiers :
- `A` : Fichier ajouté
- `M` : Fichier modifié
- `D` : Fichier supprimé
- `??` : Fichier non tracké

### 2. Vérifications de Sécurité

#### 3.1 Bloquer Fichiers `.env`

```bash
git diff --cached --name-only | grep -E '\.env(\.|$)'
```

Si match trouvé :
```
❌ ERREUR: Fichiers .env détectés en staging
→ Fichiers : .env, api/.env.local
→ AGENTS.md: Ne pas committer de .env / .env.*
→ Action : Retirer ces fichiers du staging (git reset HEAD <file>)
```

**Exit code 1** (bloque le commit)

#### 3.2 Détecter Secrets Hardcodés

Patterns à rechercher dans les fichiers staged :
- `password\s*=\s*['"][^'"]+['"]`
- `api[_-]?key\s*=\s*['"][^'"]+['"]`
- `token\s*=\s*['"][^'"]+['"]`
- `mongodb\+srv://[^'"]+`
- `postgres://[^'"]+`
- `Bearer\s+[A-Za-z0-9\-._~+/]+=*`

```bash
# Pour chaque fichier staged
git diff --cached -U0 <file> | grep -E '(password|api[_-]?key|token|mongodb\+srv|postgres://|Bearer\s+)'
```

Si match trouvé :
```
⚠️  WARNING: Potentiel secret hardcodé détecté
→ Fichier : api/src/config/database.ts:42
→ Pattern : mongodb+srv://...
→ AGENTS.md: Ne jamais ajouter de secrets en dur
→ Action : Remplacer par variable d'environnement (process.env.DATABASE_URL)
```

**Demander confirmation utilisateur** avant de continuer.

#### 3.3 Bloquer Modifications du Schéma Analytics

```bash
git diff --cached --name-only | grep 'api/prisma/analytics/schema.analytics.prisma'
```

Si match trouvé :
```
❌ ERREUR: Modification du schéma analytics interdite
→ Fichier : api/prisma/analytics/schema.analytics.prisma
→ api/AGENTS.md: Le schéma analytics est deprecated (lecture seule)
→ Action : Utiliser dbmate pour migrations analytics (analytics/migrations/)
```

**Exit code 1** (bloque le commit)

#### 3.4 Vérifier Taille des Fichiers

```bash
# Pour chaque fichier staged
git diff --cached --stat <file> | awk '{print $NF}'
```

Extraire la taille. Si > 1MB :
```
⚠️  WARNING: Fichier volumineux détecté
→ Fichier : app/public/video.mp4 (12.5 MB)
→ Action : Considérer Git LFS ou hébergement externe
```

**Demander confirmation utilisateur** avant de continuer.

### 3. Résumé

Si **aucune erreur bloquante** :
```
✅ Safety checks passed
→ Fichiers vérifiés : 12
→ Warnings : 0
→ Erreurs : 0
```

**Exit code 0**

Si **erreurs bloquantes** :
```
❌ Safety checks failed
→ Fichiers vérifiés : 12
→ Warnings : 1
→ Erreurs : 2
→ Action : Corriger les erreurs avant de committer
```

**Exit code 1**

## Intégration avec `/commit`

Le skill `/commit` doit **toujours exécuter `/safety-check`** avant de créer le commit.

```markdown
## Workflow /commit
1. Détecter changements (git status, git diff)
2. **Exécuter /safety-check** ← CRITIQUE
3. Si safety-check échoue → STOP (ne pas créer le commit)
4. Analyser scope et type
5. Générer message
6. Valider avec commitlint
7. Créer commit
```

## Configuration

Permissions requises dans `.claude/settings.local.json` :
- `Bash(git status:*)`
- `Bash(git diff:*)`
- `Bash(grep:*)`
- `Read(*)`

## Notes

- Ce skill est **non-interactif** pour les erreurs bloquantes (exit immédiat)
- Pour les warnings, demander confirmation utilisateur
- Les patterns de secrets peuvent être étendus selon les besoins du projet
- Compatible avec hooks Git existants (Husky)
