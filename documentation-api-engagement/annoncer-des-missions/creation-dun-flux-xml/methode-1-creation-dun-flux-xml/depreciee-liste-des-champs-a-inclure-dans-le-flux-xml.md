---
hidden: true
---

# Dépreciée - Liste des champs à inclure dans le flux XML

## Champs principaux



| Nom du champs    | Type     | Description                                                                   |
| ---------------- | -------- | ----------------------------------------------------------------------------- |
| `clientId`       | `String` | Identifiant de la mission. <mark style="color:red;">**Requis**</mark>         |
| `title`          | `String` | Titre de votre mission. <mark style="color:red;">**Requis**</mark>            |
| `applicationUrl` | `String` | Lien de candidature de la mission. <mark style="color:red;">**Requis**</mark> |
| `postedAt`       | `Date`   | Date à laquelle la mission a été postée. Défaut `now()`                       |
| `startAt`        | `Date`   | Date de début de la mission. Défaut `now()`                                   |
| `endAt`          | `Date`   | Date de fin de la mission                                                     |

## Caractéristiques de la mission

<table><thead><tr><th width="296">Nom du champs</th><th width="119">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>description</code></td><td><code>String</code></td><td>La description de votre mission, peut contenir des balises HTML. <mark style="color:red;"><strong>Requis</strong></mark></td></tr><tr><td><code>domain</code></td><td><code>String</code></td><td><p>Domaine de la mission.</p><p></p><p><strong>1 valeur possible parmi :</strong></p><p><code>"environnement"</code>,</p><p><code>"solidarite-insertion"</code>,</p><p><code>"prevention-protection"</code>,</p><p><code>"sante"</code>,</p><p><code>"culture-loisirs"</code>,</p><p><code>"education"</code>,</p><p><code>"emploi"</code>,</p><p><code>"sport"</code>,</p><p><code>"humanitaire"</code>, </p><p><code>"animaux"</code>,</p><p><code>"vivre-ensemble"</code>,</p><p><code>"memoire-et-citoyennete"</code>,</p><p><code>"benevolat-competences"</code>, ou <code>"autre"</code></p></td></tr><tr><td><code>activity</code></td><td><code>String</code></td><td><p>Activité de la mission.</p><p></p><p><strong>1 valeur possible parmi :</strong><br><code>"accueil-de-public"</code>,<br><code>"aide-psychologique"</code>,<br><code>"activites-manuelles"</code>,<br><code>"alphabetisation"</code>,<br><code>"animation"</code>,<br><code>"Animation, Valorisation"</code>,<br><code>"art"</code>,<br><code>"autre"</code>,<br><code>"bricolage"</code>,<br><code>"collecte"</code>,<br><code>"communication"</code>,<br><code>"comptabilite-finance"</code>,<br><code>"conseil"</code>,<br><code>"distribution"</code>,<br><code>"documentation-traduction"</code>,<br><code>"ecoute-permanence"</code>,</p><p><code>"encadrement-d-equipes"</code> ,</p><p><code>"enseignement-formation"</code>,</p><p><code>"gestion-de-projets"</code>,<br><code>"gestion-recherche-des-partenariats"</code>,<br><code>"informatique"</code>,<br><code>"jardinage"</code>,<br><code>"juridique"</code>,<br><code>"logistique"</code>,<br><code>"lutte-contre-isolement"</code>,<br><code>"Médiation, Information"</code>,<br><code>"mentorat-parrainage"</code>,<br><code>"mission-internationale"</code>,<br><code>"Préservation, Patrimoine"</code>,<br><code>"Prévention, Sensibilisation"</code>,<br><code>"ramassage-dechets"</code>,<br><code>"recrutement"</code>,<br><code>"responsabilites-associatives"</code>,<br><code>"sante-soins"</code>,<br><code>"Secours, Aide"</code>,<br><code>"secourisme"</code>,<br><code>"sensibilisation"</code>,<br><code>"soins-animaux"</code>,<br><code>"Soutien, Accompagnement"</code>,<br><code>"soutien-scolaire"</code>,<br><code>"sport"</code>,<br><code>"taches-administratives"</code>,<br><code>"Transmission, Pédagogie"</code>,<br><code>"visites"</code></p></td></tr><tr><td><code>schedule</code></td><td><code>String</code></td><td>Rythme de la mission.<br><br><strong>Exemple</strong> : "1 demi-journée par semaine"</td></tr><tr><td><code>places</code></td><td><code>Number</code></td><td>Nombre de places disposnibles pour la mission<br>Défaut <code>1</code></td></tr><tr><td><code>remote</code></td><td><code>String</code></td><td><p>Mission disponible en distanciel.</p><p></p><p><strong>Valeurs possibles:</strong></p><p><code>"possible"</code>, <code>"full"</code> ou <code>"no"</code></p></td></tr><tr><td><code>image</code></td><td><code>String</code></td><td>Lien url de l'image de la mission. Si vous n'en fournissez pas, l'API Engagement utilisera l'une des images de sa bibliothèque en fonction du domaine.</td></tr><tr><td><code>audience</code></td><td><code>String[]</code></td><td>Les bénéficiaires de la mission / à qui la mission s'adresse.<br>Exemple 1: <code>"Tous publics"</code><br>Exemple 2: <code>"Jeunes, Adultes"</code></td></tr><tr><td><code>softSkills</code></td><td><code>String[]</code></td><td>Les compétences générales requises pour la mission<br>Exemple : <code>"Écoute active, Communication orale"</code></td></tr><tr><td><code>romeSkills</code></td><td><code>String[]</code></td><td>Codes métiers (référentiel ROME 4.0) </td></tr><tr><td><code>requirements</code></td><td><code>String[]</code></td><td>Pré-requis relatifs à la mission</td></tr><tr><td><code>reducedMobilityAccessible</code></td><td><code>String</code></td><td><p>Mission accessible pour les personnes à mobilité réduite. </p><p></p><p><strong>Valeurs possibles:</strong></p><p><code>"yes"</code> ou <code>"no"</code></p></td></tr><tr><td><code>closeToTransport</code></td><td><code>String</code></td><td><p>Mission proche des transports en commun.</p><p></p><p><strong>Valeurs possibles:</strong></p><p><code>"yes"</code> ou <code>"no"</code></p></td></tr><tr><td><code>openToMinors</code></td><td><code>String</code></td><td><p>Mission ouverte aux mineurs.</p><p> </p><p><strong>Valeurs possibles:</strong></p><p><code>"yes"</code> ou <code>"no"</code></p></td></tr><tr><td><code>tags</code></td><td><code>String[]</code></td><td>Ce champs permet de tagguer vos missions avec un, ou plusieurs mots-clés personnalisés séparés par une virgule, dans l’API.<br><br>Exemple 1: <code>"Ecologie"</code><br>Exemple 2: <code>"Ecologie, Sport, Solidarité"</code></td></tr><tr><td><code>priority</code></td><td><code>String</code></td><td>Priorité de la mission</td></tr><tr><td><code>metadata</code></td><td><code>String</code></td><td>Métadata de la mission</td></tr></tbody></table>

