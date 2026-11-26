import sharp from "sharp";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Logos partenaires : affichés entre 32 et 48 px sur le site, 256 px couvrent les écrans haute densité.
export const LOGO_MAX_SIZE = 256;
// Photos de mission : jusqu'à ~600 px de large sur la fiche mission, doublés pour les écrans haute densité.
export const MISSION_PHOTO_MAX_SIZE = 1200;

const WEBP_QUALITY = 80;

// Réduit l'image dans un carré de `maxSize` px (sans jamais l'agrandir) et la convertit en WebP. L'orientation
// EXIF des photos de téléphone est appliquée, puis les métadonnées (dont la position GPS) sont retirées.
// Les GIF animés restent animés.
export const optimizeImage = async (input: Buffer, maxSize: number): Promise<Buffer> => {
  return sharp(input, { animated: true })
    .autoOrient()
    .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
};
