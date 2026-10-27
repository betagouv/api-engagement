# Spec technique — Diffusion des missions vers Hellowork (flux XML)

Statut : brouillon, à valider avec Hellowork (interface@hellowork.com) avant implémentation.
**Périmètre V1 : missions Service Civique uniquement.** Le bénévolat (JVA…) et le volontariat sapeurs-pompiers sont hors V1 (pas de contrat équivalent dans le référentiel Hellowork).
Source : « Hellowork XML Feed » (FLUX-RJ-SPEC, v. 2026/02/09).
Modèles de référence : `api/src/jobs/leboncoin/` (structure, curseur, diffusion) et `api/src/jobs/linkedin/` (mapping domaine, HTML).

## 1. Principe

Un job batch génère un flux XML public (HTTPS, UTF-8) que Hellowork **tire** toutes les 2 h. Pas d'API à appeler côté Hellowork.

Règles du flux imposées par Hellowork :

- Le flux contient **toutes** les offres actives. Une offre absente du flux alors qu'elle figurait dans le précédent est **supprimée** chez Hellowork.
- Le flux n'est pas validé par XSD, mais Hellowork fait des contrôles qualité (rejet possible, webhook `action=8`).
- Champs obligatoires : `Reference`, localisation (`Ville`, + code postal recommandé), type de contrat (`CritereContrat`), et `Email` ou `Url_Reponse`.

## 2. Architecture

Calquée sur leboncoin, avec **un seul flux** (pas de découpage par dispositif en V1).

```
api/src/jobs/hellowork/
  config.ts        # URL du flux, mappings (domaine → secteur, unités salaire, télétravail)
  types.ts         # HelloworkOffer (contenu d'un <offre>)
  transformers.ts  # missionToOffer(mission): HelloworkOffer | null
  utils.ts         # generateXML, storeXML, formatage dates, description HTML
  handler.ts       # HelloworkHandler
  __tests__/       # transformers.test.ts (+ intégration handler)
```

Éléments transverses à modifier :

| Élément | Changement |
| --- | --- |
| `api/src/config.ts` | Ajouter `PUBLISHER_IDS.HELLOWORK` (ids staging/prod distincts, comme `GRIMPIO`/`TALENT`) |
| `api/src/utils/xml.ts` | `buildFeedXml` code `<source>` en dur : ajouter un 3ᵉ paramètre optionnel `rootName = "source"` (rétrocompatible) pour produire `<root>` |
| `terraform/jobs.tf` | Nouveau `scaleway_job_definition "hellowork"` (copie de `leboncoin`, même cron) |
| `app/src/constants/index.jsx` | Vérifier si les diffuseurs y sont listés (leboncoin y apparaît) |
| Base | Créer le publisher Hellowork (type diffuseur) + règles `publisher-diffusion-rule` qui définissent son périmètre |

### 2.1 Handler

```ts
for await (const mission of getMissionsCursor(
  { diffuseurPublisherId: PUBLISHER_IDS.HELLOWORK, statusCode: "ACCEPTED" },
  { limit: HELLOWORK_MAX_OFFERS, orderBy: { createdAt: "desc" } }
)) { const offer = missionToOffer(mission); if (offer) offers.push(offer); }
```

- **Aucune restriction de périmètre dans le code** : `mission_diffusion` (HELLOWORK) décide seule des missions diffusées. La V1 Service Civique est donc portée par la configuration des règles de diffusion en base (publisher Hellowork limité au Service Civique), et le code formate selon le dispositif (§ 3.5).
- Le transformer ne sait formater que le Service Civique : une mission d'un autre dispositif retourne `null` (ignorée, comptée en `skipped`), car `CritereContrat` est obligatoire et n'a pas d'équivalent bénévolat. Élargir = ajouter un dispositif dans `DISPOSITIF_CONFIG`, comme leboncoin.
- **Quota temporaire** : `HELLOWORK_MAX_OFFERS = 500` (`limit` du curseur, missions les plus récentes) pour garder un échantillon lisible. À **retirer** une fois l'échantillon parti chez Hellowork. Le curseur borne les missions lues : les missions ignorées (`null`) réduisent d'autant le nombre d'offres émises (≤ 500).
- Stockage : S3 sous une URL **stable** `xml/hellowork.xml` (`BUCKET_URL`, ACL public-read), comme leboncoin. En `development` : écriture locale `hellowork.xml`.
- Trace : `importService.createImport({ name: "HELLOWORK", publisherId: HELLOWORK, createdCount, status })`, SUCCESS/FAILED, en try/catch isolé (cf. `recordImport` leboncoin).
- Cron : identique à leboncoin (`0 4 * * *`, Europe/Paris, quotidien), `timeout` 45 m, `--max-old-space-size=1800`. Hellowork relit le flux toutes les 2 h, donc le fichier S3 stable est lu plusieurs fois entre deux générations.

