---
generated_at: 2026-08-07
source_branch: main
source_commit: e43331e23e6bad9cf2d43a16a95749832e82fb71
scope: plateform-product
---

# Référentiel fonctionnel de la plateforme

Ce dossier regroupe les règles de gestion du produit frontal `plateform` et des services métier qu'il consomme. Il est destiné à être consulté par un agent utilisé par un humain, notamment pour comprendre le produit et contribuer à la rédaction d'une FAQ.

La documentation est générée à partir du code et des tests compris dans la frontière globale de [`sources.yml`](./sources.yml), puis validée par le PM au moyen d'une pull request. Les sources propres à chaque chapitre sont retrouvées automatiquement depuis ses citations et les fichiers modifiés.

## Périmètre

Le référentiel couvre les parcours de `plateform`, le scoring utilisateur, la recherche de missions, le matching, l'éligibilité, les taxonomies, les emails, le consentement et les comportements de persistance ou d'erreur associés.

Il ne couvre pas Terraform, l'infrastructure, le back-office, les widgets sans lien avec le parcours, les imports, la diffusion partenaire ni les traitements sans effet fonctionnel sur la plateforme.

## Documents

- [Vue d'ensemble du produit](./01-product-overview.md)
- [Parcours utilisateur](./02-user-journeys.md)
- [Quiz](./03-quiz.md)
- [Scoring utilisateur](./04-user-scoring.md)
- [Recherche de missions](./05-mission-search.md)
- [Matching](./06-matching.md)
- [Éligibilité et scoring des missions](./07-eligibility-and-scoring.md)
- [Taxonomies](./08-taxonomies.md)
- [Détail d'une mission et candidature](./09-mission-detail-and-application.md)
- [Emails, newsletter et consentement](./10-emails-newsletter-and-consent.md)
- [Persistance des données et états](./11-data-persistence-and-state.md)
- [Erreurs, cas limites et fallbacks](./12-errors-edge-cases-and-fallbacks.md)

## Convention

Les règles sont décrites à partir des comportements établis dans les sources. Les chemins cités permettent de retrouver leur implémentation. La documentation ne détermine pas la configuration effectivement déployée et ne constitue pas directement une FAQ.
