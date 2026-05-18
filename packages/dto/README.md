# @engagement/dto

Package de DTO TypeScript partagés entre l'API et les clients front.

## Organisation

- `src/resources/` : DTO métier regroupés par ressource.

Le point d'entrée public est `src/index.ts`. Les imports consommateurs doivent passer par `@engagement/dto`.
