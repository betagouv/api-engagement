# Dataset de jugement des enrichissements

`staging-mission-ids.txt` fige un échantillon de missions staging utilisé pour juger les
enrichissements v5.

L'échantillon contient :

- 50 missions Service Civique ;
- 50 missions JeVeuxAider ;
- 1 mission de la Réserve de la Gendarmerie nationale ;
- 1 mission de la Réserve de la Police nationale ;
- 1 mission de sapeur-pompier volontaire.

Les missions Service Civique et JeVeuxAider ont été sélectionnées en maximisant la
couverture des valeurs taxonomiques présentes dans les enrichissements v5, puis la
diversité des domaines historiques, rythmes et formats distanciels.

Le fichier contient des `missionId`, jamais des `missionEnrichmentId`. Le juge résout
le dernier enrichissement terminé de la version demandée au moment de l'exécution et
échoue si une mission n'en possède pas.

Depuis `api/` :

```bash
npm run job -- update-mission-enrichment \
  '{"missionIdsFile":"scripts/mission-enrichment/dataset/staging-mission-ids.txt"}' \
  --env staging

npx tsx scripts/mission-enrichment/judge-enrichments.ts \
  --version v5 \
  --mission-ids-file scripts/mission-enrichment/dataset/staging-mission-ids.txt
```
