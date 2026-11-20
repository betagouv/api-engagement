# Missions non diffusées sur mon site

{% hint style="danger" %}
Rappel : Cette section ne s'adresse qu'aux **diffuseurs ayant choisi l'intégration par API**.
{% endhint %}

Il est possible que certaines des missions présentes dans le flux API ne correspondent pas à vos critères pour être diffusées ; et que vous choissisez de ne pas les diffuser sur votre application. Cette information doit être partagée à l'API Engagement.&#x20;

## Étape 1 : Création d'une route "feedback" _(à réaliser par l'équipe API Engagement)_

* Le chargé de déploiement avec qui vous êtes en contact se charge d'ouvrir et **configurer la route** (création de l’endpoint dans l’environnement adéquat) 
* Cette route sera de la forme **`/v2/{nomPartenaire}/feedback`**

_NB : Les données d'authenfication restent les mêmes que pour accéder aux données de missions._



## Étape 2 : Envoyer l'information des missions non diffusées

### `GET /v2/{nom}/feedback`

#### Header

| **Champs**  | **Type** | **Description**  | **Example**                              |
| ----------- | -------- | ---------------- | ---------------------------------------- |
| `x-api-key` | String   | Clef API fournie | xxxxxxxx\_xxxx\_xxxx\_xxxx\_xxxxxxxxxxxx |

#### Body

***

| **Champs**                                                                             | **Type** | Requis | **Description**                                                          |
| -------------------------------------------------------------------------------------- | -------- | ------ | ------------------------------------------------------------------------ |
| `missionId`                                                                            | String   | oui    | ID de l'annonce                                                          |
| `status`                                                                               | String   | oui    | `ACCEPTED`  en cas d’ajout réussi                                        |
| `PENDING`  en cas de début de traitement de la mission (optionnel)                     |          |        |                                                                          |
| `DELETED` en cas de suppression réussie                                                |          |        |                                                                          |
| `REFUSED` en cas de refus de la mission (accompagné de la raison dans le champs `note` |          |        |                                                                          |
| `url`                                                                                  | String   | non    | Url de l'annonce                                                         |
| `comment`                                                                              | String   | non    | Détails de refus de la mission. Obligatoires pour les statuts `REFUSED`. |

#### Exemples

Accepted

```jsx
{
	"missionId": "5f6b4b86596993ec582f92d1", 
	"status": "ACCEPTED",
	"url": "<https://www.jobteaser.com/en/job-offers/xxx-ma-mission>"
}
```

Refused

```jsx
{
	"missionId": "5f6b4b86596993ec582f92d1", 
	"status": "REFUSED",
	"comment": "La mission ne possede pas de code postal"
}
```

#### Responses

**Status 200**

```jsx
{
	"ok": true
}
```

**Status 400**

```jsx
{
    "ok": false,
    "code": "INVALID_BODY",
    "message": {
        "issues": [
            {
                "code": "invalid_type",
                "expected": "string",
                "received": "undefined",
                "path": [
                    "missionId"
                ],
                "message": "Required"
            }
        ],
        "name": "ZodError"
    }
}
```

**Status 401**

```jsx
Unauthorized
```

**Status 404**

```jsx
{
    "ok": false,
    "code": "NOT_FOUND",
    "message": "Mission not found"
}
```
