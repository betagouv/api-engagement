---
description: "Run dbt workflow"
---

# Skill: Analytics dbt Workflow

Exécute les commandes dbt (compile, test, run) via le wrapper `dbt-env.sh`.

## Usage

```bash
/analytics/dbt --compile    # Compiler les modèles
/analytics/dbt --test       # Tester les modèles
/analytics/dbt --run        # Exécuter les modèles (matérialisation)
/analytics/dbt --docs       # Générer la documentation
```


## Configuration dbt

- Wrapper : `./scripts/dbt-env.sh` (charge DATABASE_URL_ANALYTICS)
- Modèles : `analytics/dbt/analytics/models/`
- Lint : SQLFluff en CI

*(Voir analytics/AGENTS.md pour détails)*

## Workflow

### 1. Vérifier les Prérequis

#### 2.1 Working Directory

```bash
pwd
```

**Si pas dans `analytics/`** :
```
❌ ERREUR : Vous devez être dans le répertoire analytics/

→ Working directory : [current_dir]
→ Action : cd analytics && /analytics/dbt
```

**EXIT CODE 1**

#### 2.2 Vérifier DATABASE_URL_ANALYTICS

```bash
test -n "$DATABASE_URL_ANALYTICS" || echo "❌ DATABASE_URL_ANALYTICS manquant"
```

**Si manquant** :
```
❌ ERREUR : Variable DATABASE_URL_ANALYTICS manquante

→ Cette variable est requise pour dbt
→ Action : Configurer .env ou .env.local avec DATABASE_URL_ANALYTICS
→ Format : postgresql://user:password@host:port/database
```

**EXIT CODE 1**

#### 2.3 Vérifier Script dbt-env.sh

```bash
test -x "analytics/scripts/dbt-env.sh" || echo "❌ dbt-env.sh manquant ou non exécutable"
```

**Si manquant** :
```
❌ ERREUR : Script dbt-env.sh introuvable

→ Chemin attendu : analytics/scripts/dbt-env.sh
→ Ce script wrapper est requis pour exécuter dbt
```

**EXIT CODE 1**

#### 2.4 Vérifier dbt Installé

```bash
# Vérifier si dbt disponible
command -v dbt >/dev/null 2>&1 || \
  test -d "analytics/dbt/.venv" || \
  echo "⚠️  dbt non installé"
```

**Si manquant** :
```
⚠️  WARNING : dbt non installé

→ Installation recommandée :
  cd analytics/dbt
  python -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt

→ Ou installer globalement : pip install dbt-postgres

→ Le script dbt-env.sh utilisera le dbt disponible
```

