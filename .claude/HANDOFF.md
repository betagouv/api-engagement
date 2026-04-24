# HANDOFF — api-engagement

Snapshot de l'état des chantiers actifs. À mettre à jour en fin de session significative.

_Dernière mise à jour : 2026-04-13_

---

## Chantiers actifs

### Rate limiting — `valentin/feature/rate-limit`

- **État** : PR ouverte, approuvée, en attente de merge
- **Contexte** : rate limiting implémenté côté controller (voir commits récents sur la branche). Trust proxy configuré.
- **Prochaine action** : merger la PR

### Job L'Etudiant — refactoring 3 phases

- **État** : code terminé et testé (18 tests passants), mergé sur staging, **pas encore déployé en production**
- **Contexte** : refactoring en phases `archive-expired`, `update-modified`, `publish-new`, `sync-mission`. Quota 3000 entrées Piloty réparties par domaine. Mode dry-run disponible.
- **Bloquant** : en attente d'une validation avant déploiement prod
- **Prochaine action** : obtenir la validation, déclencher le déploiement

---

## Chantiers récemment terminés

### Stat-event

- **État** : résolu et mergé

### Modération (JVA)

- **État** : endpoints `/moderation/*` + job récurrent + tests d'intégration — mergé

---

## Contexte technique utile

- Branche de base : `staging` (pas `main`)
- Les PRs partent de `staging`, la prod est sur `main`
- CI : lint → tests → build → deploy (voir `.github/workflows/main-pipeline.yml`)
