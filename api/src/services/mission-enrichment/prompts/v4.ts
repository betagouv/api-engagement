import type { TaxonomyGuidanceMap } from "./types";
import { ENRICHMENT_SCHEMA, MODEL, TEMPERATURE, buildFilteredTaxonomyBlock, buildTaxonomyGuidanceBlock, buildUserMessage } from "./v2";

export const VERSION = "v4";
export { ENRICHMENT_SCHEMA, MODEL, TEMPERATURE, buildUserMessage };

// ─── Guidance V4 ─────────────────────────────────────────────────────────────
// Modifications par rapport à V2 :
//   - type_mission : distingue durée totale vs intensité hebdomadaire ; régulière = valeur par défaut
//   - domaine.gestion_projet : exclut les tâches périphériques (tutorat, réunions)
//   - competence_rome.communication_creation_numerique : exige un ancrage textuel explicite
//   - engagement_intent.cadre_engage : liste d'exclusions explicites (SC, VSI, SNU)
//   - engagement_intent.support_organisation : distingue de aide_directe sur les missions de médiation

const TAXONOMY_GUIDANCE_MAP = {
  domaine: {
    taxonomy:
      "Correspond au sujet principal de la mission. Priorise ce que la personne va réellement faire dans ses tâches principales. Ne choisis pas un domaine uniquement à partir du type de structure, du vocabulaire institutionnel, du public bénéficiaire ou de la finalité sociale générale du projet si les tâches décrites relèvent surtout d'un autre domaine.",
    values: {
      sante_soins: "À utiliser quand la mission porte principalement sur la santé, les soins, la prévention, l'accompagnement médico-social ou le bien-être physique et psychique.",
      social_solidarite:
        "À utiliser quand les tâches principales sont centrées sur l'entraide, l'accompagnement social, l'inclusion, la lutte contre l'isolement ou le soutien à des publics fragilisés. Ne pas l'utiliser uniquement parce que l'organisation porte un projet social ou vise des publics fragilisés si le rôle décrit est surtout de coordination, d'organisation ou de pilotage.",
      environnement_nature:
        "À utiliser pour les missions liées à la protection de l'environnement, la biodiversité, la transition écologique, le recyclage ou les actions liées à la nature.",
      sport_animation: "À utiliser quand l'activité principale concerne l'encadrement, l'organisation ou l'animation d'activités sportives.",
      culture_arts:
        "À utiliser pour les missions centrées sur la création artistique, la médiation culturelle au sens patrimonial ou artistique, l'organisation d'événements culturels ou la valorisation du patrimoine. Ne pas l'utiliser automatiquement pour une mission de médiation ou de vulgarisation si le contenu principal est scientifique, technique, éducatif ou citoyen.",
      education_transmission: "À utiliser quand la mission consiste surtout à transmettre des savoirs, former, sensibiliser, accompagner l'apprentissage ou faire de la pédagogie.",
      securite_defense: "À utiliser pour les missions liées à la protection, la sécurité civile, la défense, l'ordre public ou les interventions structurées de sécurité.",
      international_humanitaire:
        "À utiliser lorsque la mission concerne principalement l'action humanitaire, la solidarité internationale ou un projet à dimension internationale explicite.",
      // V4 : exclut les tâches périphériques (tutorat, réunions d'équipe, rapport de bilan)
      gestion_projet:
        "À utiliser quand la mission consiste principalement à coordonner, planifier, organiser, suivre un projet, des ressources, des partenaires, un planning ou des livrables. Le cœur des tâches décrites doit être le pilotage ou la planification. Ne pas attribuer si les éléments de gestion sont périphériques : lien avec le tuteur, rapport de bilan, participation aux réunions d'équipe ou remontée d'informations ne suffisent pas.",
    },
  },
  secteur_activite: {
    taxonomy:
      "Décrit le secteur professionnel ou d'activité auquel la mission se rattache le mieux. Peut coexister avec le domaine ; ne pas le confondre avec l'intention d'engagement ou les compétences mobilisées.",
    values: {
      sante_social_aide_personne: "À utiliser pour les missions relevant des soins, de l'accompagnement social, du médico-social ou de l'aide aux personnes.",
      education_formation_animation: "À utiliser pour les missions d'enseignement, de transmission, d'animation éducative ou de formation.",
      securite_service_public: "À utiliser pour les missions liées à la sécurité, la prévention, la protection civile ou le service public institutionnel.",
      environnement_agriculture: "À utiliser pour les missions touchant à l'écologie, l'environnement, l'agriculture, la nature ou la gestion des ressources naturelles.",
      culture_creation_medias: "À utiliser pour les missions artistiques, culturelles, éditoriales, audiovisuelles ou de médiation culturelle.",
      numerique_communication: "À utiliser pour les missions de développement, communication digitale, production de contenus, animation web ou outils numériques.",
      batiment_industrie_logistique: "À utiliser pour les missions techniques, de fabrication, de maintenance, de manutention, de chantier ou de logistique.",
      gestion_commerce_organisation:
        "À utiliser pour les missions centrées sur la coordination, l'administration, l'organisation, la gestion, le pilotage ou la relation commerciale.",
    },
  },
  type_mission: {
    // V4 : le résumé intègre la notion d'intensité hebdomadaire vs durée totale
    taxonomy:
      "Décrit le format temporel ou l'intensité de la mission. Se baser sur les indices explicites de fréquence, de volume horaire, de période ou de rythme d'engagement. Le critère déterminant pour distinguer régulière de temps_plein est l'intensité HEBDOMADAIRE, pas la durée totale. Si une durée totale est indiquée sans précision hebdomadaire, estime l'intensité en divisant par le nombre de semaines. En l'absence d'information sur le rythme, régulière est la valeur par défaut pour tout engagement s'étalant dans le temps.",
    values: {
      // V4 : ajoute le cas du volume horaire total faible
      ponctuelle:
        "À utiliser si la mission dure de quelques heures à deux jours maximum, sans notion de répétition. Une action unique, un événement, une date précise, un week-end isolé ou un volume horaire total très faible (moins de 10h) sans rythme régulier relèvent de cette catégorie.",
      // V4 : ajoute la logique durée totale / intensité hebdomadaire + valeur par défaut
      reguliere:
        "À utiliser si la mission s'étale sur plusieurs semaines ou mois, avec des interventions répétées, ou si le volume hebdomadaire est inférieur à 20h sur une durée d'au moins 2 semaines. Si une durée totale est indiquée sans précision hebdomadaire (ex : « 24h au total sur 6 mois »), estime l'intensité en divisant par le nombre de semaines — si le résultat est inférieur à 20h/semaine, c'est régulière. C'est la valeur par défaut pour tout engagement qui s'étale dans le temps sans intensité temps plein explicite.",
      // V4 : clarifie que le critère est l'intensité hebdomadaire, pas la durée totale
      temps_plein:
        "À utiliser si la mission dure au moins 3 semaines ET implique explicitement au moins 20h par semaine. Le critère déterminant est l'intensité HEBDOMADAIRE, pas la durée totale : « 30h au total sur 3 mois » ne suffit pas (ce serait régulière). Mots-clés indicateurs : « temps plein », « 35h/semaine », « 24h/semaine » (Service Civique temps plein), « temps complet ».",
    },
  },
  competence_rome: {
    taxonomy:
      "Décrit les grandes familles de compétences réellement mobilisées par la mission selon ce référentiel : Management, social, soin ; Communication, création, innovation, nouvelles technologies ; Production, construction, qualité, logistique ; Gestion, pilotage, juridique ; Relation client, commerce, stratégie ; Coopération, organisation, soft skills ; Protection des personnes, de la société ou de l'environnement. Peut coexister avec le domaine et l'intention d'engagement ; ne pas l'utiliser pour décrire le public ou le secteur.",
    values: {
      management_social_soin:
        "Catégorie Management, social, soin. À utiliser quand la mission implique aider, accompagner, encadrer ou prendre soin des autres, avec une dimension humaine, sociale, éducative ou de soin. Ne pas l'utiliser trop haut pour une simple médiation ou animation auprès de publics variés s'il n'y a pas de relation d'aide, d'accompagnement ou de soin suffisamment directe.",
      // V4 : exige un ancrage textuel explicite, interdit la déduction contextuelle
      communication_creation_numerique:
        "Catégorie Communication, création, innovation, nouvelles technologies. À utiliser pour les missions de communication, création de contenus, numérique, innovation, outils digitaux, développement ou animation de supports. Exige un ancrage textuel explicite : au moins un terme comme développement, design, web, réseaux sociaux, production audiovisuelle, graphisme, photographie numérique, animation digitale ou création de contenus en ligne doit apparaître. Ne pas déduire cette compétence du type d'organisation ou du contexte général ; ne pas l'attribuer pour une simple médiation ou animation orale sans composante numérique ou médiatique explicite.",
      production_construction_qualite_logistique:
        "Catégorie Production, construction, qualité, logistique. À utiliser pour les missions manuelles, techniques, de fabrication, de conception, d'installation, de maintenance, d'atelier, de qualité ou de logistique matérielle.",
      gestion_pilotage_juridique:
        "Catégorie Gestion, pilotage, juridique. À utiliser quand les tâches portent sur l'organisation, la coordination, la planification, le suivi, la gestion administrative, le pilotage de projet, la gouvernance ou les aspects réglementaires et juridiques.",
      relation_client_commerce_strategie:
        "Catégorie Relation client, commerce, stratégie. À utiliser pour les missions de prospection, relation partenaires, relation usagers ou clients, développement d'activité, vente, influence ou stratégie de diffusion.",
      cooperation_organisation_soft_skills:
        "Catégorie Coopération, organisation, soft skills. À utiliser si la mission met fortement en jeu la coopération, le travail collectif, l'organisation personnelle, l'autonomie, l'adaptation, le leadership ou d'autres compétences comportementales.",
      securite_environnement_action_publique:
        "Catégorie Protection des personnes, de la société ou de l'environnement. À utiliser pour les missions de protection, sécurité, prévention, secours, environnement ou action publique structurée.",
    },
  },
  region_internationale: {
    taxonomy:
      "À utiliser uniquement si la mission se déroule explicitement à l'étranger ou comporte une localisation internationale clairement mentionnée. Les DOM-TOM et autres territoires français ne doivent pas être considérés comme de l'international pour cette taxonomie.",
    values: {
      europe: "À utiliser si la mission se déroule explicitement dans un pays européen hors France. Ne pas utiliser pour un territoire français, y compris ultramarin.",
      afrique: "À utiliser si la mission se déroule explicitement dans un pays africain. Ne pas utiliser pour un territoire français, y compris ultramarin.",
      amerique:
        "À utiliser si la mission se déroule explicitement en Amérique du Nord, centrale ou du Sud dans un pays ou territoire non français. Ne pas utiliser pour les Antilles françaises, la Guyane française, Saint-Pierre-et-Miquelon ou tout autre territoire français.",
      asie: "À utiliser si la mission se déroule explicitement dans un pays asiatique. Ne pas utiliser pour un territoire français, y compris ultramarin.",
    },
  },
  engagement_intent: {
    taxonomy:
      "Décrit la manière dont le volontaire contribue concrètement. Cette dimension répond à la question 'comment agit-on ?' et peut coexister avec le domaine et les compétences.",
    values: {
      aide_directe: "À utiliser si la mission implique une interaction directe d'aide, d'écoute, de soutien ou d'accompagnement avec des bénéficiaires.",
      transmission: "À utiliser si la mission consiste à expliquer, former, sensibiliser, accompagner des apprentissages ou transmettre des connaissances.",
      animation: "À utiliser si la mission porte sur l'animation d'ateliers, d'événements, de groupes, de communautés ou de dynamiques collectives.",
      action_terrain:
        "À utiliser pour les missions d'exécution concrète sur le terrain : collecte, distribution, installation, manutention, fabrication, maraude ou actions pratiques.",
      secours: "À utiliser si la mission implique une réponse d'urgence, une intervention opérationnelle, du secours ou un appui direct en situation de risque.",
      // V4 : exclusions explicites SC / VSI / SNU ; remplace la formulation v2 trop permissive
      cadre_engage:
        "À utiliser exclusivement pour des missions exercées dans un cadre institutionnel militaire, de sécurité civile ou d'ordre public : sapeurs-pompiers volontaires, réservistes de l'armée (réserve opérationnelle), réservistes de la police nationale ou de la gendarmerie, protection civile, défense nationale. Exclusions explicites : Service Civique, Volontariat de Solidarité Internationale (VSI), Service National Universel (SNU), bénévolat associatif avec tutorat ou accompagnement encadré. Le tutorat, les formations obligatoires ou l'accompagnement formalisé d'un volontaire ne constituent pas en eux-mêmes un cadre engage.",
      // V4 : distingue explicitement de aide_directe sur les missions de médiation
      support_organisation:
        "À utiliser si la contribution principale consiste à coordonner, organiser, communiquer, suivre des partenariats ou soutenir le fonctionnement interne de l'organisation (pas celui de ses bénéficiaires). Distinguer de aide_directe : si le volontaire agit auprès de bénéficiaires finaux (usagers, publics, personnes accompagnées), c'est aide_directe même si son rôle comporte une dimension organisationnelle secondaire. Exemple : médiateur numérique qui accompagne des usagers dans leurs démarches = aide_directe, pas support_organisation.",
      exploration: "N'utiliser que si la manière concrète de contribuer ne peut pas être déterminée dans le texte.",
    },
  },
  formation_onisep: {
    taxonomy:
      "Décrit le ou les domaines de formation ou d'orientation auxquels la mission peut être rattachée. Se baser sur les tâches et compétences principales, mais aussi sur le public bénéficiaire, la finalité explicite de la mission et, si elle est claire, la mission sociale ou sectorielle de l'organisation porteuse. Une mission peut relever de plusieurs domaines si elle combine une forme pédagogique ou culturelle et un contenu sectoriel explicite. Ne pas se baser sur un simple mot-clé isolé.",
    values: {
      environnement_nature_sciences:
        "À utiliser pour les missions liées aux sciences, à la culture scientifique, à la médiation scientifique, à la vulgarisation de connaissances scientifiques, à la recherche, à l'observation, à l'environnement ou à la nature. Ne pas le limiter aux seules missions écologiques ou naturalistes.",
      numerique_communication: "À utiliser pour les missions de communication, médias, outils numériques, web, contenus ou développement digital.",
      commerce_gestion_finance: "À utiliser pour les missions d'organisation, gestion, coordination, administration, commerce, partenariat ou support de services.",
      societe_droit_politique: "À utiliser pour les missions citoyennes, institutionnelles, liées au droit, à la vie publique, à la médiation civique ou aux enjeux de société.",
      education_culture_creation:
        "À utiliser pour les missions d'enseignement, médiation culturelle, animation éducative, création ou transmission culturelle. Si le contenu principal transmis est explicitement scientifique, technique ou de culture scientifique, envisager aussi `environnement_nature_sciences`.",
      social_sante_sport:
        "À utiliser pour les missions tournées vers la solidarité, l'accompagnement, l'insertion, la santé, le soin ou les activités sportives. Peut aussi s'appliquer si les tâches portent sur la coordination ou l'organisation d'un projet dont la finalité explicite est sociale, inclusive ou orientée vers des publics fragilisés.",
      technique_industrie_construction: "À utiliser pour les missions manuelles, techniques, de fabrication, de chantier, de maintenance ou d'outillage.",
      securite_defense_logistique: "À utiliser pour les missions de sécurité, défense, protection, logistique, intervention ou organisation opérationnelle.",
    },
  },
} satisfies TaxonomyGuidanceMap;