Continuer quand même (le wrapper gère l'environnement).

### 2. Mode Sélection

#### Mode 1 : Compiler les Modèles

```bash
/analytics/dbt --compile
```

Compile les modèles dbt (SQL → SQL compilé, vérifications).

#### Mode 2 : Tester les Modèles

```bash
/analytics/dbt --test
```

Exécute les tests dbt (data tests, schema tests).

#### Mode 3 : Exécuter les Modèles

```bash
/analytics/dbt --run
```

Matérialise les modèles dbt (crée tables/vues).

#### Mode 4 : Générer Documentation

```bash
/analytics/dbt --docs
```

Génère la documentation dbt (HTML).

### 3. Exécuter dbt Compile

```bash
# Compiler les modèles
cd analytics && ./scripts/dbt-env.sh compile
```

**Afficher la progression** :
```
→ Compilation des modèles dbt...

→ dbt-env.sh : Chargement de DATABASE_URL_ANALYTICS
→ dbt compile : Lancement

  Compiling model analytics.missions_active
  Compiling model analytics.organizations_active
  Compiling model analytics.stat_events_enriched

✅ dbt compile réussi

→ Modèles compilés : 12
→ Durée : 3.2s
→ Fichiers : analytics/dbt/target/compiled/analytics/models/
```

**Si erreur** :
```
❌ dbt compile échoué

→ Erreur : Compilation failed for model 'missions_active'

→ Détails :
  File: models/missions/active.sql:45
  Error: column "client_id" does not exist

  SQL:
    SELECT client_id, COUNT(*) FROM analytics_raw.missions

→ Actions :
  1. Vérifier le modèle SQL : analytics/dbt/models/missions/active.sql:45
  2. Vérifier que la migration analytics est appliquée : /analytics/migrate
  3. Corriger le SQL
  4. Re-compiler : /analytics/dbt --compile
```

**EXIT CODE 1**

### 4. Exécuter dbt Test

```bash
# Tester les modèles
cd analytics && ./scripts/dbt-env.sh test
```

**Afficher la progression** :
```
→ Exécution des tests dbt...

→ dbt test : Lancement

  Testing missions_active
    ✓ not_null_missions_active_id
    ✓ unique_missions_active_id
    ✓ relationships_missions_active_organization_id

  Testing organizations_active
    ✓ not_null_organizations_active_id
    ✓ unique_organizations_active_id

✅ dbt test réussi

→ Tests exécutés : 12
→ Tests passed : 12
→ Tests failed : 0
→ Durée : 8.5s
```

**Si erreur** :
```
❌ dbt test échoué

→ Tests failed : 2

→ Détails :

  **missions_active**
    ✗ not_null_missions_active_client_id
      Got 42 rows with null client_id (expected 0)

  **stat_events_enriched**
    ✗ relationships_stat_events_enriched_client_id
      Got 15 rows with invalid client_id references

→ Actions :
  1. Vérifier les données source : analytics_raw.missions
  2. Vérifier les transformations dbt
  3. Corriger les modèles ou les tests
  4. Re-tester : /analytics/dbt --test
```

**EXIT CODE 1**

### 5. Exécuter dbt Run

```bash
# Matérialiser les modèles
cd analytics && ./scripts/dbt-env.sh run
```

**Afficher la progression** :
```
→ Exécution des modèles dbt (matérialisation)...

→ dbt run : Lancement

  Running model analytics.missions_active
    CREATE VIEW analytics.missions_active AS ...
    ✓ Created (245ms)

  Running model analytics.organizations_active
    CREATE TABLE analytics.organizations_active AS ...
    ✓ Created (1.2s)

  Running model analytics.stat_events_enriched
    CREATE TABLE analytics.stat_events_enriched AS ...
    ✓ Created (3.5s)

✅ dbt run réussi

→ Modèles exécutés : 12
→ Durée totale : 8.3s
→ Objets créés :
  - Vues : 4
  - Tables : 8
```

**Si erreur** :
```
❌ dbt run échoué

→ Erreur : Execution failed for model 'missions_active'

→ Détails :
  SQL compilation error: Table 'analytics_raw.missions' does not exist

→ Actions :
  1. Vérifier que la migration analytics est appliquée : /analytics/migrate
  2. Vérifier que les jobs d'export ont tourné
  3. Corriger le modèle dbt
  4. Re-exécuter : /analytics/dbt --run
```

**EXIT CODE 1**

### 6. Exécuter SQLFluff (Lint)

Avant de commiter, linter les modèles SQL :

```bash
# Lint dbt models
cd analytics/dbt && sqlfluff lint models/
```

**Afficher le résultat** :
```
→ Linting des modèles SQL (SQLFluff)...

  Linting models/missions/active.sql
    ✓ No violations

  Linting models/organizations/active.sql
    ⚠️  2 warnings
      L034: Select wildcards not allowed (line 12)
      L010: Inconsistent capitalisation (line 24)

✅ SQLFluff : 0 errors, 2 warnings

→ Warnings non bloquants
→ Actions :
  1. Corriger les warnings : sqlfluff fix models/
  2. Ou ignorer si acceptable
```

**Si erreurs** :
```
❌ SQLFluff échoué

→ Erreurs : 3

  **models/missions/active.sql**
    L001: Syntax error at line 42 (missing FROM clause)
    L034: Select wildcards not allowed

→ Actions :
  1. Corriger les erreurs SQL
  2. Re-lint : sqlfluff lint models/
  3. Ou auto-fix : sqlfluff fix models/
```

### 7. Générer Documentation dbt

```bash
# Générer docs
cd analytics && ./scripts/dbt-env.sh docs generate

# Servir docs (optionnel)
cd analytics && ./scripts/dbt-env.sh docs serve
```

**Afficher** :
```
→ Génération de la documentation dbt...

✅ Documentation générée

→ Fichiers : analytics/dbt/target/index.html
→ Pour visualiser : ./scripts/dbt-env.sh docs serve
→ URL : http://localhost:8080
```

### 8. Résumé et Prochaines Étapes

**Si succès** :
```
✅ dbt workflow réussi

→ Commandes exécutées :
  - dbt compile : ✓ (12 models)
  - dbt test : ✓ (12 tests passed)
  - dbt run : ✓ (12 models materialized)

→ Objets créés :
  - analytics.missions_active (view)
  - analytics.organizations_active (table)
  - analytics.stat_events_enriched (table)
  - ... (9 autres)

→ Prochaines étapes :
  1. Lint SQL : sqlfluff lint models/ (si pas déjà fait)
  2. Vérifier les données : Queries manuelles sur analytics.*
  3. Commiter : /commit (scope: analytics, type: feat)
     - Fichiers à commiter :
       * analytics/dbt/models/**/*.sql
       * analytics/dbt/models/**/schema.yml (si modifié)
  4. Créer PR : /pr
```

## Exemples

### Exemple 1 : Compiler Modèles

```bash
/analytics/dbt --compile
```

**Sortie** :
```
→ Compilation des modèles dbt...

✅ dbt compile réussi
→ Modèles compilés : 12
→ Durée : 3.2s
```

### Exemple 2 : Tester Modèles

```bash
/analytics/dbt --test
```

**Sortie** :
```
→ Exécution des tests dbt...

✅ dbt test réussi
→ Tests : 12 passed, 0 failed
→ Durée : 8.5s
```

### Exemple 3 : Exécuter Modèles

```bash
/analytics/dbt --run
```

**Sortie** :
```
→ Matérialisation des modèles dbt...

✅ dbt run réussi
→ Modèles : 12 created
→ Durée : 8.3s
```

### Exemple 4 : Workflow Complet

```bash
# 1. Compiler
/analytics/dbt --compile
→ ✓ Compilation réussie

# 2. Tester
/analytics/dbt --test
→ ✓ Tests passed

# 3. Exécuter
/analytics/dbt --run
→ ✓ Modèles matérialisés

# 4. Lint
cd analytics/dbt && sqlfluff lint models/
→ ✓ Aucune erreur

# 5. Commiter
/commit
→ ✓ Commit créé
```

### Exemple 5 : Erreur de Compilation

```bash
/analytics/dbt --compile
```

**Sortie** :
```
❌ dbt compile échoué

→ Erreur : Column "client_id" does not exist
→ Modèle : missions_active (line 45)

→ Actions :
  1. Vérifier migration : /analytics/migrate
  2. Corriger SQL
  3. Re-compiler
```

## Cas Spéciaux

### Modèles Incrémentaux

Pour modèles incrémentaux (matérialisation incrementielle) :
```sql
{{
  config(
    materialized='incremental',
    unique_key='id'
  )
}}

SELECT * FROM analytics_raw.stat_events
{% if is_incremental() %}
WHERE created_at > (SELECT MAX(created_at) FROM {{ this }})
{% endif %}
```

dbt run exécute seulement les nouvelles données.

### Sélection de Modèles

```bash
# Compiler un modèle spécifique
./scripts/dbt-env.sh compile --select missions_active

# Exécuter modèles d'un dossier
./scripts/dbt-env.sh run --select missions.*

# Exécuter avec dépendances
./scripts/dbt-env.sh run --select +missions_active
```

### Fresh Source Data

Vérifier fraîcheur des données source :
```bash
./scripts/dbt-env.sh source freshness
```

### Debug Mode

```bash
# Debug dbt (verbose)
./scripts/dbt-env.sh compile --debug
```

### Seeds (CSV)

Charger données de référence :
```bash
# Charger seeds (CSV → tables)
./scripts/dbt-env.sh seed
```

## Configuration

Permissions requises dans `.claude/settings.local.json` :
- `Bash(./scripts/dbt-env.sh:*)`
- `Bash(grep:*)`
- `Read(*)`

## Intégration

Ce skill fait partie du workflow analytics :
1. `/analytics/migrate` (migrations DB)
2. Modifier dbt models (SQL)
3. **`/analytics/dbt --compile`** (vérifier syntaxe)
4. **`/analytics/dbt --test`** (vérifier tests)
5. **`/analytics/dbt --run`** (matérialiser)
6. Lint SQL (SQLFluff)
7. `/commit` (commiter)
8. `/pr` (créer PR)

## Notes

- **dbt-env.sh** : Wrapper qui charge DATABASE_URL_ANALYTICS
- **Compile** : Vérification syntaxe sans exécution
- **Test** : Data tests (nullité, unicité, relations, custom)
- **Run** : Matérialisation (tables, vues, incremental)
- **SQLFluff** : Lint SQL (conventions, style)
- **Target** : Fichiers compilés dans `analytics/dbt/target/` (gitignored)
- **Docs** : Documentation générée depuis modèles + descriptions
