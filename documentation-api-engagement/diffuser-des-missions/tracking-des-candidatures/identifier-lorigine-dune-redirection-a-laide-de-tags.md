# Identifier l’origine d’une redirection à l’aide de tags

{% hint style="info" %}
Cette page s'adresse exclusivement aux **diffuseurs qui distribuent des missions d'engagement sur plusieurs plateformes ou applications** en utilisant une source unique de récupération des missions via une seule clé API dédiée.
{% endhint %}

### Introduction

Habituellement, une redirection provient directement du site du diffuseur, ce qui signifie qu'elle hérite automatiquement de cette origine. Cependant, il peut arriver qu’un diffuseur dispose de plusieurs plateformes de diffusion. Dans ce contexte, l’API Engagement offre la possibilité d’ajouter des tags aux redirections. Cette fonctionnalité permet de distinguer facilement l’origine de chaque redirection et ainsi d’optimiser le suivi (tracking) des performances sur les différentes plateformes.



### Préambule : récupération des missions

Les missions fournies par l’API Engagement peuvent être récupérées en suivant [les routes indiquées dans la documentation](/broken/pages/-MFVTjXZI4cjR4v4MZs2). Une fois récupérées, les missions sont présentées dans le [format décrit ci-dessous](../modele-de-donnees-dune-mission-dengagement.md).

```jsx
{
    "_id": "id_mission",
    "publisherId": "id_annonceur",
    "publisherName": "xxx",
    "publisherUrl": "xxx",
    "publisherLogo": "xxx",
    "lastSyncAt": "2021-12-11T16:33:43.807Z",
    "applicationUrl": "<https://api.api-engagement.beta.gouv.fr/r/id_mission/id_annonceur>",
    "statusCode": "ACCEPTED",
    "statusComment": "",
    "clientId": "xxx",
    "title": "Mon titre",
    "description": "Ma description",
		[...]
    "createdAt": "2025-13-32T25:70:00.000Z",
    "updatedAt": "2025-13-32T25:70:00.000Z"
}
```



### Modification de l'**`applicationUrl`** sur votre site de diffusion

Pour ajouter un ou plusieurs tags à des redirections, ce qui permet ensuite de les distinguer en fonction du site source, il suffit de modifier le **`applicationUrl`** envoyé dans la mission.

#### Ajout d'un seul tag

Pour cela, vous devez simplement ajouter un paramètre de recherche dans l’URL (**URL search parameter**) appelé **`tags`**. Cela permettra d’identifier et de suivre plus facilement les redirections en fonction des tags définis.&#x20;

```jsx
"applicationUrl": "<https://api.api-engagement.beta.gouv.fr/r/id_mission/id_annonceur?tags=mon-tag>",
```

Cela aurait pour effet, de notre côté, d’enregistrer la redirection de la manière suivante :

```jsx
{
    "_id":"id_de_la_redirection",
    "type": "click",
    "tags": ["pixel"],
    "missionId": "id_mission",
    "fromPublisherId": "votre_id",
    "fromPublisherName": "Votre Nom",
    "toPublisherId": "id_annonceur",
    "toPublisherName": "Je suis annonceur",
    [...]
    "tags": ["mon-tag"]
}
```



#### Ajout de plusieurs tags

Pour ajouter **plusieurs tag**, il suffit de les séparer par une virgule comme ceci:

```jsx
"applicationUrl": "<https://api.api-engagement.beta.gouv.fr/r/id_mission/id_annonceur?tags=tag1,tag2,tag3>",
```

Cela aurait pour effet, de notre côté, d’enregistrer la redirection de la manière suivante :

```jsx
{
    "_id":"id_de_la_redirection",
    "type": "click",
    "tags": ["pixel"],
    "missionId": "id_mission",
    "fromPublisherId": "votre_id",
    "fromPublisherName": "Votre Nom",
    "toPublisherId": "id_annonceur",
    "toPublisherName": "Je suis annonceur",
    [...]
    "tags": ["tag1","tag2","tag3"]
}
```
