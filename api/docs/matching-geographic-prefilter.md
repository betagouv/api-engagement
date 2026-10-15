# Préfiltre géographique du matching

Le moteur restreint les missions avant le `GROUP BY` des correspondances taxonomiques. Ce changement utilise uniquement les tables métier et les index existants ; il ne nécessite aucune migration.

## Règles

Après le contrôle du statut, de la diffusion, du prompt et des gates, conserver :

- les missions dont au moins une adresse géocodée est dans le rayon ;
- les missions `remote=full` ou `remote=local`, même sans intention de participer à distance ; cette intention continue d'agir sur le score ;
- les missions sans adresse géocodée complète, y compris celles sans adresse ou dont une coordonnée manque.

Sans localisation utilisateur, le classement conserve son périmètre global. Aucun filtre par dispositif n'est ajouté et les gates restent obligatoires pour toutes les exceptions.

Le rayon de sélection vaut `max(rayon utilisateur, 6 × geoHalfDecayKm)`, soit **120 km minimum avec les paramètres par défaut**. Un rayon utilisateur plus large reste respecté. Le rayon de décroissance du score géographique reste distinct, avec son défaut de 20 km.

Une mission sur site géocodée au-delà du rayon est exclue, même si elle correspond aux préférences taxonomiques. Le fallback géographique ne la réintroduit pas. Il n'y a pas d'élargissement automatique si les résultats sont peu nombreux. Le `total` compte les candidats effectivement classés après cette sélection.

## Exécution

Le moteur matérialise la boîte sphérique et les adresses de la zone pour utiliser les index géographiques, puis croise ces adresses avec les missions éligibles. Une distance Haversine exacte élimine les coins de la boîte et les adresses sont dédupliquées par mission. Les passages de longitude à ±180° et les zones polaires sont traités.

Les scorings proches et les exceptions sont matérialisés avant l'agrégation taxonomique. Tous les pools proviennent ensuite de cette sélection. Le pool géographique réutilise les distances et les scores taxonomiques déjà calculés : une fusion par agrégation évite une jointure coûteuse lorsque le planificateur sous-estime le volume des scores.

Les règles de score, de diversification, de couverture et de pagination restent appliquées dans ce périmètre. Les changements d'adresse sont visibles dès le classement suivant.

## Validation et comparaison

Depuis `api/`, sur une base locale et avec les mêmes profils :

```bash
npx --no-install ts-node scripts/benchmark-matching-engine.ts --limits 100 --version m6 --geo-prefilter off --iterations 10 --warmup 2
npx --no-install ts-node scripts/benchmark-matching-engine.ts --limits 100 --version m6 --geo-prefilter on --iterations 10 --warmup 2
```

Utiliser les mêmes `--user-scoring-id` et alterner l'ordre des parcours. Ajouter `--explain` pour inspecter les volumes et les index. Le benchmark ne persiste pas de classement. Sans option, le préfiltre est actif. Pour un appel interne au service, `useGeographicPrefilter: false` fournit le témoin ; ce paramètre n'est pas exposé par HTTP.

Les tests couvrent le filtrage effectif avant agrégation dans `EXPLAIN ANALYZE`, les gates, la diffusion, les exceptions, les adresses multiples ou partielles, le cercle exact, les rayons utilisateur plus larges, l'absence de localisation, les cas de longitude et de pôle, la pagination et les changements d'adresse. Le test HTTP vérifie le nouveau périmètre.

Les mesures précédentes combinant plusieurs optimisations ne constituent pas une mesure isolée de ce changement. Le p95 HTTP sous charge reste à valider.
