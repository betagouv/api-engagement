import { INBOUND_EMAIL_DOMAIN } from "@/config";

// Adresse d'une fonction par mail entrant : `<préfixe>-<id>@<INBOUND_EMAIL_DOMAIN>` ; le préfixe choisit le handler (voir ./index.ts).
export const buildInboundAddress = (prefix: string, id: string) => `${prefix}-${id}@${INBOUND_EMAIL_DOMAIN}`;

const ADDRESS_RE = /^([a-z]+)-([^@\s]+)@/i;

export const parseInboundAddress = (address: string): { prefix: string; id: string } | null => {
  const [, prefix, id] = ADDRESS_RE.exec(address) ?? [];
  return prefix ? { prefix: prefix.toLowerCase(), id } : null;
};
