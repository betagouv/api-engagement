import type { NavigationLink } from "@engagement/dto";

import { pageUrl } from "~/utils/cms-urls";
import { EXTERNAL_URL, INTERNAL_URL, SAFE_URL } from "~/utils/links";

export type NavLink = { label: string; to: string; internal: boolean; newTab: boolean };

// Transforme les liens du CMS en liens affichables : la page choisie l'emporte sur l'URL libre, les liens vers une page
// dépubliée ou une URL non autorisée sont ignorés, une adresse externe s'ouvre toujours dans un nouvel onglet.
export function resolveNavigationLinks(links: NavigationLink[]): NavLink[] {
  return links.flatMap((link) => {
    const to = link.page ? pageUrl(link.page.slug) : link.url?.trim();
    if (!to || !link.label.trim() || !SAFE_URL.test(to)) return [];
    return [{ label: link.label, to, internal: INTERNAL_URL.test(to), newTab: link.newTab || EXTERNAL_URL.test(to) }];
  });
}
