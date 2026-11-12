import type { MissionBrowse, MissionDetailResponse } from "@engagement/dto";

import missionAsc from "~/assets/images/home/mission-asc.webp";
import missionJva from "~/assets/images/home/mission-jva.webp";
import missionSpv from "~/assets/images/home/mission-spv.webp";
import testimonialEducation from "~/assets/images/home/testimonial-education.webp";
import testimonialSolidarity from "~/assets/images/home/testimonial-solidarity.webp";
import heroEngagementSecurite from "~/assets/images/landings/engagement-securite/hero.webp";
import histoire1 from "~/assets/images/landings/chacun-pour-tous/histoire-1.webp";
import histoire2 from "~/assets/images/landings/chacun-pour-tous/histoire-2.webp";
import ascLogo from "~/assets/images/logo/asc-logo.png";
import jvaLogo from "~/assets/images/logo/jva-logo.png";
import spvLogo from "~/assets/images/logo/spv-logo.png";
import type { CmsBlock, CmsMedia } from "~/types/cms";

// Exemples affichés sur la page des composants du CMS (/_cms/components) : une ou plusieurs variantes par bloc.
// Typés `CmsBlock` : un bloc ajouté ou modifié dans `types/cms.ts` sans exemple à jour fait échouer le typecheck.
const media = (url: string, alternativeText: string | null = null): CmsMedia => ({ url, alternativeText, width: null, height: null });

// Images proposées dans le formulaire de la page pour les champs « Image ».
export const CMS_COMPONENT_IMAGES: { label: string; media: CmsMedia }[] = [
  { label: "Hero (réserve)", media: media(heroEngagementSecurite) },
  { label: "Histoire 1", media: media(histoire1, "Des bénévoles en mission") },
  { label: "Histoire 2", media: media(histoire2) },
  { label: "Portrait solidarité", media: media(testimonialSolidarity) },
  { label: "Portrait éducation", media: media(testimonialEducation) },
  { label: "Mission bénévolat", media: media(missionJva) },
  { label: "Mission service civique", media: media(missionAsc) },
  { label: "Mission sapeurs-pompiers", media: media(missionSpv) },
  { label: "Logo JeVeuxAider", media: media(jvaLogo) },
  { label: "Logo service civique", media: media(ascLogo) },
  { label: "Logo sapeurs-pompiers", media: media(spvLogo) },
];

