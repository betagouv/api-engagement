import { ai } from "@/services/ai";

import { ENRICHMENT_SCHEMA, TAXONOMY_GUIDANCE_MAP, TEMPERATURE, buildSystemPrompt as buildSystemPromptV2, buildUserMessage } from "./v2";

export const VERSION = "v3";
export const MODEL = ai.model("mistral", "mistral-small-2603");
export { ENRICHMENT_SCHEMA, TEMPERATURE, buildUserMessage };

const TAXONOMY_GUIDANCE_MAP_V3 = {
  ...TAXONOMY_GUIDANCE_MAP,
  domaine: {
    ...TAXONOMY_GUIDANCE_MAP.domaine,
    values: {
      ...TAXONOMY_GUIDANCE_MAP.domaine.values,
      securite_defense:
        "À utiliser pour les missions liées à la protection, la sécurité civile, la défense, l'ordre public ou les interventions structurées de sécurité. Le cadre judiciaire (tribunaux, SPIP, PJJ, maison d'arrêt) n'implique pas ce domaine si les tâches sont de l'accueil, de l'accompagnement social ou de l'insertion — dans ce cas, utiliser social_solidarite.",
      gestion_projet:
        "À utiliser quand la mission consiste principalement à coordonner, planifier, organiser, suivre un projet, des ressources, des partenaires, un planning ou des livrables. Si les tâches décrites portent surtout sur la coordination, les partenariats, le reporting, l'organisation ou le pilotage, cette valeur doit remonter même si le projet a une finalité sociale ou associative. Ne pas l'attribuer si la coordination mentionnée est au service d'une autre activité principale (sensibilisation, animation, accompagnement) : le pilotage doit être la tâche centrale, pas un outil accessoire. Exemples négatifs : 'Mettre en place des actions de sensibilisation' (sensibilisation = activité principale), 'Organiser des ateliers avec les habitants' (animation = activité principale).",
    },
  },
  competence_rome: {
    ...TAXONOMY_GUIDANCE_MAP.competence_rome,
    values: {
      ...TAXONOMY_GUIDANCE_MAP.competence_rome.values,
      communication_creation_numerique:
        "Catégorie Communication, création, innovation, nouvelles technologies. À utiliser pour les missions de communication, création de contenus, numérique, innovation, outils digitaux, développement ou animation de supports. Ne pas l'utiliser pour de la simple vulgarisation, animation ou médiation orale si aucune composante numérique, média, contenu digital ou technologie n'est explicitement décrite. Exemples négatifs (ne pas attribuer même avec un score > 0.5) : 'Créer des affiches ou des flyers' (supports papier, pas numérique), 'Communiquer auprès des habitants' (communication orale), 'Animation d'ateliers' sans mention d'outils digitaux. Si le doute persiste, ne pas attribuer (règle 3 : mieux vaut omettre une valeur douteuse).",
      management_social_soin:
        "Catégorie Management, social, soin. Utiliser UNIQUEMENT si la mission décrit explicitement une relation d'aide directe, un accompagnement individuel ou des soins. Le contact avec des publics lors d'ateliers, de sensibilisation ou d'animation ne suffit pas. Exemples négatifs (ne pas attribuer) : animer des ateliers de sensibilisation environnementale, accompagner les usagers dans leurs démarches numériques, transmettre des savoirs en milieu scolaire, médiation culturelle ou patrimoniale. Exemples positifs (attribuer) : suivi social de personnes en difficulté, accompagnement de personnes en situation de handicap au quotidien, soins infirmiers ou aide à la personne dépendante.",
    },
  },
  region_internationale: {
    ...TAXONOMY_GUIDANCE_MAP.region_internationale,
    values: {
      europe: "À utiliser si la mission se déroule explicitement dans un pays européen hors France. Ne pas utiliser pour un territoire français, y compris ultramarin.",
      afrique:
        "À utiliser si la mission se déroule explicitement dans un pays africain. Ne pas utiliser pour un territoire français, y compris ultramarin. Exemples à ne PAS tagger : Mayotte → France (pas afrique), La Réunion → France (pas afrique).",
      amerique:
        "À utiliser si la mission se déroule explicitement en Amérique du Nord, centrale ou du Sud dans un pays ou territoire non français. Ne pas utiliser pour les Antilles françaises, la Guyane française, Saint-Pierre-et-Miquelon ou tout autre territoire français. Exemples à ne PAS tagger : Martinique → France (pas amerique), Guadeloupe → France (pas amerique), Guyane → France (pas amerique).",
      asie: "À utiliser si la mission se déroule explicitement dans un pays asiatique. Ne pas utiliser pour un territoire français, y compris ultramarin.",
    },
  },
  formation_onisep: {
    ...TAXONOMY_GUIDANCE_MAP.formation_onisep,
    values: {
      ...TAXONOMY_GUIDANCE_MAP.formation_onisep.values,
      environnement_nature_sciences:
        "À utiliser pour les missions liées aux sciences, à la culture scientifique, à la médiation scientifique, à la vulgarisation de connaissances scientifiques, à la recherche ou à l'observation naturaliste. Ne pas l'attribuer pour de la sensibilisation environnementale, des actions éco-citoyennes ou de la gestion des déchets si aucun contenu scientifique n'est explicitement mobilisé.",
    },
  },
};

export const buildSystemPrompt = (taxonomyBlock: string): string => buildSystemPromptV2(taxonomyBlock, TAXONOMY_GUIDANCE_MAP_V3);