## Champs géographiques de la mission

Il s’agit de l’ensemble des localisations où se déroulent la mission.

Si vos missions se tiennent dans plusieurs lieux alors vous pouvez renseigner ces localisations dans le champs `addresses` qui est un tableau d'objects contenant le détail géographique de chaque mission.

Si vos missions ne se tiennent dans un lieu unique, vous ne renseignez qu'une seule adresse dans le tableau `addresses`.

_Exemple d'une mission avec une adresse unique_

```xml
<addresses>
  <address>
    <street><![CDATA[10 rue de la Paix]]></street>
    <postalCode><![CDATA[75001]]></postalCode>
    <city><![CDATA[Paris]]></city>
    <departmentCode><![CDATA[75]]></departmentCode>
    <departmentName><![CDATA[Paris]]></departmentName>
    <region><![CDATA[Centre-Val de Loire]]></region>
    <country><![CDATA[FR]]></country>
    <location>
      <lat><![CDATA[47.8951]]></lat>
      <lon><![CDATA[1.9108]]></lon>
    </location>
  </address>
</addresses>
```

_Exemple d'une mission avec plusieurs addresses_

```xml
<addresses>
  <address>
    <street><![CDATA[10 rue de la Paix]]></street>
    <postalCode><![CDATA[75001]]></postalCode>
    <city><![CDATA[Paris]]></city>
    <departmentCode><![CDATA[75]]></departmentCode>
    <departmentName><![CDATA[Paris]]></departmentName>
    <region><![CDATA[Centre-Val de Loire]]></region>
    <country><![CDATA[FR]]></country>
    <location>
      <lat><![CDATA[47.8951]]></lat>
      <lon><![CDATA[1.9108]]></lon>
    </location>
  </address>
  
  <address>
    <street><![CDATA[Port de Loire]]></street>
    <postalCode><![CDATA[45110]]></postalCode>
    <city><![CDATA[Châteauneuf-sur-Loire]]></city>
    <departmentCode><![CDATA[45]]></departmentCode>
    <departmentName><![CDATA[Loiret]]></departmentName>
    <region><![CDATA[Île-de-France]]></region>
    <country><![CDATA[FR]]></country>
    <location>
      <lat><![CDATA[48.8698]]></lat>
      <lon><![CDATA[2.3322]]></lon>
    </location>
  </address>
  
  <address>
    <street><![CDATA[20 rue Victor Hugo]]></street>
    <postalCode><![CDATA[59000]]></postalCode>
    <city><![CDATA[Lille]]></city>
    <departmentCode><![CDATA[59]]></departmentCode>
    <departmentName><![CDATA[Nord]]></departmentName>
    <region><![CDATA[Hauts-de-France]]></region>
    <country><![CDATA[FR]]></country>
  </address>
</addresses>
```

