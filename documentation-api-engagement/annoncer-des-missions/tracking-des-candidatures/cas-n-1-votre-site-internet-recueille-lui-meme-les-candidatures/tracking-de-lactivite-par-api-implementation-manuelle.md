# Tracking de l'activité par API (Implémentation manuelle)

Vous pouvez également envoyer les informations de candidatures ou de création de compte manuellement, en suivant le ce guide :&#x20;

## Redirection

Les redirections provenant de l'API contiennent **un attribut unique dans les paramètres de requête**, `apiengagement_id`. Cet attribut correspond à **l'identifiant de la redirection** qui a amené l'utilisateur sur votre site. Exemple de lien suite à une redirection:

```html
https://www.jeveuxaider.gouv.fr/?apiengagement_id=60a8e60ef959740741fa6616
```

Le tag de l'API Engagement **permet de récupérer cette valeur** et de la stocker dans les cookies sous le nom `apiengagement`. Cependant, si vous n'intégrez pas le script, il est important de **récupérer cette valeur et de l'utiliser pour suivre** une candidature ou une création de compte. Cela peut se faire en utilisant le `localStorage`, par exemple.

## 1. Créer une candidature ou une création de compte

<mark style="color:green;">`POST`</mark> `https://api.api-engagement.beta.gouv.fr/v2/activity`

Lorsqu'une candidature ou une création de compte est détectée chez vous, cette route permet de créer une entrée de statEvent (candidature, création de compte) sans passer par notre SDK en front, mais directement en API

#### Headers

<table><thead><tr><th width="182">Name</th><th width="126">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>x-api-key</code> <mark style="color:red;">Requis</mark></td><td><code>string</code></td><td>La clé API <strong>nécessaire à l’authentification</strong>. Les données disponibles sont définies en fonction de votre clé API.</td></tr></tbody></table>

#### Body

| Name              | Type                                                         | Description                                                                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clickId`         | string - <mark style="background-color:red;">Required</mark> | Id de la redirection associée à la création de compte correspondant à la valeur comprise dans `apiengagement_id`                                                                                                                            |
| `type`            | `apply` ou `account`                                         | Type de l'activité à enregistrer: `apply` pour une candidature, `account` pour une création de compte. Par défaut : <mark style="color:blue;">`apply`</mark>                                                                                |
| `missionClientId` | string                                                       | Id de la mission pour laquelle une création de compte est identifié (correspondant aux `clientId` dans le [flux XML](../../creation-dun-flux-xml/methode-1-creation-dun-flux-xml/depreciee-liste-des-champs-a-inclure-dans-le-flux-xml.md)) |
| `tag`             | string                                                       | Tag de la création de compte                                                                                                                                                                                                                |

#### **Response**

{% tabs %}
{% tab title="200" %}
```json
/** Call with the body set to
* missionClientId = "4321"
* clickId = "click_id"
* tag = "les-meilleurs-missions"
* type = "account"
*/
{
    "ok": true,
    "data": {
        "_id": "activity_id",
        "clikcId": "click_id",
        "missionId": "87654321-431-4321-210987654321",
        "missionClientId": "4321",
        "missionDomain": "education",
        "missionTitle": "Le titre de ma mission",
        "missionPostalCode": "33440",
        "missionDepartmentName": "Gironde",
        "missionOrganizationName": "Mon asso preferee",
        "missionOrganizationId": "xxxx",
        "toPublisherId": "mon_identifiant",
        "fromPublisherId": "identifiant_partenaire",
        "tag": "les-meilleurs-missions",
        "host": "https://xxx.yyy.fr",
        "created_at": "2024-03-13T13:00:00.000Z",
        "source": "publisher",
        "type": "account",
        "status" : "PENDING",
    }
}
```
{% endtab %}

{% tab title="400" %}
```json
{
    "ok": false,
    "code": "INVALID_BODY",
    "error": [
        {
            "expected": "string",
            "code": "invalid_type",
            "path": [
                "clickId"
            ],
            "message": "Invalid input: expected string, received undefined"
        }
    ]
}
```
{% endtab %}

{% tab title="404" %}
```json
{
    "ok": false,
    "code": "NOT_FOUND",
    "message": "Mission not found"
}
// Ou
{
    "ok": false,
    "code": "NOT_FOUND",
    "message": "Mission not found"
}
```
{% endtab %}
{% endtabs %}

## 2. Mettre à jour le statut de la candidature

<mark style="color:blue;">`PUT`</mark> `https://api.api-engagement.beta.gouv.fr/v2/activity/:id`

Il est possible de mettre à jour le statut d'une candidature ou d'une création de compte afin de suivre l'avancement du candidat

#### Headers

<table><thead><tr><th width="182">Name</th><th width="126">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>x-api-key</code> <mark style="color:red;">Requis</mark></td><td><code>string</code></td><td>La clé API <strong>nécessaire à l’authentification</strong>. Les données disponibles sont définies en fonction de votre clé API.</td></tr></tbody></table>

#### **Params**

| Name  | Value                                                  |
| ----- | ------------------------------------------------------ |
| `:id` | Identifiant de la candidature ou de création de compte |

#### **Body**

| Name     | Type                                                           | Description                                                                                                                                                           |
| -------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status` | `PENDING`, `VALIDATED`, `CANCELED`, `REFUSED` ou `CARRIED_OUT` | Statut de la candidature ou création du compte. <mark style="color:blue;">Défaut à</mark> <mark style="color:blue;"></mark><mark style="color:blue;">`PENDING`</mark> |

#### **Response**

{% tabs %}
{% tab title="200" %}
```json
/** Call with the body set to
* status = "VALIDATED"
*/
{
    "ok": true,
    "data": {
        "_id": "activity_id",
        "clickId": "click_id",
        "missionId": "87654321-431-4321-210987654321",
        "missionClientId": "4321",
        "missionDomain": "education",
        "missionTitle": "Le titre de ma mission",
        "missionPostalCode": "33440",
        "missionDepartmentName": "Gironde",
        "missionOrganizationName": "Mon asso preferee",
        "missionOrganizationId": "xxxx",
        "toPublisherId": "mon_identifiant",
        "fromPublisherId": "identifiant_parteanire",
        "tag": "les-meilleurs-missions",
        "host": "https://xxx.yyy.fr",
        "created_at": "2024-03-13T13:00:00.000Z",
        "source": "publisher",
        "type": "account",
        "status" : "VALIDATED",
    }
}
```
{% endtab %}

{% tab title="400" %}
```json
{
    "ok": false,
    "code": "INVALID_BODY",
    "error": [
        {
            "code": "invalid_value",
            "values": [
                "PENDING",
                "VALIDATED",
                "CANCELED",
                "REFUSED",
                "CARRIED_OUT"
            ],
            "path": [
                "status"
            ],
            "message": "Invalid option: expected one of \"PENDING\"|\"VALIDATED\"|\"CANCELED\"|\"REFUSED\"|\"CARRIED_OUT\""
        }
    ]
}
```
{% endtab %}

{% tab title="404" %}
```json
{
    "ok": false,
    "code": "NOT_FOUND",
    "message": "Activity not found"
}
```
{% endtab %}
{% endtabs %}
