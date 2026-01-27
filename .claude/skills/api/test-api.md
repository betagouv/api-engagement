---
description: "Run API tests"
---

# Skill: API Tests

Exécute les tests API (unit + integration avec Docker).

## Usage

```bash
/api/test              # Tous les tests (unit + integration)
/api/test --unit       # Tests unitaires uniquement
/api/test --integration # Tests d'intégration uniquement
/api/test --watch      # Mode watch (développement)
```


## Types de Tests

- Unit tests : `npm run test:unit` (mocks, pas de Docker)
- Integration tests : `npm run test:integration` (PostgreSQL + Mongo)
- Tests dans `__test__/*.spec.ts`

*(Voir api/AGENTS.md pour détails)*

## Workflow

### 1. Vérifier les Prérequis

#### 2.1 Working Directory

```bash
pwd
```

**Si pas dans `api/`** :
```
❌ ERREUR : Vous devez être dans le répertoire api/

→ Working directory : [current_dir]
→ Action : cd api && /api/test
```

**EXIT CODE 1**

#### 2.2 Docker (pour tests d'intégration)

```bash
# Vérifier si Docker est disponible
docker info >/dev/null 2>&1
```

**Si Docker indisponible (et tests d'intégration demandés)** :
```
❌ ERREUR : Docker non disponible

→ Les tests d'intégration nécessitent Docker (testcontainers)
→ Action : Démarrer Docker ou exécuter uniquement les tests unitaires
→ Alternative : /api/test --unit
```

**EXIT CODE 1**

#### 2.3 Client Prisma Généré

```bash
# Vérifier si le client Prisma core existe
test -d "api/src/db/core"
```

**Si manquant** :
```
⚠️  WARNING : Client Prisma core manquant

→ Le client Prisma doit être généré avant les tests
→ Action : Génération automatique via npm run prisma:generate

→ Voulez-vous générer le client maintenant ? (y/n)
```

Si `y` :
```bash
cd api && npm run prisma:generate
```

### 2. Déterminer les Tests à Exécuter

#### Mode 1 : Tous les Tests (défaut)

```bash
/api/test
```

Exécute : Unit + Integration

#### Mode 2 : Tests Unitaires

```bash
/api/test --unit
```

Exécute : Unit uniquement (rapide, pas de Docker)

#### Mode 3 : Tests d'Intégration

```bash
/api/test --integration
```

Exécute : Integration uniquement (nécessite Docker)

#### Mode 4 : Mode Watch

```bash
/api/test --watch
```

Exécute : Tests en mode watch (re-run automatique sur changements)

### 3. Générer le Client Prisma (si nécessaire)

```bash
# Toujours générer avant les tests d'intégration
cd api && npm run prisma:generate
```

**Raison** : Les tests d'intégration utilisent le client Prisma généré.

**Afficher** :
```
→ Génération du client Prisma...
✓ Client core généré
✓ Client analytics généré (read-only)
```

### 4. Exécuter les Tests

#### 5.1 Tests Unitaires

```bash
cd api && npm run test:unit
```

**Commande sous-jacente** (voir `api/package.json`) :
```bash
vitest run --config vitest.config.unit.ts
```

**Caractéristiques** :
- Pas de dépendances externes (mocks)
- Rapides (< 10s)
- Tests de logique métier (services, utils, helpers)

**Afficher la progression** :
```
→ Exécution des tests unitaires...

 ✓ src/services/__test__/tracking.service.spec.ts (12 tests)
 ✓ src/utils/__test__/parse.spec.ts (8 tests)
 ✓ src/controllers/__test__/events.controller.spec.ts (15 tests)

Tests: 35 passed, 35 total
Time:  2.45s
```

#### 5.2 Tests d'Intégration

```bash
cd api && npm run test:integration
```

**Commande sous-jacente** :
```bash
vitest run --config vitest.config.integration.ts
```

**Caractéristiques** :
- PostgreSQL via `testcontainers` (Docker)
- Mongo in-memory (`mongodb-memory-server`)
- Exécute migrations Prisma (global setup)
- Tests de repositories, endpoints HTTP, jobs

**Afficher la progression** :
```
→ Démarrage de Docker PostgreSQL (testcontainers)...
✓ PostgreSQL démarré (port 5432, container: test-postgres-123)

→ Exécution des migrations Prisma...
✓ Migrations appliquées (core schema)

→ Démarrage Mongo in-memory...
✓ Mongo démarré (mongodb://127.0.0.1:12345)

→ Exécution des tests d'intégration...

 ✓ tests/integration/repositories/stat-event.repository.spec.ts (8 tests)
 ✓ tests/integration/repositories/client.repository.spec.ts (6 tests)
 ✓ tests/integration/controllers/events.controller.spec.ts (12 tests)

Tests: 26 passed, 26 total
Time:  45.3s

→ Nettoyage...
✓ PostgreSQL arrêté
✓ Mongo arrêté
```

#### 5.3 Mode Watch (Développement)

```bash
cd api && npx vitest --config vitest.config.unit.ts --watch
```

**Mode interactif** :
- Re-run automatique sur changements
- Filtres disponibles (par fichier, par test)
- Utile pour TDD

**Afficher** :
```
→ Mode watch activé (tests unitaires)

→ Raccourcis :
  - q : Quitter
  - a : Re-run tous les tests
  - f : Re-run tests échoués uniquement
  - p : Filtrer par nom de fichier
  - t : Filtrer par nom de test

→ En attente de changements...
```

### 5. Analyser les Résultats

#### Cas 1 : Tous les Tests Passent

```
✅ Tests API réussis

→ Tests unitaires      : ✓ (35 passed, 2.45s)
→ Tests d'intégration  : ✓ (26 passed, 45.3s)

→ Total : 61 passed, 0 failed
→ Durée : 47.75s
→ Coverage : 78.5% (optionnel)
```

**EXIT CODE 0**

#### Cas 2 : Tests Échoués

```
❌ Tests API échoués

→ Tests unitaires      : ✓ (35 passed)
→ Tests d'intégration  : ❌ (24 passed, 2 failed)

→ Échecs :

**tests/integration/repositories/client.repository.spec.ts**
  ✗ should create client with valid data
    Expected: { id: "...", name: "Test Client" }
    Received: undefined

    at client.repository.spec.ts:45:23

**tests/integration/controllers/events.controller.spec.ts**
  ✗ should return 400 when client_id invalid
    Expected status: 400
    Received status: 500

    at events.controller.spec.ts:78:12

→ Total : 59 passed, 2 failed
→ Durée : 46.2s

→ Actions suggérées :
  1. Corriger les tests/code
  2. Re-run : /api/test --integration
  3. Mode watch : /api/test --watch
```

**EXIT CODE 1**

#### Cas 3 : Tests Unitaires OK, Intégration KO

```
⚠️  Tests partiellement réussis

→ Tests unitaires      : ✓ (35 passed)
→ Tests d'intégration  : ❌ (20 passed, 6 failed)

→ Problème détecté : Migration Prisma incompatible
→ Erreur : Column "client_id" does not exist

→ Actions suggérées :
  1. Vérifier les migrations : /api/migrate
  2. Régénérer le client : npm run prisma:generate
  3. Re-run tests d'intégration
```

### 6. Coverage (Optionnel)

```bash
# Générer coverage
cd api && npx vitest run --coverage
```

**Afficher le rapport** :
```
→ Coverage :

  File                          | % Stmts | % Branch | % Funcs | % Lines
  ------------------------------|---------|----------|---------|--------
  src/services/tracking.ts      |   95.2  |   87.5   |  100.0  |   94.8
  src/repositories/client.ts    |   88.6  |   75.0   |  100.0  |   88.6
  src/controllers/events.ts     |   72.3  |   65.2   |   80.0  |   71.9
  ------------------------------|---------|----------|---------|--------
  All files                     |   78.5  |   72.1   |   85.3  |   78.2

→ Coverage report : api/coverage/index.html
```

### 7. Post-Tests

#### Si Succès

```
✅ Tous les tests passent

→ Prochaines étapes suggérées :
  1. Vérifier le lint : /lint
  2. Commiter les changements : /commit
  3. Créer une PR : /pr
```

#### Si Échecs

```
❌ Tests échoués

→ Actions suggérées :
  1. Analyser les erreurs ci-dessus
  2. Corriger le code ou les tests
  3. Mode watch pour itération rapide : /api/test --watch
  4. Re-run après corrections : /api/test
```

#### Si Problèmes Docker

```
⚠️  Tests d'intégration non exécutés (Docker)

→ Docker indisponible ou non démarré
→ Tests unitaires : ✓ (35 passed)

→ Actions :
  1. Démarrer Docker Desktop
  2. Re-run : /api/test
  3. OU continuer avec tests unitaires : /api/test --unit
```

## Exemples

### Exemple 1 : Tests Complets

```bash
/api/test
```

**Sortie** :
```
→ Génération du client Prisma...
✓ Client généré

→ Tests unitaires...
✓ 35 passed (2.45s)

→ Tests d'intégration...
✓ Docker PostgreSQL démarré
✓ Migrations appliquées
✓ 26 passed (45.3s)

✅ Total : 61 passed, 0 failed
```

### Exemple 2 : Tests Unitaires Rapides

```bash
/api/test --unit
```

**Sortie** :
```
→ Tests unitaires...
✓ 35 passed (2.12s)

✅ Tests unitaires réussis (pas de tests d'intégration)
```

### Exemple 3 : Tests d'Intégration Uniquement

```bash
/api/test --integration
```

**Sortie** :
```
→ Génération du client Prisma...
✓ Client généré

→ Tests d'intégration...
✓ Docker PostgreSQL démarré
✓ Migrations appliquées
✓ 26 passed (43.8s)

✅ Tests d'intégration réussis
```

### Exemple 4 : Mode Watch

```bash
/api/test --watch
```

**Sortie** :
```
→ Mode watch activé (tests unitaires)

 ✓ 35 tests passed

→ En attente de changements...

[Modification de src/services/tracking.ts]

→ Re-running tests...
 ✓ 35 tests passed (1.23s)
```

### Exemple 5 : Tests Échoués

```bash
/api/test
```

**Sortie** :
```
→ Tests unitaires...
✓ 35 passed

→ Tests d'intégration...
❌ 24 passed, 2 failed

  ✗ client.repository.spec.ts:45
    Expected client to be created

❌ Total : 59 passed, 2 failed

→ Action : Corriger les erreurs
```

## Cas Spéciaux

### Tests Snapshot (Playwright Widget)

Ce skill est pour l'API uniquement. Pour tests E2E widget :
```bash
/widget/test
```

### Tests Après Migration

Workflow recommandé :
```bash
1. /api/migrate
   → Crée migration Prisma

2. /api/test
   → Teste avec nouveau schéma

3. Si tests échouent :
   → Corriger repositories/services
   → Re-run /api/test
```

### Tests en CI

Les tests CI (`npm run test:ci`) :
- Exécutent unit + integration
- Génèrent coverage
- Pas de mode watch

Différence avec skill :
- **CI** : Automatique, sur PR, avec artifacts
- **Skill** : Manuel, local, itération rapide

### Mock API Externe

Les tests unitaires mockent les appels externes :
```typescript
// Exemple
vi.mock('src/services/external-api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'mock' })
}))
```

### Seed Data (Tests d'Intégration)

Les tests d'intégration peuvent utiliser des factories/fixtures :
```typescript
// tests/integration/factories/client.factory.ts
const createClient = async () => {
  return prismaCore.client.create({ data: { ... } })
}
```

## Configuration

Permissions requises dans `.claude/settings.local.json` :
- `Bash(npm run test:*)`
- `Bash(npm run prisma\\:generate:*)`
- `Read(*)`

## Intégration

Ce skill fait partie du workflow de développement :
1. Faire des modifications (code, schéma DB)
2. **`/api/test`** (valider les changements)
3. Si échec : corriger + re-test
4. Si succès : `/lint` puis `/commit`

## Notes

- **Tests unitaires** : Rapides, pas de Docker, pour logique métier
- **Tests d'intégration** : Lents, Docker requis, pour DB/HTTP
- **Mode watch** : Utile en développement (TDD)
- **Client Prisma** : Toujours généré avant tests d'intégration
- **Docker** : Obligatoire pour tests d'intégration (testcontainers)
- **Coverage** : Optionnel, utile pour identifier code non testé