| Nom du champ | Type        | Description                                                                                                                                                    |
| ------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `addresses`  | `Address[]` | <p>Tableau des adresses où se déroule la mission. Chaque objet représente une adresse distincte.<br><br><br>Veuillez vous référer au tableau ci-dessous ⬇️</p> |

Une adresse se compose des champs suivants :&#x20;

<table><thead><tr><th width="209">Nom du champ</th><th>Type</th><th>Description</th></tr></thead><tbody><tr><td><code>street</code></td><td><code>String</code></td><td>Rue où se déroule la mission.<br><br>Exemple: <code>46 Rue Saint-Antoine</code></td></tr><tr><td><code>postalCode</code></td><td><code>String</code></td><td>Code postal où se déroule la mission<br><br>Exemple: <code>75004</code></td></tr><tr><td><code>city</code></td><td><code>String</code></td><td>Ville où se déroule la mission<br><br>Exemple: <code>Paris</code> </td></tr><tr><td><code>departmentCode</code></td><td><code>String</code></td><td>Numéro de département où se déroule la mission.<br><br>Exemple: <code>75</code></td></tr><tr><td><code>departmentName</code></td><td><code>String</code></td><td>Nom du département où se déroule la mission</td></tr><tr><td><code>region</code></td><td><code>String</code></td><td>Région où se déroule la mission</td></tr><tr><td><code>country</code></td><td><code>String</code></td><td><a href="https://fr.wikipedia.org/wiki/ISO_3166-1">Code ISO 2</a> du pays de la mission<br>Défaut <code>FR</code></td></tr><tr><td><code>location</code></td><td><code>{lat:number;lon:number}</code></td><td>Composé de <code>lat</code> et <code>lon</code> de type <code>Number</code> représentant la latitude et longitude de l'adresse de la mission<br><br>Si la longitude et la latitude ne sont pas fournies ou sont incorrectes, l'API utilise l'<a href="https://adresse.data.gouv.fr/api-doc/adresse">api-adresse</a> pour obtenir ces valeurs. La mission est géolocalisée si au moins l'un des champs suivants est renseigné : <code>adresse</code>, <code>ville</code> ou <code>code postal</code>.</td></tr></tbody></table>

