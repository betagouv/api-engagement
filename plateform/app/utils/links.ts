// Filtres d'URL pour les liens issus du CMS (texte riche, navigation) : jamais de `javascript:` ni d'URL relative au protocole (`//…`).
export const EXTERNAL_URL = /^https?:\/\//i;
export const INTERNAL_URL = /^\/(?!\/)/;
export const SAFE_URL = /^(https?:\/\/|mailto:|tel:|#|\/(?!\/))/i;