export const CMS_COMPONENT_EXAMPLES: { label: string; block: CmsBlock }[] = [
  {
    label: "Sans pastille ni bouton : bouton quiz « Trouve ta mission »",
    block: {
      __component: "blocks.hero",
      title: "Engage-toi près de chez toi",
      description: "Des missions de bénévolat, de service civique ou de réserve.\nTrouve celle qui te ==ressemble==.",
      tags: [],
      primaryLabel: null,
      primaryUrl: null,
      secondaryLabel: null,
      secondaryUrl: null,
      hint: "2 minutes pour trouver ta mission.",
      image: null,
      imageMobile: null,
      visual: "none",
    },
  },
  {
    label: "Avec pastilles, boutons et image",
    block: {
      __component: "blocks.hero",
      title: "Deviens réserviste près de chez toi",
      description: "En parallèle de tes études ou de ton job, tu renforces les équipes de ton secteur.",
      tags: [
        { icon: "team-line", color: "vert", label: "Dès 18 ans" },
        { icon: "money-euro-circle-line", color: "caramel", label: "Avec indemnisation" },
        { icon: "briefcase-line", color: "bleu", label: "Quelques jours par mois" },
        { icon: "plant-line", color: "bleu", label: "10 jours de préparation" },
        { icon: "heart-line", color: "rose", label: "Au service de ton territoire" },
      ],
      primaryLabel: "Je candidate",
      primaryUrl: "https://www.example.com",
      secondaryLabel: "En savoir plus sur la mission",
      secondaryUrl: "https://www.example.com",
      hint: "À un clic de ton engagement.",
      image: media(heroEngagementSecurite),
      imageMobile: null,
      visual: "none",
    },
  },
  {
    label: "Avec une pastille (thématique)",
    block: {
      __component: "blocks.hero",
      badge: "Environnement et animaux",
      title: "Prends soin de la planète, à ton rythme",
      description: "Nettoyage de berges, jardins partagés, refuges pour animaux… Tu choisis la mission qui te ressemble.",
      tags: [],
      primaryLabel: null,
      primaryUrl: null,
      secondaryLabel: null,
      secondaryUrl: null,
      hint: null,
      image: null,
      imageMobile: null,
      visual: "none",
    },
  },
  {
    label: "Habillage de campagne « chacun_pour_tous »",
    block: {
      __component: "blocks.hero",
      title: "Chacun pour tous",
      description: "Une campagne d'engagement ouverte à ==tous les publics==.",
      tags: [],
      primaryLabel: null,
      primaryUrl: null,
      secondaryLabel: null,
      secondaryUrl: null,
      hint: null,
      image: null,
      imageMobile: null,
      visual: "chacun_pour_tous",
    },
  },
  {
    label: "Exemple",
    block: {
      __component: "blocks.rich-text",
      title: "Un titre de section",
      body: [
        {
          type: "paragraph",
          children: [
            { type: "text", text: "Un paragraphe avec du " },
            { type: "text", text: "gras", bold: true },
            { type: "text", text: " et un " },
            { type: "link", url: "/missions", children: [{ type: "text", text: "lien" }] },
            { type: "text", text: "." },
          ],
        },
        { type: "heading", level: 3, children: [{ type: "text", text: "Un sous-titre" }] },
        {
          type: "list",
          format: "unordered",
          children: [
            { type: "list-item", children: [{ type: "text", text: "Premier point" }] },
            { type: "list-item", children: [{ type: "text", text: "Deuxième point" }] },
          ],
        },
        { type: "quote", children: [{ type: "text", text: "Une citation." }] },
      ],
    },
  },
  {
    label: "Exemple (mission fictive ; dans le CMS, la mission est lue dans l'API)",
    block: { __component: "blocks.mission-detail", missionId: "exemple-police", backUrl: "/" },
  },
  {
    label: "Exemple",
    block: { __component: "blocks.image", image: media(histoire1, "Des bénévoles en mission"), caption: "Une légende sous l'image." },
  },
  {
    label: "Fond galet, cartes d'exemple (sans lien vers la fiche)",
    block: {
      __component: "blocks.missions",
      title: "Des missions ==près de chez toi==",
      description: "Les missions affichées ici sont des exemples ; sur une vraie page, ce sont de vraies missions.",
      slots: [],
      fillWithRandom: true,
      examples: true,
      background: "galet",
    },
  },
  {
    label: "Exemple (3 étapes maximum)",
    block: {
      __component: "blocks.etapes",
      items: [
        { icon: "self_training", title: "Découvre la mission", description: "Conditions, formation, rythme : tout est expliqué avant de te lancer." },
        { icon: "search", title: "Postule en ligne", description: "Quelques minutes suffisent pour envoyer ta candidature." },
        { icon: "mail_send", title: "Reçois une réponse", description: "L'organisme te recontacte pour la suite." },
      ],
    },
  },
  {
    label: "Avec un bouton personnalisé",
    block: {
      __component: "blocks.etapes",
      items: [
        { icon: "self_training", title: "Découvre la mission", description: "Conditions, formation, rythme : tout est expliqué avant de te lancer." },
        { icon: "search", title: "Postule en ligne", description: "Tu crées ton espace candidat sur le site de la Gendarmerie." },
        { icon: "community", title: "Lance-toi", description: "Après les examens, tu suis 15 jours de formation et tu rejoins une unité près de chez toi." },
      ],
      ctaLabel: "Je deviens réserviste de la Gendarmerie",
      ctaUrl: "https://www.lagendarmerierecrute.fr",
    },
  },
  {
    label: "Exemple",
    block: {
      __component: "blocks.benefits",
      title: "Ce que l'engagement\nt'apporte",
      benefits: [
        { emoji: "🤝", label: "Des rencontres" },
        { emoji: "💪", label: "De nouvelles compétences" },
        { emoji: "🌱", label: "Un impact concret" },
      ],
      newsletterTitle: "Reste informé",
      newsletterText: "Reçois les nouvelles missions par email.",
    },
  },
  {
    label: "Exemple",
    block: {
      __component: "blocks.cards",
      title: "Une mission pour chaque ==étape de la vie==",
      cards: [
        { icon: "backpack", title: "Lycéen ou étudiant", points: "Des missions courtes\nCompatibles avec tes cours" },
        { icon: "human_cooperation", title: "En activité", points: "Le soir ou le week-end\nValorise tes compétences" },
        { icon: "community", title: "À la retraite", points: "Transmets ton expérience\nRejoins une équipe" },
      ],
    },
  },
  {
    label: "Exemple",
    block: {
      __component: "blocks.stories",
      title: "Ils se sont ==engagés==",
      intro: "Des histoires d'engagement partout en France.",
      stories: [
        {
          image: media(histoire1),
          domain: "Solidarité",
          story: "Chaque semaine, Léa aide à la distribution alimentaire de son quartier.",
          publisher: "JeVeuxAider.gouv.fr",
          logo: media(jvaLogo),
        },
        {
          image: media(histoire2),
          domain: "Sécurité et secours",
          story: "Karim est sapeur-pompier volontaire en parallèle de son travail.",
          publisher: "Sapeurs-pompiers volontaires",
          logo: media(spvLogo),
        },
      ],
    },
  },
  {
    label: "Exemple",
    block: {
      __component: "blocks.testimonials",
      testimonials: [
        { image: media(testimonialSolidarity), quote: "J'ai découvert un collectif et un vrai sens à mes week-ends.", name: "Camille", role: "bénévole depuis 2024" },
        { image: media(testimonialEducation), quote: "Mon service civique m'a aidé à choisir mon orientation.", name: "Yanis", role: "volontaire en service civique" },
      ],
    },
  },
  {
    label: "Exemple",
    block: {
      __component: "blocks.faq",
      title: "Tes ==questions==",
      intro: "Une autre question ? [Consulte l'aide](/missions).",
      questions: [
        { icon: "compass", question: "Faut-il de l'expérience ?", answer: "Non, la plupart des missions sont ouvertes à tous." },
        { icon: "environment", question: "Combien de temps ça prend ?", answer: "De quelques heures à plusieurs mois, selon la mission." },
      ],
    },
  },
  {
    label: "Avec lien et photos de l'équipe",
    block: {
      __component: "blocks.accordion",
      title: "Questions ==fréquentes==",
      questions: [
        { question: "Qui peut s'engager ?", answer: [{ type: "paragraph", children: [{ type: "text", text: "Tout le monde, selon les conditions propres à chaque mission." }] }] },
        {
          question: "Est-ce rémunéré ?",
          answer: [{ type: "paragraph", children: [{ type: "text", text: "Certaines missions sont indemnisées, comme le service civique ou la réserve." }] }],
        },
      ],
      linkLabel: "Toutes les réponses à tes questions",
      linkUrl: "/missions",
      teamPhotos: [media(testimonialSolidarity), media(testimonialEducation)],
    },
  },
  {
    label: "Exemple",
    block: {
      __component: "blocks.partners",
      title: "Nos partenaires",
      partners: [
        { name: "JeVeuxAider.gouv.fr", description: "La plateforme publique du bénévolat.", url: "https://www.jeveuxaider.gouv.fr", logo: media(jvaLogo) },
        { name: "Service civique", description: "L'engagement volontaire de 16 à 25 ans.", url: null, logo: media(ascLogo) },
      ],
    },
  },
  {
    label: "Textes par défaut",
    block: {
      __component: "blocks.newsletter",
      title: "Inscris-toi à la newsletter",
      subtitle: "Chaque mois, des missions liées à l'actualité et un éclairage sur les différentes façons de s'engager.",
      ctaText: "Je m'inscris",
      hintText: "1 e-mail par mois. Tu peux te désinscrire en un clic depuis chaque e-mail.",
    },
  },
  {
    label: "Limitée à un domaine (filtre Domaines masqué)",
    block: { __component: "blocks.missions-browser", dispositif: null, domaineEngagement: "environnement_animaux" },
  },
  {
    label: "Exemple",
    block: {
      __component: "blocks.quote-wall",
      title: "Des histoires vraies\nqui donnent ==envie d'agir==",
      quotes: [
        { quote: "J'ai découvert un collectif et un vrai sens à mes week-ends.", name: "Camille", role: "Bénévole depuis 2024", image: media(histoire1) },
        { quote: "Mon service civique m'a aidé à choisir mon orientation.", name: "Yanis", role: "Volontaire en service civique", image: media(testimonialSolidarity) },
        { quote: "On apprend autant qu'on donne.", name: "Inès", role: "Réserviste depuis 2023", image: media(histoire2) },
      ],
    },
  },
];

