# Format du flux XML

## 1. Architecture du fichier XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<source>
   <publisher>Example Job Site</publisher>
   <publisherurl><http://www.examplemissionsite.com></publisherurl>
   <lastBuildDate>Fri, 10 March 2020 22:49:39 GMT</lastBuildDate>
   <mission>
      <title><![CDATA[Sales Executive]]></title>
      <clientId><![CDATA[32132143]]></clientId>
			{...}
      <organizationFullAddress><![CDATA[55 Rue du Faubourg Saint-Honoré 75008 Paris]]></organizationFullAddress>
   </mission>
    [...]
</source>
```

## 2. Règles de fonctionnement du flux

Le flux XML doit contenir **l’ensemble des missions actives**.

### Synchronisation avec l’API Engagement

* Toute mission présente dans le flux et absente de l’API → **est créée**
* Toute mission présente dans le flux et déjà existante → **est mise à jour**
* Toute mission absente du flux mais existante dans l’API → **est supprimée**

👉 Le flux agit donc comme une **source de vérité complète** (logique de synchronisation totale)

### Contraintes de format

* Le flux doit respecter le **modèle de données de l’API Engagement**
* Le fichier doit être encodé en **UTF-8**
* Les champs textuels doivent être encapsulés dans des balises **CDATA**
* Une mission = une balise `<mission>`
* Les champs multiples doivent être structurés en **sous-balises XML** (et non en texte concaténé)

## 3. Exemple de fichier XML avec encodage UTF-8

```xml
<?xml version="1.0" encoding="UTF-8"?>
<source>
  <publisher>Example Job Site</publisher>
  <publisherurl>http://www.examplemissionsite.com</publisherurl>
  <lastBuildDate>Fri, 10 March 2020 22:49:39 GMT</lastBuildDate>

  <mission>
    <title><![CDATA[Sales Executive]]></title>
    <clientId><![CDATA[32132143]]></clientId>

    <description><![CDATA[
      Do you have 1-3 years of experience (...) sign up !
    ]]></description>

    <applicationUrl><![CDATA[https://www.urltomymission.org]]></applicationUrl>

    <postedAt><![CDATA[2005-12-10T22:49:39.000Z]]></postedAt>
    <startAt><![CDATA[2005-12-10T22:49:39.000Z]]></startAt>
    <endAt><![CDATA[2005-12-20T22:49:39.000Z]]></endAt>

    <addresses>
      <address>
        <street><![CDATA[46 Rue Saint-Antoine]]></street>
        <postalCode><![CDATA[75004]]></postalCode>
        <city><![CDATA[Paris]]></city>
        <departmentCode><![CDATA[75]]></departmentCode>
        <departmentName><![CDATA[Paris]]></departmentName>
        <region><![CDATA[Île-de-France]]></region>
        <country><![CDATA[France]]></country>
      </address>

      <address>
        <street><![CDATA[Quai de Loire]]></street>
        <postalCode><![CDATA[45000]]></postalCode>
        <city><![CDATA[Orléans]]></city>
        <departmentCode><![CDATA[45]]></departmentCode>
        <departmentName><![CDATA[Loiret]]></departmentName>
        <region><![CDATA[Centre-Val de Loire]]></region>
        <country><![CDATA[France]]></country>
      </address>
    </addresses>

    <places><![CDATA[2]]></places>

    <activities>
      <activity><![CDATA[logistique]]></activity>
    </activities>

    <remote><![CDATA[full]]></remote>
    <domain><![CDATA[environnement]]></domain>

    <tags>
      <tag><![CDATA[environnement]]></tag>
      <tag><![CDATA[écologie]]></tag>
    </tags>

    <image><![CDATA[https://monurl.com/1.jpg]]></image>

    <organizationName><![CDATA[Big ABC Corporation]]></organizationName>
    <organizationRNA><![CDATA[W922000733]]></organizationRNA>
    <organizationSiren><![CDATA[332737394]]></organizationSiren>
    <organizationUrl><![CDATA[https://www.organizationname.com]]></organizationUrl>
    <organizationClientId><![CDATA[123312321]]></organizationClientId>
    <organizationType><![CDATA[Association déclarée]]></organizationType>
    <organizationFullAddress><![CDATA[55 Rue du Faubourg Saint-Honoré 75008 Paris]]></organizationFullAddress>
    <organizationStatusJuridique><![CDATA[Association]]></organizationStatusJuridique>

    <compensationAmount><![CDATA[100]]></compensationAmount>
    <compensationUnit><![CDATA[day]]></compensationUnit>
    <compensationType><![CDATA[net]]></compensationType>

  </mission>
</source>
```

