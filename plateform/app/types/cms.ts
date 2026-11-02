// Page composée de blocs (landing, page éditoriale…), éditée dans le CMS (Strapi, `cms/`) et lue par plateform.
// Types propres à plateform (`cms/` n'en dépend pas). Les schémas Strapi (`cms/src/**`) restent la source de vérité :
// tout changement de bloc ou de champ doit être répercuté ici.
export type CmsMedia = {
  url: string;
  alternativeText: string | null;
  width: number | null;
  height: number | null;
};

// Pictogrammes DSFR proposés dans le CMS (enum `icon`).
export type CmsPictogram = "search" | "self_training" | "mail_send" | "backpack" | "environment" | "human_cooperation" | "community";

export type CmsMissionSlot = {
  dispositif: string | null;
  domaineEngagement: string | null;
};

// Texte riche de l'éditeur « Blocks » de Strapi (sous-ensemble géré : pas de tableaux).
export type CmsTextNode = { type: "text"; text: string; bold?: boolean; italic?: boolean; underline?: boolean; strikethrough?: boolean; code?: boolean };
export type CmsLinkNode = { type: "link"; url: string; children: CmsTextNode[] };
export type CmsInlineNode = CmsTextNode | CmsLinkNode;
export type CmsListNode = { type: "list"; format: "ordered" | "unordered"; children: CmsListItemNode[] };
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
      hint: string | null;
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
  | { __component: "blocks.rich-text"; title: string | null; body: CmsRichTextNode[] }
  | { __component: "blocks.image"; image: CmsMedia; caption: string | null }
  | { __component: "blocks.etapes"; items: { icon: CmsPictogram; title: string; description: string }[] }
  | { __component: "blocks.benefits"; title: string; benefits: { emoji: string; label: string }[]; newsletterTitle: string; newsletterText: string }
  | { __component: "blocks.cards"; title: string; cards: { icon: CmsPictogram; title: string; points: string }[] }
  | { __component: "blocks.stories"; title: string; intro: string | null; stories: { image: CmsMedia; domain: string; story: string; publisher: string; logo: CmsMedia }[] }
  | { __component: "blocks.faq"; title: string; intro: string | null; questions: { icon: CmsPictogram; question: string; answer: string }[] }
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
