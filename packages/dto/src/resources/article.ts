import type { PageBlock, PageMedia } from "./page";

// Article de blog édité dans le CMS (Strapi, `cms/`), lu par plateform. Les schémas Strapi (`cms/src/**`) restent la
// source de vérité : tout changement de champ doit être répercuté ici.
export type ArticleCategory = {
  name: string;
  slug: string;
};

export type ArticleSummary = {
  title: string;
  slug: string;
  excerpt: string;
  // Date éditoriale (AAAA-MM-JJ).
  publicationDate: string;
  author: string | null;
  cover: PageMedia | null;
  category: ArticleCategory | null;
};

// Les blocs d'un article sont un sous-ensemble de ceux d'une page : texte riche, image, missions.
export type Article = ArticleSummary & {
  seoTitle: string | null;
  seoDescription: string | null;
  noindex: boolean;
  blocks: PageBlock[];
};

export type ArticleList = {
  articles: ArticleSummary[];
  page: number;
  pageCount: number;
};
