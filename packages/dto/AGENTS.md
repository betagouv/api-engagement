# Instructions agent (API Engagement / `packages/dto`)

Ce fichier précise les règles propres à `@engagement/dto`. Les conventions communes aux packages sont dans `../AGENTS.md`.

## Rôle du package

`@engagement/dto` expose les contrats TypeScript partagés entre l’API et les clients front. Il décrit les formes échangées aux frontières HTTP, pas les modèles internes Prisma, Mongo ou UI.

Structure :

- `src/resources/` : DTO groupés par ressource métier.
- `src/resources/index.ts` : agrégation des ressources.
- `src/index.ts` : point d’entrée public du package.

## Conventions DTO

- Exporter uniquement des `type` depuis les fichiers de ressources, sauf besoin explicite d’une valeur runtime.
- Nommer les types par ressource et intention : `MissionBrowseResponse`, `UserScoringCreateRequest`, etc.
- Ne pas importer de types internes depuis `api/` ou `plateform/`.
- Garder les DTOs sérialisables en JSON : pas de `Date`, classe, fonction, `Map`, `Set` ou type dépendant d’un runtime.
- Préférer des champs optionnels pour les évolutions compatibles ; éviter de renommer ou supprimer un champ déjà consommé sans adapter tous les usages.
- Conserver l’enveloppe et le naming réellement exposés par l’API, même si certains champs restent en `snake_case` pour compatibilité.

## Ajouter ou modifier une ressource

1. Créer ou modifier `src/resources/<ressource>.ts`.
2. Exporter la ressource depuis `src/resources/index.ts`.
3. Vérifier que `src/index.ts` continue d’exposer le point d’entrée public.
4. Adapter les producteurs côté `api/`.
5. Adapter les consommateurs côté `plateform/` ou autres clients.
6. Lancer `npm --workspace=@engagement/dto run build`.

## Points d’attention

- Un DTO ne doit pas contenir de logique métier.
- Si un champ représente une taxonomie, utiliser des noms cohérents avec `@engagement/taxonomy` (`taxonomyKey`, `taxonomyValueKey`, `value`, etc.).
- Les réponses paginées doivent exposer explicitement `total`, `page` et `pageSize` quand la pagination est disponible.