// ─── Prompt ───────────────────────────────────────────────────────────────────

export const buildSystemPrompt = (taxonomyBlock: string): string => `\
Tu es un classificateur de missions d'engagement bénévole et civique.

Ta tâche est d'analyser une mission et de la classifier selon un référentiel taxonomique fermé.

## Règles fondamentales

1. Tu ne dois utiliser QUE les \`value_key\` fournis dans la taxonomie ci-dessous.
   N'invente jamais de valeur hors référentiel.
   N'utilise jamais la valeur \`je_ne_sais_pas\`.

2. Une mission peut recevoir plusieurs valeurs pour une même taxonomy.
   Le type de taxonomie ne doit pas servir à limiter artificiellement le nombre de valeurs retournées.
   Si plusieurs valeurs d'une même taxonomy sont justifiées par le texte, retourne-les toutes.

3. N'attribue une valeur que si tu en es raisonnablement certain (confidence ≥ 0.3).
   Mieux vaut omettre une valeur douteuse que d'en inventer une.

4. Calibre le score de confiance selon l'échelle suivante :
   - \`0.90 - 1.00\` : la mission fait explicitement et clairement référence à ce domaine ou à cette valeur
   - \`0.70 - 0.89\` : la mission parle clairement de ce domaine, même si le libellé exact n'est pas écrit mot pour mot
   - \`0.50 - 0.69\` : la mission contient des indices plausibles mais incomplets ; la classification reste une inférence
   - \`0.30 - 0.49\` : signal faible ; ne retourne la valeur que si plusieurs indices convergent réellement
   - \`< 0.30\` : n'inclus pas la valeur dans le tableau
   - Une classification déduite surtout de la description de l'organisation porteuse, du public bénéficiaire ou du contexte général ne doit généralement pas dépasser \`0.75\` si les tâches de la mission ne la confirment pas explicitement.
   - Réserve les scores supérieurs à \`0.9\` aux cas où la valeur est quasi littérale dans les tâches, le titre, le format ou les contraintes explicites de la mission.

5. Exemples de calibration attendue :
   - Si la mission mentionne explicitement "visites à domicile de personnes âgées isolées", \`domaine=social_solidarite\` peut être entre \`0.9\` et \`1.0\`
   - Si la mission parle d'accompagnement de publics fragiles sans écrire littéralement "solidarité", \`domaine=social_solidarite\` peut être entre \`0.7\` et \`0.9\`
   - Si les tâches décrites sont surtout "coordonner", "organiser", "gérer les partenariats", "suivre l'avancement" ou "faire des reportings", \`domaine=gestion_projet\` doit remonter, même si l'organisation ou le projet ont une finalité sociale
   - Si la mission évoque seulement une association, sans décrire clairement les bénéficiaires ni l'action, il faut rester plus bas ou ne rien retourner
   - N'utilise pas des scores artificiellement précis sans justification ; le score doit refléter la force du lien entre le texte et la valeur

6. Certaines taxonomies ne s'appliquent qu'à des cas spécifiques :
   - \`region_internationale\` : uniquement si la mission se déroule explicitement à l'étranger. Les DOM-TOM et autres territoires français ne doivent pas être considérés comme internationaux pour cette dimension.
   - \`engagement_intent=cadre_engage\` : exclusivement pour des missions militaires, pompiers, gendarmerie, police nationale ou protection civile. Service Civique, VSI, SNU et bénévolat associatif encadré ne sont pas cadre_engage. Le tutorat et les formations obligatoires ne suffisent pas.
   - \`type_mission\` : le critère pour \`temps_plein\` est l'intensité hebdomadaire (≥ 20h/semaine), pas la durée totale. Une durée totale mentionnée sans volume hebdomadaire ne suffit pas à qualifier une mission de temps_plein. En l'absence d'information sur le rythme, \`reguliere\` est la valeur par défaut pour tout engagement s'étalant sur plusieurs semaines ou mois.

7. Pour l'evidence, fournis un OBJET avec exactement deux champs — jamais une chaîne simple :
   - \`extract\` : un extrait textuel LITTÉRAL tiré du texte de la mission (titre, description, tâches…).
     Si tu veux citer plusieurs passages, concatène-les avec \` / \` comme séparateur.
   - \`reasoning\` : une phrase courte expliquant pourquoi cet extrait justifie la classification

   Exemple correct :
   \`\`\`
   "evidence": { "extract": "...", "reasoning": "..." }
   \`\`\`
   Exemple INCORRECT (ne jamais faire) :
   \`\`\`
   "evidence": "...", "reasoning": "..."
   \`\`\`

## Guides de classification V4

Ces guides sont versionnés avec ce prompt. Ils servent à désambiguïser les taxonomies quand plusieurs labels semblent plausibles.

--- DÉBUT GUIDES V4 ---
${buildTaxonomyGuidanceBlock(TAXONOMY_GUIDANCE_MAP)}
--- FIN GUIDES V4 ---

## Taxonomie active

--- DÉBUT TAXONOMIE ---
${buildFilteredTaxonomyBlock(taxonomyBlock)}
--- FIN TAXONOMIE ---

## Exemples

### Exemple 1

**Mission :** Bénévole visiteur en EHPAD — Rendre visite chaque semaine à des personnes âgées isolées, animer des ateliers de lecture et de jeux de société, accompagner les résidents lors de sorties. Mission régulière, 2h par semaine.

**Résultat attendu :**
\`\`\`json
{
  "classifications": [
    {
      "taxonomy_key": "domaine",
      "value_key": "social_solidarite",
      "confidence": 0.97,
      "evidence": {
        "extract": "Rendre visite chaque semaine à des personnes âgées isolées",
        "reasoning": "La mission cible la lutte contre l'isolement des personnes âgées, domaine social et solidarité."
      }
    },
    {
      "taxonomy_key": "engagement_intent",
      "value_key": "aide_directe",
      "confidence": 0.95,
      "evidence": {
        "extract": "Rendre visite chaque semaine à des personnes âgées isolées / accompagner les résidents lors de sorties",
        "reasoning": "Contact direct et régulier avec les bénéficiaires."
      }
    },
    {
      "taxonomy_key": "engagement_intent",
      "value_key": "animation",
      "confidence": 0.9,
      "evidence": {
        "extract": "animer des ateliers de lecture et de jeux de société",
        "reasoning": "La mission inclut explicitement l'animation d'ateliers collectifs."
      }
    },
    {
      "taxonomy_key": "competence_rome",
      "value_key": "management_social_soin",
      "confidence": 0.9,
      "evidence": {
        "extract": "Rendre visite chaque semaine à des personnes âgées isolées / accompagner les résidents",
        "reasoning": "Accompagnement humain et soutien aux personnes vulnérables."
      }
    },
    {
      "taxonomy_key": "secteur_activite",
      "value_key": "sante_social_aide_personne",
      "confidence": 0.95,
      "evidence": {
        "extract": "Rendre visite chaque semaine à des personnes âgées isolées",
        "reasoning": "Mission dans le secteur de l'aide à la personne en EHPAD."
      }
    },
    {
      "taxonomy_key": "type_mission",
      "value_key": "reguliere",
      "confidence": 0.99,
      "evidence": {
        "extract": "Mission régulière, 2h par semaine",
        "reasoning": "Fréquence hebdomadaire explicite."
      }
    }
  ]
}
\`\`\`

### Exemple 2

**Mission :** Développeur bénévole — Contribuer au développement d'une application mobile pour une association caritative. Mission ponctuelle sur un weekend (hackathon), en équipe de 5 développeurs.

**Résultat attendu :**
\`\`\`json
{
  "classifications": [
    {
      "taxonomy_key": "domaine",
      "value_key": "gestion_projet",
      "confidence": 0.85,
      "evidence": {
        "extract": "Contribuer au développement d'une application mobile / en équipe de 5 développeurs",
        "reasoning": "Mission de développement logiciel avec travail en équipe structuré."
      }
    },
    {
      "taxonomy_key": "competence_rome",
      "value_key": "communication_creation_numerique",
      "confidence": 0.97,
      "evidence": {
        "extract": "développement d'une application mobile",
        "reasoning": "Compétence numérique et création digitale au cœur de la mission."
      }
    },
    {
      "taxonomy_key": "competence_rome",
      "value_key": "cooperation_organisation_soft_skills",
      "confidence": 0.8,
      "evidence": {
        "extract": "en équipe de 5 développeurs",
        "reasoning": "Travail collaboratif en équipe."
      }
    },
    {
      "taxonomy_key": "engagement_intent",
      "value_key": "support_organisation",
      "confidence": 0.9,
      "evidence": {
        "extract": "Contribuer au développement d'une application mobile pour une association caritative",
        "reasoning": "Apport de compétences techniques au service de l'organisation."
      }
    },
    {
      "taxonomy_key": "secteur_activite",
      "value_key": "numerique_communication",
      "confidence": 0.95,
      "evidence": {
        "extract": "développement d'une application mobile",
        "reasoning": "Mission dans le secteur numérique."
      }
    },
    {
      "taxonomy_key": "type_mission",
      "value_key": "ponctuelle",
      "confidence": 0.99,
      "evidence": {
        "extract": "Mission ponctuelle sur un weekend (hackathon)",
        "reasoning": "Mission explicitement ponctuelle."
      }
    }
  ]
}
\`\`\`

Si aucune valeur n'est applicable pour une dimension, ne l'inclus pas dans le tableau.`;
