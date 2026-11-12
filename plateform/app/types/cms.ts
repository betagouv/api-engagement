// Page composée de blocs (landing, page éditoriale…), éditée dans le CMS (Strapi, `cms/`) et lue par plateform.
// Types propres à plateform (`cms/` n'en dépend pas). Les schémas Strapi (`cms/src/**`) restent la source de vérité :
// tout changement de bloc ou de champ doit être répercuté ici.
export type CmsMedia = {
  url: string;
  alternativeText: string | null;
  width: number | null;
  height: number | null;
};

// Pastille du hero : `icon` est le nom d'une icône DSFR sans le préfixe `fr-icon-` (ex. `team-line`).
export type CmsHeroTag = { icon: string; color: "bleu" | "vert" | "caramel" | "rose"; label: string };

export type CmsMissionSlot = {
  dispositif: string | null;
  domaineEngagement: string | null;
};

// Texte riche de l'éditeur « Blocks » de Strapi (sous-ensemble géré : pas de tableaux).
export type CmsTextNode = { type: "text"; text: string; bold?: boolean; italic?: boolean; underline?: boolean; strikethrough?: boolean; code?: boolean };
export type CmsLinkNode = { type: "link"; url: string; children: CmsTextNode[] };
export type CmsInlineNode = CmsTextNode | CmsLinkNode;
// Une sous-liste (`indentLevel` > 0) est un enfant de la liste, à côté de ses éléments.
export type CmsListNode = { type: "list"; format: "ordered" | "unordered"; indentLevel?: number; children: (CmsListItemNode | CmsListNode)[] };
export type CmsListItemNode = { type: "list-item"; children: (CmsInlineNode | CmsListNode)[] };
export type CmsRichTextNode =
  | { type: "paragraph"; children: CmsInlineNode[] }
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; children: CmsInlineNode[] }
  | { type: "quote"; children: CmsInlineNode[] }
  | { type: "code"; children: CmsTextNode[] }
  | CmsListNode
  | { type: "image"; image: CmsMedia; children: CmsTextNode[] };

export type CmsBlock =
  | {
      __component: "blocks.hero";
      title: string;
      description: string;
      tags: CmsHeroTag[];
      primaryLabel: string | null;
      primaryUrl: string | null;
      secondaryLabel: string | null;
      secondaryUrl: string | null;
      hint: string | null;
      image: CmsMedia | null;
      imageMobile: CmsMedia | null;
      visual: "none" | "chacun_pour_tous";
    }
  | {
      __component: "blocks.missions";
      title: string;
      description: string;
      slots: CmsMissionSlot[];
      fillWithRandom: boolean;
      examples: boolean;
      background: "creme" | "galet";
    }
  | { __component: "blocks.mission-detail"; missionId: string; backUrl: string | null }
  | { __component: "blocks.rich-text"; title: string | null; body: CmsRichTextNode[] }
  | { __component: "blocks.image"; image: CmsMedia; caption: string | null }
  | { __component: "blocks.etapes"; items: { icon: string; title: string; description: string }[]; ctaLabel?: string | null; ctaUrl?: string | null }
  | { __component: "blocks.benefits"; title: string; benefits: { emoji: string; label: string }[]; newsletterTitle: string; newsletterText: string }
  | { __component: "blocks.cards"; title: string; cards: { icon: string; title: string; points: string }[] }
  | { __component: "blocks.stories"; title: string; intro: string | null; stories: { image: CmsMedia; domain: string; story: string; publisher: string; logo: CmsMedia }[] }
  | { __component: "blocks.testimonials"; testimonials: { image: CmsMedia; quote: string; name: string; role: string }[] }
  | { __component: "blocks.faq"; title: string; intro: string | null; questions: { icon: string; question: string; answer: string }[] }
  | {
      __component: "blocks.accordion";
      title: string;
      questions: { question: string; answer: CmsRichTextNode[] }[];
      linkLabel: string | null;
      linkUrl: string | null;
      teamPhotos: CmsMedia[] | null;
    }
  | { __component: "blocks.newsletter"; title: string; subtitle: string; ctaText: string; hintText: string }
  | { __component: "blocks.partners"; title: string; partners: { name: string; description: string; url: string | null; logo: CmsMedia }[] };

export type CmsPage = {
  title: string;
  slug: string;
  seoTitle: string;
  seoDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  noindex: boolean;
  blocks: CmsBlock[];
};
