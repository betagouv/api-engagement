# Erreurs, cas limites et fallbacks

## Quiz

- Un âge vide, non numérique, inférieur à 16 ou supérieur à 99 est refusé.
- Une étape de sélection obligatoire sans réponse affiche une erreur et bloque la progression.
- Un accès direct à une étape conditionnelle non applicable redirige vers la première étape visible.
- Une sauvegarde de scoring sans réponse taxonomique est considérée comme réussie sans appel backend.
- Une erreur de sauvegarde maintient l'utilisateur sur l'étape et permet une nouvelle tentative.
- À la fin du chargement, l'absence d'identifiant de scoring renvoie vers l'accueil au lieu d'une page de résultats.

## Résultats et recherche

- Une erreur de la première requête de matching retire la promesse du cache afin qu'un nouvel appel soit possible.
- Les requêtes de résultats et de catalogue précédentes sont annulées lorsqu'elles deviennent obsolètes.
- Une page invalide du catalogue est ramenée à la page 1 ; une valeur inférieure à 1 est ramenée à 1.
- Un catalogue vide affiche un état informatif distinct d'une erreur de chargement.
- Le nombre total de pages vaut au minimum 1, même lorsque le total vaut zéro.

## Fiche mission

- Une erreur de récupération affiche un message générique de chargement impossible.
- Une réponse sans mission exploitable affiche « Mission introuvable. »
- Les blocs optionnels, comme la localisation, la photo ou l'échéance, ne sont affichés que lorsque les données correspondantes existent.

## API et matching

- Une version inconnue du moteur de matching retombe sur la version par défaut `m3` et produit un signalement.
- Une gate ne peut pas recevoir de poids de ranking lors de la définition d'une version.
- Un scoring utilisateur inexistant provoque une erreur du service de matching.
- Une intersection vide de règles d'éligibilité ne peut pas exprimer « personne n'est éligible » : aucune gate n'est injectée et le service journalise le cas.
- L'email de missions distingue les absences de données, interdictions, envois ignorés et échecs techniques.

## Sources

- `plateform/app/utils/quiz.ts`
- `plateform/app/routes/quiz/_layout.tsx`
- `plateform/app/hooks/useMissionResults.ts`
- `plateform/app/routes/missions.tsx`
- `plateform/app/routes/mission-detail.tsx`
- `api/src/services/matching-engine/config.ts`
- `api/src/services/matching-engine/index.ts`
- `api/src/services/mission-scoring/scoring-rules.ts`
- `api/src/services/mission-email/index.ts`