### 2.2 Échec du job

Pas de garde-fou sur le volume (décision). Seul comportement conservé, hérité du modèle leboncoin : si la génération lève une exception, rien n'est écrit sur S3 (le fichier précédent reste en ligne), l'import est tracé `FAILED` et l'erreur est capturée.

Rappel de risque, accepté : une offre absente du flux est supprimée chez Hellowork, donc un flux anormalement réduit (règles de diffusion modifiées, bug de filtre) dépublie les offres correspondantes à la lecture suivante.

## 3. Mapping des champs

Source : `MissionRecord` (`api/src/types/mission.ts`). Légende : ✅ direct, 🔧 transformation, ❓ décision requise (cf. § 5).

### 3.1 Identité et contenu

| Hellowork | Card. | Source | Notes |
| --- | --- | --- | --- |
| `Nom_Ese` | 1..1 | `organizationName` | 🔧 Clé d'identification de l'entreprise chez Hellowork (décision : nom réel de l'organisation). Skip si vide |
| `Agence` | 0..1 | `publisherName` | ✅ Statistiques uniquement : permet de distinguer l'origine (JVA, SC…) |
| `Reference` | 1..1 | `mission.id` (uuid) | ✅ Stable et unique, comme `partner_unique_reference` leboncoin. Pas `clientId` (non unique entre publishers) |
| `ExternalId` | 0..1 | `mission.id` | ✅ Renseigné dès la V1 : rend le webhook activable plus tard sans republier |
| `Poste` | 1..1 | `title` | 🔧 `trim` + espaces réduits (`truncateAtWord` si une limite est confirmée). **Service Civique** : préfixe « Service Civique - » sans doublon, cf. § 3.5 |
| `DescriptionEntreprise` | 0..1 | `organizationDescription` | 🔧 HTML restreint, cf. § 3.4 |
| `DescriptionPoste` | 0..1 | `descriptionHtml` ‖ `description` | 🔧 idem. Bloc complet de la mission |
| `Description` | 0..1 | — | **Ne pas utiliser** : 2 champs distincts disponibles |
| `Profil` | 0..1 | `requirements[]` (+ âge min.) | 🔧 liste `<ul><li>` . `openToMinors` ignoré en V1 : le bloc SC fixe indique déjà « 16 à 25 ans ». **Service Civique** : bloc fixe Hellowork en tête, cf. § 3.5 |
| `Salaire` | 0..1 | — | Non renseigné : l'indemnité Service Civique figure dans `Profil` (§ 3.5) |
| `Aveugle` | 0..1 | constante `0` | Offre non anonyme |
| `Email` / `Url_Reponse` | 1 des 2 | `getMissionTrackedApplicationUrl(mission, PUBLISHER_IDS.HELLOWORK)` | ✅ `Url_Reponse` uniquement (tracking de la redirection) |
| `DateAnnonce` | 0..1 | `postedAt ?? createdAt` | 🔧 `dd/MM/yyyy HH:mm:ss`, fuseau Europe/Paris |
| `DateModification` | 0..1 | `updatedAt` | 🔧 idem. Attention : doit refléter un vrai changement de contenu |
| `EmailContact`, `Source/*` | 0..1 | — | Non renseignés |

### 3.2 Localisation

| Hellowork | Source | Notes |
| --- | --- | --- |
| `Ville` (1..1, racine de l'offre) | 1ʳᵉ adresse valide (`postalCode` ET `city`) | Même règle que leboncoin ; **skip** si aucune adresse valide et mission non remote |
| `AdressesPostales/AdressePostale` (0..n) | `addresses[]` (celles avec ville + CP) | `Voie`←`street`, `CodePostal`←`postalCode`, `Ville`←`city`, `Departement`←`departmentName`, `Region`←`region`, `Pays`←`country` (« France » si `FR`/vide), `Latitude`/`Longitude`←`location` |
| Mission 100 % remote | — | `Ville` obligatoire : repli Paris 75001 comme leboncoin (`REMOTE_LOCATION`), **validé**. `Teletravail` = `Complet` |

Pas de plafond d'adresses : toutes les adresses valides de la mission sont émises dans `AdressesPostales`.

### 3.3 Critères

| Hellowork | Source | Mapping |
| --- | --- | --- |
| `CritereContrat` (1..1) | constante | `Stage` (libellé du référentiel, id 72), confirmé par Hellowork |
| `CritereSecteur` | `domain` | Table ci-dessous, **valeur émise = libellé**. Défaut : « Santé/Social/Association » |
| `CritereNiveau` (0..n) | — | Non renseigné (décision) |
| `CritereExperience` (0..n) | — | Non renseigné (décision) |
| `TempsComplet` | `schedule` | Bénévolat → `0`. Service Civique : omis (temps plein ou partiel) |
| `Teletravail` | `remote` | `full`→`Complet`, `possible`→`Partiel`, `no`/`local`/null→`Non` |
| `DureeContrat` | `duration` | Texte (« 6 mois »). **Obligatoire pour les contrats temporaires** : unité de `duration` à confirmer dans le schéma Prisma avant formatage |

`NiveauSalaire` : les missions Service Civique sont indemnisées et l'indemnité est décrite dans `Profil` (§ 3.5). Le nœud n'est donc émis que si `compensationAmount` est renseigné : `<NiveauSalaire Devise="EUR" Periodicite="…" Affichable="true">` + `SalaireMin`=`compensationAmount`, `SalaireMax`=`compensationAmountMax` ; `Periodicite` : `hour`→`HOUR`, `day`→`DAY`, `month`→`MONTH`, `year`→`YEAR` ; brut/net (`compensationType`) → `SalaireTexte`. Sinon nœud omis (tous ses champs sont optionnels).

Bloc `Mission` (optionnel) : `StartDate`←`startAt`, `EndDate`←`endAt` (ISO 8601), `Duration/Value`+`Unit` (si l'unité de `duration` est connue), `Shift` omis. ❓ `EndDate` = date de fin de mission ou d'expiration de l'offre ? (cf. `expirationDate` LinkedIn). Ne pas publier une offre dont `endAt` est dépassé.

Proposition `domain` → `CritereSecteur` (slugs de `DOMAIN_BUSINESS_SECTOR` leboncoin). La valeur émise est le **libellé** exact du référentiel (§ 3.2 du PDF) ; l'id n'est là qu'en référence :

| `domain` | id (réf.) | Libellé émis |
| --- | --- | --- |
| `solidarite-insertion`, `sante`, `vivre-ensemble`, `humanitaire`, `animaux`, `autre` (défaut) | 142 | Santé/Social/Association |
| `education`, `recherche` | 183 | Enseignement/Formation |
| `culture-loisirs`, `sport` | 190 | Tourisme/Hôtellerie/Loisirs |
| `environnement` | 188 | Secteur Energie/Environnement |
| `service-public-defense-securite` | 136 | Service public d'état |
| `citoyennete-europeenne`, `prevention-protection`, `memoire-et-citoyennete` | 193 | Service public autres |
| `batiment-industrie-logistique` | 137 | BTP |
| `benevolat-competences`, `emploi` | 152 | Services aux Entreprises |
| `communication` | 141 | Média/Internet/Communication |
| `gestion-finance-droit` | 143 | Banque/Assurance/Finance |
| `numerique` | 145 | Secteur informatique/ESN |

La table est une proposition à faire relire par le métier. Valeurs en libellés (décision), conformément à l'exemple XML du PDF ; attention, un libellé de l'exemple (« Distribution et entretien automobile ») n'existe pas au référentiel : n'émettre que des libellés du référentiel, avec la graphie exacte (accents, `/`). Casse des balises : suivre l'exemple (`offre`, `EMail`) ; à confirmer dans l'échantillon envoyé à Hellowork.

### 3.4 Texte et HTML

Hellowork n'interprète que `<b> <i> <br> <p> <ul> <ol> <li>`. Les champs texte sont en CDATA (`CDATA_KEYS` de `buildFeedXml`).

`descriptionHtml` contient potentiellement des `<a>`, `<h2>`, `<img>`, `<span>`… Pas de lib de sanitization installée (seulement `html-to-text`). Approche minimale, **sans nouvelle dépendance** :

1. Réutiliser `stripHtml` de `jobs/leboncoin/utils.ts` (à déplacer vers `src/utils/` s'il est partagé) → texte brut, sauts de ligne conservés.
2. Reconstruire : paragraphes séparés par `\n\n` → `<p>…</p>`, `\n` simple → `<br>`.
3. `requirements[]` → `<ul><li>` générés par nous (contenu échappé).

Limite : on perd gras/listes de la source. À ré-évaluer (liste blanche via `html-to-text` ou `sanitize-html`) si Hellowork juge le rendu pauvre.

### 3.5 Règles Service Civique (confirmées par Hellowork)

Dispositif détecté par `publisherId === PUBLISHER_IDS.SERVICE_CIVIQUE` ; le formatage (contrat, titre, `Profil`) en découle. Autre publisher : mission ignorée (§ 2.1).

1. **Rubrique** : `CritereContrat` = `Stage`.
2. **Titre** : toujours commencer par « Service Civique ». Ne pas préfixer si le titre commence déjà par « Service civique », y compris entre guillemets (« "Service civique - …" », « “Service civique” … »).
   - Test de détection : après `trim`, retirer les guillemets/espaces initiaux (`"`, `'`, `«`, `»`, `“`, `”`) puis tester `/^service\s+civique\b/i`. Si oui, titre conservé tel quel, sinon `Service Civique - {titre}`.
   - Écart avec `buildScTitle` (leboncoin) qui préfixe toujours : extraire un helper partagé avec la garde anti-doublon. Le même doublon existe sans doute côté leboncoin ; à corriger en passant ou dans une PR séparée.
3. **Profil recherché** (`Profil`) : le texte de la maquette, **en entier**, en tête de chaque offre SC, puis les `requirements[]` de la mission s'il y en a.

```html
<p>Pour postuler à un Service Civique, vous devez obligatoirement :</p>
<ul>
  <li>Avoir 16 à 25 ans (jusqu'à 30 ans, pour les personnes en situation de handicap)</li>
  <li>Être ressortissant français, UE (ou hors UE avec titre de séjour valide)</li>
</ul>
<p>L'indemnité mensuelle s'élève à 619,83 € nets (non imposable), avec une majoration possible selon votre situation.</p>
<p>Le Service Civique permet de réaliser des missions dans différents domaines d'actions, pour se sentir utile, acquérir des compétences ou se découvrir.</p>
```

   - Constante `SC_PROFIL_HTML` dans `config.ts`. Le montant de l'indemnité (619,83 €) est en dur : le centraliser pour le mettre à jour d'un seul endroit (leboncoin indique 620 € dans `SC_INTRO`).
   - Les missions SC étant indemnisées, l'indemnité est portée par ce bloc `Profil` (pas de `Salaire`).
4. `TempsComplet` omis, `DureeContrat` = `duration` (obligatoire seulement pour les contrats temporaires selon le PDF ; à émettre si l'unité de `duration` est confirmée).

## 4. Exemple de sortie

```xml
<?xml version="1.0" encoding="UTF-8"?>
<root>
  <offre>
    <Nom_Ese><![CDATA[Croix-Rouge française]]></Nom_Ese>
    <Agence><![CDATA[JeVeuxAider.gouv.fr]]></Agence>
    <Reference><![CDATA[0b7c…]]></Reference>
    <ExternalId><![CDATA[0b7c…]]></ExternalId>
    <Poste><![CDATA[Aide aux devoirs]]></Poste>
    <DescriptionEntreprise><![CDATA[<p>…</p>]]></DescriptionEntreprise>
    <DescriptionPoste><![CDATA[<p>…</p>]]></DescriptionPoste>
    <Profil><![CDATA[<ul><li>…</li></ul>]]></Profil>
    <Ville><![CDATA[Rennes]]></Ville>
    <AdressesPostales>
      <AdressePostale>
        <CodePostal>35000</CodePostal><Ville>Rennes</Ville>
        <Departement>Ille-et-Vilaine</Departement><Pays>France</Pays>
        <Latitude>48.11</Latitude><Longitude>-1.68</Longitude>
      </AdressePostale>
    </AdressesPostales>
    <NiveauSalaire Affichable="false"/>
    <Url_Reponse><![CDATA[https://api.api-engagement.beta.gouv.fr/r/…]]></Url_Reponse>
    <Aveugle>0</Aveugle>
    <DateAnnonce>23/10/2026 12:33:46</DateAnnonce>
    <DateModification>25/10/2026 09:02:11</DateModification>
    <Criteres>
      <CritereSecteur>Santé/Social/Association</CritereSecteur>
      <CritereContrat>Stage</CritereContrat>
      <Teletravail>Non</Teletravail>
      <Teletravail>Non</Teletravail>
    </Criteres>
  </offre>
</root>
```

Attributs : `buildFeedXml` instancie `XMLBuilder` avec `ignoreAttributes: false`, donc `NiveauSalaire: { "@_Devise": "EUR", … }`.

## 5. Décisions et points restants

Décisions prises (réponses Hellowork / produit) :

| # | Sujet | Décision |
| --- | --- | --- |
| Q1 / Q1bis | Contrat | V1 **Service Civique uniquement**, `CritereContrat` = `Stage` ; bénévolat hors V1 |
| Q2 | `Nom_Ese` | `organizationName` |
| Q3 | Critères | Valeurs en **libellés** du référentiel |
| Q4 | Rémunération | Missions SC indemnisées : indemnité dans `Profil`, pas de `Salaire` |
| Q5 | Remote sans adresse | Repli Paris 75001 |
| Q6 | Expérience / niveau | Omis |
| Q7 | Périmètre | Aucune restriction dans le code : `mission_diffusion` décide ; le code formate par dispositif (SC seul géré en V1, autres ignorés) |
| — | Casse / libellés des balises | Ceux de l'exemple XML du PDF |
| — | Adresses | Pas de plafond |
| — | Quota | 500 offres, temporaire (retiré après envoi de l'échantillon) |
| — | Cron | Identique à leboncoin |
| — | Garde-fou volume | Aucun (§ 2.2) |
| Q8 | Webhook | Hors scope |

Restent à confirmer avec Hellowork lors de l'envoi de l'échantillon :

- Q9 : environnement de recette, ou validation par envoi d'un échantillon à interface@hellowork.com.
- Unité de `duration` avant d'émettre `DureeContrat` / `Mission/Duration`.

## 6. Hors périmètre V1

- Webhook de statut (`webhook.aspx`) : prévoir ensuite un endpoint qui renseigne `jobBoards` (`MissionJobBoard`) et un job d'alerte Slack des refus qualité (modèle `leboncoin-alerts`). `ExternalId` est déjà émis pour ça.
- Bénévolat (JVA, partenaires) et sapeurs-pompiers : attendent un contrat Hellowork adapté (ancienne Q1bis).
- Mapping `CritereNiveau` / `CritereExperience`.
- Conservation du gras et des listes de la description source.
- Un flux par dispositif (inutile : un seul flux Hellowork).

## 7. Tests

- Unitaires `__tests__/transformers.test.ts` (modèle leboncoin, mock de `getMissionTrackedApplicationUrl`) : mission nominale, skip sans organisation / sans adresse valide, remote full, mapping domaine + défaut, rémunération présente/absente, formats de dates, échappement du HTML.
- Unitaire `generateXML` : racine `<root>`, CDATA, attributs `NiveauSalaire`.
- Intégration handler (modèle `leboncoin.handler.test.ts`) : filtre `mission_diffusion`, quota de 500, mission non-SC ignorée, échec du job → pas d'écriture S3.
- Recette : exécuter `npm run job -- hellowork` en dev (écrit `hellowork.xml`) puis faire valider par Hellowork avant le premier cron.

## 8. Plan de livraison

1. Faire valider l'échantillon par Hellowork (casse des balises, libellés) (envoi d'un flux d'exemple généré en dev).
2. PR 1 : config + `buildFeedXml(rootName)` + job + tests.
3. PR 2 : terraform + publisher/règles de diffusion en staging, recette, puis production.
