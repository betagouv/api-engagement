// Page ouverte en preview du CMS : l'URL porte le secret (`?preview=`), qu'aucun outil tiers (tracking, Sentry) ne doit collecter.
export const isCmsPreviewLocation = (): boolean => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("preview");
