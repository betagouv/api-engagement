# Dimensionnement du Pool de Connexions Prisma

## ⚠️ Problème avec le dimensionnement initial

Le choix de **20 connexions (core) + 15 (analytics) = 35 par instance** était basé sur des hypothèses non vérifiées et potentiellement dangereux.

## Configuration actuelle (Terraform)

### Containers Scaleway Serverless

**API (Production)** :
- `min_scale = 1`
- `max_scale = 1`
- ⚠️ **UNE SEULE INSTANCE MAX** (pas de scaling horizontal)
- Scaling basé sur CPU (80%)

**Widget (Production)** :
- `min_scale = 1`
- `max_scale = 4`
- Scaling sur 15 requêtes concurrentes
- ❌ **Ne se connecte PAS à PostgreSQL** (frontend)

**Jobs** :
- 15 jobs définis (cron schedules)
- Exécution séquentielle (pas tous en même temps)
- Exemples : `letudiant`, `talent`, `import-missions`, `export-stats`, etc.

### Consommation de connexions estimée

**Note** : Analytics DB est legacy et n'est pas concernée par cette optimisation.
Focus uniquement sur **Core DB**.

```
Scénario PRODUCTION actuel (Core DB uniquement) :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Service                   Core DB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
API (1 instance)            15
Jobs (1-2 en //max)         10-20
Autres (admin, Metabase)    10
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL MAX                   ~45
```

## Formule de dimensionnement

```
connection_limit = max_connections_db / (
  (max_api_instances × nb_databases) +
  (max_concurrent_jobs × nb_databases) +
  other_services +
  admin_connections +
  safety_margin
)
```

## Vérification PostgreSQL nécessaire

### 1. Vérifier max_connections

```sql
-- Se connecter à la base de données
psql $DATABASE_URL_CORE

-- Vérifier la configuration
SHOW max_connections;
SHOW shared_buffers;

-- Vérifier l'utilisation actuelle
SELECT count(*) as total_connections,
       application_name,
       state
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY application_name, state
ORDER BY total_connections DESC;

-- Connexions par client
SELECT client_addr,
       count(*) as connections
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY client_addr
ORDER BY connections DESC;
```

### 2. Vérifier le plan Scaleway Database

Selon la doc Scaleway, les limites varient :
- **DB-DEV** : max_connections = 20
- **DB-GP-S** : max_connections = 100
- **DB-GP-M** : max_connections = 200
- **DB-GP-L** : max_connections = 400
- **DB-GP-XL** : max_connections = 600

**TODO** : Identifier le plan actuel en production

## Recommandations par scénario

### Scénario 1 : PostgreSQL Core avec max_connections = 100

```
Répartition conservatrice (Core DB uniquement) :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
API (1 instance)
  - Core: 30 connexions

Jobs (2 en parallèle max)
  - Core: 10 connexions par job = 20

Autres (admin, monitoring, Metabase)
  - Réservés: 10 connexions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL UTILISÉ : 60 / 100 (60%)
```

**Configuration recommandée** :
```typescript
const prismaCore = new PrismaClientCore({
  log: ["error"],
  datasources: {
    db_core: {
      url: process.env.DATABASE_URL_CORE +
        "?connection_limit=30&pool_timeout=20&connect_timeout=10"
    }
  }
});

// Analytics DB is legacy - no pool configuration
const prismaAnalytics = new PrismaClientAnalytics({
  log: ["error"],
});
```

### Scénario 2 : PostgreSQL Core avec max_connections = 200

```
Répartition optimale (Core DB uniquement) :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
API (1 instance)
  - Core: 50 connexions

Jobs (3 en parallèle max)
  - Core: 20 connexions par job = 60

Autres (admin, monitoring, Metabase)
  - Réservés: 15 connexions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL UTILISÉ : 125 / 200 (63%)
```

**Configuration recommandée** :
```typescript
// Core DB
url: process.env.DATABASE_URL_CORE +
  "?connection_limit=50&pool_timeout=20&connect_timeout=10"

// Analytics DB is legacy - no pool configuration
```

### Scénario 3 : Si max_scale API augmente à 3+