const exampleMission = (id: string, title: string, photo: string, organizationName: string): MissionBrowse => ({
  id,
  title,
  description: null,
  remote: "no",
  city: "Lyon",
  country: "FR",
  departmentCode: "69",
  departmentName: "Rhône",
  domain: "solidarite-insertion",
  domainOriginal: null,
  domainLogo: null,
  photo,
  organizationName,
  organizationLogo: null,
  publisherId: null,
  publisherName: null,
  publisherLogo: null,
  applicationUrl: null,
  schedule: null,
  places: null,
  tags: [],
  addresses: [],
  compensation: null,
});

// Missions fictives du bloc « Missions » : la page n'appelle pas l'API.
export const CMS_COMPONENT_MISSIONS: MissionBrowse[] = [
  exampleMission("exemple-1", "Accompagner des personnes âgées isolées", missionJva, "Association des aînés"),
  exampleMission("exemple-2", "Animer des ateliers de soutien scolaire", missionAsc, "Collège Jean Moulin"),
  exampleMission("exemple-3", "Renforcer le centre de secours de ton secteur", missionSpv, "SDIS du Rhône"),
];

// Mission affichée par l'exemple du bloc « Fiche mission ».
export const CMS_COMPONENT_MISSION_DETAIL: MissionDetailResponse = {
  id: "exemple-police",
  title: "Je deviens réserviste de la Police nationale près de chez moi",
  domain: "service-public-defense-securite",
  domainLogo: null,
  type: "volontariat_reserve_operationnelle",
  publisherId: null,
  publisherName: "Police nationale",
  publisherLogo: null,
  organizationName: "Police nationale",
  organizationLogo: null,
  location: null,
  startAt: null,
  endAt: null,
  duration: null,
  schedule: "Quelques jours par mois",
  compensation: { amount: 74, amountMax: 119, unit: "day", type: "gross" },
  descriptionHtml:
    "<p>Engagez-vous pour la sécurité de tous, près de chez vous.</p><h3>Vos missions</h3><ul><li>sécuriser un festival, un concert ou une compétition sportive</li><li>participer à des actions de prévention routière</li></ul>",
  description: null,
  applicationUrl: "https://demarche.numerique.gouv.fr/dossiers/new?procedure_id=43316",
  photo: heroEngagementSecurite,
  remote: "local",
  openToMinors: false,
  reducedMobilityAccessible: false,
  places: 5000,
};
