# Liste des champs à inclure dans le flux XML

### ℹ️ Source de vérité

> La définition complète des champs (types, contraintes, enums) est disponible dans la documentation API :\
> → API Référence – [Créer / Mettre à jour une mission](https://app.gitbook.com/s/ubkRP59ZFCzK5T16bZo1/mission-mission/creer-mettre-a-jour)

## 1. Informations principales de la mission

| Champ XML      | Champ API      | Obligatoire | Description                                                                                                      |
| -------------- | -------------- | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| clientId       | clientId       | ✅           | Identifiant unique de la mission dans votre système d'information (immuable)                                     |
| title          | title          | ✅           | Titre de la mission                                                                                              |
| description    | description    | ✅           | Description complète de la mission. Texte brut ou HTML acceptés, stockés tels quels.                             |
| applicationUrl | applicationUrl | ✅           | URL de la page où l'utilisateur sera redirigé pour candidater (URL de la page présentant la mission)             |
| image          | image          | ❌           | URL de l'image de la mission. Si absent, l'API Engagement utilise une image de sa bibliothèque selon le domaine. |
| metadata       | metadata       | ❌           | Métadonnées libres associées à la mission.                                                                       |

## 2. Classification de la mission

| Champ XML     | Champ API  | Obligatoire                                                                                                                                                                                                  | Description                                                                                    |
| ------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| domain        | domain     | <p>❌<br>Fortement recommandé. Si absent, la mission est acceptée mais utilise une image par défaut et ressort moins bien dans les recherches par domaine. Une valeur hors de la liste entraîne un refus.</p> | Domaine d'action de la mission.                                                                |
| activities\[] | activities | ❌                                                                                                                                                                                                            | Activité(s) principale(s) de la mission.                                                       |
| tags\[]       | tags       | ❌                                                                                                                                                                                                            | Mots-clés personnalisés pour taguer la mission. Chaque élément du tableau est un tag distinct. |

## 3. Public & compétences

| Champ XML       | Champ API    | Obligatoire | Description                                                                                                                                |
| --------------- | ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| audience\[]     | audience     | ❌           | Les bénéficiaires de la mission — à qui la mission s'adresse, le public auquel sera confronté la personne qui s'engage.                    |
| requirements\[] | requirements | ❌           | Pré-requis relatifs à la mission.                                                                                                          |
| softSkills\[]   | softSkills   | ❌           | Les compétences générales requises pour la mission. Ce champ ne repose pas sur un référentiel de compétence structuré.                     |
| romeSkills\[]   | romeSkills   | ❌           | Code OGR Macro du ROME 4.0. Ce champ repose sur le référentiel "Arborescence simplifiée des compétences" (section "Arborescence du ROME"). |

## 4. Modalités de la mission

| Champ XML | Champ API | Obligatoire | Description                                                                                                                                                                               |
| --------- | --------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| remote    | remote    | ❌           | Disponibilité en distanciel.                                                                                                                                                              |
| schedule  | schedule  | ❌           | Rythme de la mission (texte libre)                                                                                                                                                        |
| startAt   | startAt   | ❌           | Date de début de la mission souhaitée. Format ISO 8601.                                                                                                                                   |
| endAt     | endAt     | ❌           | Date de fin de la mission souhaitée. Format ISO 8601.                                                                                                                                     |
| postedAt  | postedAt  | ❌           | Date de première publication de la mission. Format ISO 8601.                                                                                                                              |
| places    | places    | ❌           | Nombre de places disponibles pour la mission. Ce nombre doit être mis à jour dès qu'il évolue dans votre système afin que l'API Engagement dispose toujours de la donnée la plus récente. |

## 5. Indemnisation

| Champ XML             | Champ API             | Obligatoire | Description                                                                                                          |
| --------------------- | --------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| compensationAmount    | compensationAmount    | ❌           | Montant de l'indemnisation perçue par le bénévole ou le volontaire.                                                  |
| compensationAmountMax | compensationAmountMax | ❌           | Montant maximum de l'indemnisation. Si renseigné, doit être supérieur ou égal à `compensationAmount` (ex. 0–13 €/h). |
| compensationUnit      | compensationUnit      | ❌           | Période de l'indemnisation pour le montant fourni.                                                                   |
| compensationType      | compensationType      | ❌           | Type d'indemnisation.                                                                                                |

## 6. Accessibilité & conditions

| Champ XML                 | Champ API                 | Obligatoire | Description                                          |
| ------------------------- | ------------------------- | ----------- | ---------------------------------------------------- |
| openToMinors              | openToMinors              | ❌           | Mission ouverte aux mineurs.                         |
| reducedMobilityAccessible | reducedMobilityAccessible | ❌           | Mission accessible aux personnes à mobilité réduite. |
| closeToTransport          | closeToTransport          | ❌           | Mission proche des transports en commun.             |

## 7. Localisation de la mission

| Champ XML    | Champ API | Obligatoire                                                                                                                                         | Description                                                                                                                                                                                                                  |
| ------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| addresses\[] | addresses | <p>❌</p><p>Fortement recommandé. Sans adresse, la mission ne peut pas être géolocalisée ni ressortir dans les recherches par ville ou distance.</p> | Ensemble des localisations où se déroule la mission. Si la mission se tient dans plusieurs lieux, renseignez autant d'objets que de localisations. Pour une mission en lieu unique, le tableau ne contient qu'un seul objet. |

#### Détail d’un objet `address`

| Champ XML      | Champ API                | Description                                                                                                  |
| -------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| street         | addresses.street         | Rue où la mission se déroule                                                                                 |
| postalCode     | addresses.postalCode     | Code postal du lieu où la mission se déroule                                                                 |
| city           | addresses.city           | Ville où la mission se déroule                                                                               |
| departmentCode | addresses.departmentCode | Département où la mission se déroule                                                                         |
| departmentName | addresses.departmentName | Nom du département où la mission se déroule                                                                  |
| region         | addresses.region         | Nom de la région où la mission se déroule                                                                    |
| country        | addresses.country        | Nom du pays où la mission se déroule. La mission doit avoir le code du pays au format **ISO 3166-1 alpha-2** |

## 8. Typologie de mission

| Champ XML | Champ API | Obligatoire | Description                  |
| --------- | --------- | ----------- | ---------------------------- |
| type      | type      | ✅           | Type de mission d'engagement |

## 9. Organisation

| Champ XML                    | Champ API                   | Obligatoire | Description                                                                                                                          |
| ---------------------------- | --------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| organizationClientId         | organizationClientId        | ❌           | Identifiant de l'organisation dans votre système. L'organisation désigne l'entité qui accueille le bénévole ou le volontaire.        |
| organizationName             | organizationName            | ⚠️          | Nom de l'organisation. Requis si un autre champ organization\* est renseigné.                                                        |
| organizationDescription      | organizationDescription     | ❌           | Description de l'organisation.                                                                                                       |
| organizationUrl              | organizationUrl             | ❌           | Lien de l'organisation (ex. page de présentation sur votre site).                                                                    |
| organizationType             | organizationType            | ❌           | Type de l'organisation.                                                                                                              |
| organizationLogo             | organizationLogo            | ❌           | URL de l'image de l'organisation.                                                                                                    |
| organizationRNA              | organizationRNA             | ❌           | Numéro RNA de l'organisation. Uniquement valable pour les organisations de type association.                                         |
| organizationSiren            | organizationSiren           | ❌           | SIREN de l'organisation.                                                                                                             |
| organizationSiret            | organizationSiret           | ❌           | SIRET de l'organisation.                                                                                                             |
| organizationFullAddress      | organizationFullAddress     | ❌           | Adresse de l'organisation. Pas de format strict attendu (contrairement à l'adresse de la mission).                                   |
| organizationPostCode         | organizationPostCode        | ❌           | Code postal de l'organisation.                                                                                                       |
| organizationCity             | organizationCity            | ❌           | Ville de l'organisation.                                                                                                             |
| organizationDepartmentCode   | organizationDepartmentCode  | ❌           | Code du département de l'organisation.                                                                                               |
| organizationDepartmentName   | organizationDepartmentName  | ❌           | Nom du département de l'organisation.                                                                                                |
| organizationStatusJuridique  | organizationStatusJuridique | ❌           | Statut juridique de l'organisation.                                                                                                  |
| organizationBeneficiaries\[] | organizationBeneficiaries   | ❌           | Bénéficiaires de l'organisation.                                                                                                     |
| organizationActions\[]       | organizationActions         | ❌           | Principales actions menées par l'organisation.                                                                                       |
| organizationReseaux\[]       | organizationReseaux         | ❌           | Réseau de l'organisation. Ce champ sert à renseigner les organisations ayant des antennes locales et dépendant d'un réseau national. |
