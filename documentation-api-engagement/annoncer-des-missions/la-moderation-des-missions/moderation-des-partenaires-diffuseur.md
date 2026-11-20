# Modération des partenaires "diffuseur"

Certains diffuseurs de l'API Engagement pratique une modération supplémentaire pour les missions qu'il récupèrent via l'API avant de les diffuser sur leur plateforme.

Dans ce cas, des champs supplémentaires sont ajoutés aux missions afin de connaître le statut de la modération. Tous ces champs suivent le format `moderation_{identifiant_du_diffuseur}_{champs}` comme suit et sont accessible par API avec la route [Broken link](/broken/pages/-M_jv6oFRGaxS_l56Ogy "mention"):&#x20;

<table><thead><tr><th width="297">Nom du champ</th><th width="119">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>moderation_{id}_status</code></td><td><code>String</code></td><td><p>Statut de la modération parmi ces valeurs <span data-gb-custom-inline data-tag="emoji" data-code="1f44d">👍</span></p><ul><li><code>ACCEPTED</code>: mission acceptée</li><li><code>REFUSED</code>: mission refusée</li><li><code>PENDING</code>: mission en attente de modération</li><li><code>ONGOING</code>: mission en cours de modération</li></ul></td></tr><tr><td><code>moderation_{id}_comment</code></td><td><code>String</code></td><td>Motif du refus si la mission est refusée</td></tr><tr><td><code>moderation_{id}_title</code></td><td><code>String</code></td><td>Si le titre est modifié, nouveau titre choisi par le partenaire</td></tr></tbody></table>

Ces informations sont également visibles dans le dashboard "Partager des Missions" > Flux de Mission

<figure><img src="../../.gitbook/assets/image (7).png" alt=""><figcaption></figcaption></figure>

### Exemple de moderation

```json
// Mission refusée
{
    "title": "La meilleure mission de bénévolat",
    "startAt": "2012-12-21T00:00:00.000Z"
    ...
    "moderation_5f5931496c7ea5xxxxxxxxxx_comment": "La mission est refusée car la date de création est trop ancienne (> 6 mois)",
    "moderation_5f5931496c7ea5xxxxxxxxxx_status": "REFUSED",
    "moderation_5f5931496c7ea5xxxxxxxxxx_title": ""
}
// Mission acceptée
{
        "title": "La meilleure mission de bénévolat",
    ...
    "moderation_5f5931496c7eaxxxxxxxxxxx_comment": "",
    "moderation_5f5931496c7eaxxxxxxxxxxx_status": "ACCEPTED",
    "moderation_5f5931496c7eaxxxxxxxxxxx_title": "L'une des meilleures mission de bénévolat"
}
```
