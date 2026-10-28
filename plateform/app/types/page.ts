// Page composée de blocs (landing, page éditoriale…), éditée dans le CMS (Strapi, `cms/`) et lue par plateform.
// Types propres à plateform (`cms/` n'en dépend pas). Les schémas Strapi (`cms/src/**`) restent la source de vérité :
// tout changement de bloc ou de champ doit être répercuté ici.
export type PageMedia = {
  url: string;
  alternativeText: string | null;
  width: number | null;
  height: number | null;
};

// Pictogrammes DSFR proposés dans le CMS (enum `icon`).
export type PagePictogram = "search" | "self_training" | "mail_send" | "backpack" | "environment" | "human_cooperation" | "community";

export type PageMissionSlot = {
  dispositif: string | null;
  domaineEngagement: string | null;
};

// Texte riche de l'éditeur « Blocks » de Strapi (sous-ensemble géré : pas de tableaux).
export type PageTextNode = { type: "text"; text: string; bold?: boolean; italic?: boolean; underline?: boolean; strikethrough?: boolean; code?: boolean };
export type PageLinkNode = { type: "link"; url: string; children: PageTextNode[] };
export type PageInlineNode = PageTextNode | PageLinkNode;
export type PageListNode = { type: "list"; format: "ordered" | "unordered"; children: PageListItemNode[] };
export type PageListItemNode = { type: "list-item"; children: (PageInlineNode | PageListNode)[] };
export type PageRichTextNode =
  | { type: "paragraph"; children: PageInlineNode[] }
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; children: PageInlineNode[] }
  | { type: "quote"; children: PageInlineNode[] }
  | { type: "code"; children: PageTextNode[] }
  | PageListNode
  | { type: "image"; image: PageMedia; children: PageTextNode[] };

export type PageBlock =
  | {
      __component: "blocks.hero";
      title: string;
      description: string;
      hint: string | null;
      image: PageMedia | null;
      backgroundColor: string | null;
      visual: "none" | "chacun_pour_tous";
    }
  | {
      __component: "blocks.missions";
      title: string;
      description: string;
      slots: PageMissionSlot[];
      fillWithRandom: boolean;
      examples: boolean;
      background: "creme" | "galet";
    }
  | { __component: "blocks.rich-text"; title: string | null; body: PageRichTextNode[] }
  | { __component: "blocks.image"; image: PageMedia; caption: string | null }
  | { __component: "blocks.etapes"; items: { icon: PagePictogram; title: string; description: string }[] }
  | { __component: "blocks.benefits"; title: string; benefits: { emoji: string; label: string }[]; newsletterTitle: string; newsletterText: string }
  | { __component: "blocks.cards"; title: string; cards: { icon: PagePictogram; title: string; points: string }[] }
  | { __component: "blocks.stories"; title: string; intro: string | null; stories: { image: PageMedia; domain: string; story: string; publisher: string; logo: PageMedia }[] }
  | { __component: "blocks.faq"; title: string; intro: string | null; questions: { icon: PagePictogram; question: string; answer: string }[] }
  | { __component: "blocks.partners"; title: string; partners: { name: string; description: string; url: string | null; logo: PageMedia }[] };

export type Page = {
  title: string;
  slug: string;
  seoTitle: string;
  seoDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  noindex: boolean;
  blocks: PageBlock[];
};
