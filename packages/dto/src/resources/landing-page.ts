// Landing composée de blocs, éditée dans le CMS (Strapi, `cms/`) et lue par plateform. Les schémas Strapi
// (`cms/src/**`) restent la source de vérité : tout changement de bloc ou de champ doit être répercuté ici.
export type LandingMedia = {
  url: string;
  alternativeText: string | null;
  width: number | null;
  height: number | null;
};

// Pictogrammes DSFR proposés dans le CMS (enum `icon`).
export type LandingPictogram = "search" | "self_training" | "mail_send" | "backpack" | "environment" | "human_cooperation" | "community";

export type LandingMissionSlot = {
  dispositif: string | null;
  domaineEngagement: string | null;
};

export type LandingBlock =
  | {
      __component: "blocks.hero";
      title: string;
      description: string;
      hint: string | null;
      image: LandingMedia | null;
      backgroundColor: string | null;
      visual: "none" | "chacun_pour_tous";
    }
  | {
      __component: "blocks.missions";
      title: string;
      description: string;
      slots: LandingMissionSlot[];
      fillWithRandom: boolean;
      examples: boolean;
      background: "creme" | "galet";
    }
  | { __component: "blocks.etapes"; items: { icon: LandingPictogram; title: string; description: string }[] }
  | { __component: "blocks.benefits"; title: string; benefits: { emoji: string; label: string }[]; newsletterTitle: string; newsletterText: string }
  | { __component: "blocks.cards"; title: string; cards: { icon: LandingPictogram; title: string; points: string }[] }
  | { __component: "blocks.stories"; title: string; intro: string | null; stories: { image: LandingMedia; domain: string; story: string; publisher: string; logo: LandingMedia }[] }
  | { __component: "blocks.faq"; title: string; intro: string | null; questions: { icon: LandingPictogram; question: string; answer: string }[] }
  | { __component: "blocks.partners"; title: string; partners: { name: string; description: string; url: string | null; logo: LandingMedia }[] };

export type LandingPage = {
  slug: string;
  seoTitle: string;
  seoDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  noindex: boolean;
  blocks: LandingBlock[];
};