## Champs de l'organisation ou de la structure d'accueil

<table><thead><tr><th width="291">Nom du champ</th><th width="156">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>organizationName</code></td><td><code>String</code></td><td>Nom de l'organisation de la mission</td></tr><tr><td><code>organizationRNA</code></td><td><code>String</code></td><td>RNA de l'organisation de la mission <mark style="color:red;"><strong>Requis (ou organizationSiren)</strong></mark></td></tr><tr><td><code>organizationSiren</code></td><td><code>String</code></td><td>Siren de l'organisation de la mission <mark style="color:red;"><strong>Requis (ou organizationRNA)</strong></mark></td></tr><tr><td><code>organizationUrl</code></td><td><code>String</code></td><td><p>Lien de l'organisation de la mission. </p><p>Il peut s'agir de la page de présentation de l'organisation sur votre site par exemple.</p></td></tr><tr><td><code>organizationLogo</code></td><td><code>String</code></td><td>Lien de l'image de l'organisation de la mission</td></tr><tr><td><code>organizationDescription</code></td><td><code>String</code></td><td>Description de l'organisation de la mission</td></tr><tr><td><code>organizationClientId</code></td><td><code>String</code></td><td>Identifiant de l'organisation de la mission</td></tr><tr><td><code>organizationStatusJuridique</code></td><td><code>String</code></td><td>Statut juridique de l'organisation de la mission</td></tr><tr><td><code>organizationType</code></td><td><code>String</code></td><td>Type de l'organisation de la mission<br>Exemple 1: <code>"Association déclarée"</code><br>Exemple 2: <code>"Association internationale"</code></td></tr><tr><td><code>organizationActions</code></td><td><code>String[]</code></td><td>Actions de l'organisation de la mission<br>Exemple : <code>"Animation, Valorisation, Préservation"</code></td></tr><tr><td><code>organizationFullAddress</code></td><td><code>String</code></td><td>Adresse de l'organisation de la mission</td></tr><tr><td><code>organizationPostCode</code></td><td><code>String</code></td><td>Code postal de l'organisation de la mission</td></tr><tr><td><code>organizationCity</code></td><td><code>String</code></td><td>Ville de l'organisation de la mission</td></tr><tr><td><code>organizationBeneficiaries</code></td><td><code>String[]</code></td><td>Bénéficiaires de l'organisation de la mission</td></tr><tr><td><code>organizationReseaux</code></td><td><code>String[]</code></td><td>Réseau de l'organisation de la mission</td></tr></tbody></table>

## Champs d'indemnisation

<table><thead><tr><th width="291">Nom du champ</th><th width="156">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>compensationAmount</code></td><td><code>Number</code></td><td>Montant de l'indemnisation</td></tr><tr><td><code>compensationUnit</code></td><td><code>String</code></td><td><p>Période de l'indemnisation pour le montant fourni<br><br><strong>Valeurs possibles:</strong></p><p><code>"hour"</code>, <code>"day"</code>, <code>"month"</code>, <code>"year"</code></p></td></tr><tr><td><code>compensationType</code></td><td><code>String</code></td><td><p>Type d'indemnisation (brute ou nette). <br><br><strong>Valeurs possibles:</strong></p><p><code>"gross"</code>, <code>"net"</code></p></td></tr></tbody></table>

**Exemple :**&#x20;

Pour une indemnisation de 10 € brut de l'heure, renseignez :&#x20;

* `compensationAmount`: `10`
* `compensationUnit`: `"hour"`
* `compensationType`: `"gross"`
