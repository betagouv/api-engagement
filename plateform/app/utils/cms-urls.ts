// Adresses publiques des contenus du CMS : un seul endroit à changer quand les pages passeront de `/cms/:slug` à `/:slug`.
export const BLOG_URL = "/blog";
export const pageUrl = (slug: string) => `/cms/${slug}`;
export const articleUrl = (slug: string) => `${BLOG_URL}/${slug}`;