⚠️ **IMPORTANT** : Si `max_scale` de l'API augmente (ex: 3 instances) :

```
Avec max_connections = 100 et 3 instances API :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3 instances × 35 connexions = 105 > 100 ❌
→ ERREUR : "remaining connection slots are reserved"
```

**Formule** :
```
connection_limit_per_instance = (max_connections - reserved) / max_api_instances / 2
```

Exemple avec max_connections = 100, max_scale = 3 :
```
connection_limit = (100 - 20) / 3 / 2 = 13 connexions par DB par instance
```

## Monitoring post-déploiement

### 1. Alertes à mettre en place

```sql
-- Alert si > 80% des connexions utilisées
SELECT
  (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as current,
  (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max,
  round(100.0 * (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) /
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'), 2) as percent_used;
```

### 2. Dashboard Grafana/Metabase

Métriques à suivre :
- Connexions actives par service
- Connexions idle vs actives
- Temps d'attente pour obtenir une connexion (pool_timeout)
- Taux de refus de connexion

### 3. Logs à monitorer

```bash
# Erreurs de connexion
grep "remaining connection slots" /var/log/postgresql/*.log

# Timeout du pool
grep "Timed out fetching a new connection" api-logs.txt

# Pool exhausted
grep "connection_limit" api-logs.txt
```

## Plan d'action immédiat

1. **Vérifier max_connections en production** ⚠️ URGENT
   ```bash
   # Via Scaleway Console ou CLI
   scw rdb instance get <instance-id>

   # Ou via psql
   psql $DATABASE_URL_CORE -c "SHOW max_connections;"
   ```

2. **Ajuster les valeurs selon le scénario**
   - Si max_connections < 100 : Utiliser Scénario 1 (conservateur)
   - Si max_connections >= 200 : Utiliser Scénario 2 (optimal)

3. **Configurer les variables d'environnement**
   - Ne PAS hardcoder dans le code
   - Utiliser env var : `PRISMA_POOL_SIZE_CORE`
   - Analytics DB est legacy - pas de configuration

   ```typescript
   const poolSizeCore = parseInt(process.env.PRISMA_POOL_SIZE_CORE || "30", 10);

   url: process.env.DATABASE_URL_CORE +
     `?connection_limit=${poolSizeCore}&pool_timeout=20&connect_timeout=10`
   ```

4. **Déployer progressivement**
   - Staging d'abord avec monitoring
   - Vérifier les métriques pendant 24h
   - Production si OK

5. **Mettre en place le monitoring**
   - Query pour tracker connexions actives
   - Alert Sentry/Slack si > 80%
   - Dashboard Metabase

## Configuration recommandée finale (à valider)

En attendant la vérification, utiliser une configuration **conservatrice** :

```typescript
// api/src/db/postgres.ts
const poolSizeCore = parseInt(process.env.PRISMA_POOL_SIZE_CORE || "15", 10);

const prismaCore = new PrismaClientCore({
  log: ["error"],
  datasources: {
    db_core: {
      url: process.env.DATABASE_URL_CORE +
        `?connection_limit=${poolSizeCore}&pool_timeout=20&connect_timeout=10`,
    },
  },
});

// Analytics DB is legacy - no pool configuration
const prismaAnalytics = new PrismaClientAnalytics({
  log: ["error"],
});
```

**Terraform (containers.tf)** :
```hcl
resource "scaleway_container" "api" {
  # ...
  environment_variables = {
    # ...
    "PRISMA_POOL_SIZE_CORE" = "30"  # Ajuster selon max_connections
    # Analytics DB est legacy - pas de configuration de pool
  }
}
```

## Références

- [Prisma Connection Management](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [PostgreSQL Connection Limits](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [Scaleway Database Plans](https://www.scaleway.com/en/docs/managed-databases/postgresql-and-mysql/reference-content/postgresql-limitations/)

## Notes

- Les valeurs actuelles (20/15) fonctionnent car **max_scale = 1** pour l'API
- **Si vous augmentez max_scale**, vous DEVEZ réduire connection_limit proportionnellement
- Les jobs ne tournent généralement pas tous en même temps (cron schedules différents)
- Considérer un connection pooler externe (PgBouncer) si besoin de plus de scaling
