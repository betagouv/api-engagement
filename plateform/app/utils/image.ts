// Images des missions (photos, logos) servies par /api/image, redimensionnées à leur taille d'affichage : les
// originaux font souvent plusieurs centaines de Ko, jusqu'à 1 Mo pour un logo affiché en 32 px.

// Domaines dont le serveur accepte d'aller chercher les images : notre bucket et les flux partenaires les plus
// fréquents. Une image hébergée ailleurs est affichée telle quelle, sans passer par /api/image.
export const RESIZABLE_IMAGE_HOSTS = ["api-engagement-bucket.s3.fr-par.scw.cloud", "jeveuxaider.fra1.digitaloceanspaces.com", "www.devenir-gendarme.com"];

// Largeurs servies, pour les écrans haute densité : liste fermée pour que le cache serve et qu'on ne puisse pas
// faire calculer n'importe quelle taille au serveur.
export const IMAGE_WIDTHS = {
  // Logos affichés en 32 à 56 px.
  logo: 128,
  // Photos des cartes mission (~400 px de large).
  card: 800,
  // Photo de la fiche mission (jusqu'à ~600 px de large).
  detail: 1200,
} as const;

export type ImageWidth = (typeof IMAGE_WIDTHS)[keyof typeof IMAGE_WIDTHS];

export const isResizableImageUrl = (url: URL): boolean => url.protocol === "https:" && RESIZABLE_IMAGE_HOSTS.includes(url.hostname);

export const resizedImageUrl = (url: string, width: ImageWidth): string => {
  try {
    if (!isResizableImageUrl(new URL(url))) return url;
  } catch {
    return url;
  }
  return `/api/image?url=${encodeURIComponent(url)}&w=${width}`;
};
