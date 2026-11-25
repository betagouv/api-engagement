import type { LoaderFunctionArgs } from "react-router";
import sharp from "sharp";

import { logServerError } from "~/services/sentry.server";
import { IMAGE_WIDTHS, isResizableImageUrl } from "~/utils/image";

const ALLOWED_WIDTHS: number[] = Object.values(IMAGE_WIDTHS);
const FETCH_TIMEOUT_MS = 5000;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const WEBP_QUALITY = 75;

// Les images source changent rarement : un jour de cache navigateur, puis une semaine de revalidation en arrière-plan.
const CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800";

// Images déjà redimensionnées, gardées en mémoire par conteneur (~30 Ko l'une, soit ~15 Mo au plus) : sans CDN
// devant plateform, chaque nouveau visiteur redemanderait le même calcul. Les plus anciennes sortent en premier.
const CACHE_MAX_ENTRIES = 500;

type Image = { body: Buffer; contentType: string };
const resizedImages = new Map<string, Image>();

const fetchSourceImage = async (sourceUrl: URL): Promise<Image> => {
  // Pas de redirection suivie : elle pourrait mener hors des domaines autorisés.
  const response = await fetch(sourceUrl, { redirect: "error", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Image source en erreur (${response.status})`);
  if (Number(response.headers.get("content-length")) > MAX_SOURCE_BYTES) throw new Error("Image source trop lourde");

  const body = Buffer.from(await response.arrayBuffer());
  if (body.length > MAX_SOURCE_BYTES) throw new Error("Image source trop lourde");
  return { body, contentType: response.headers.get("content-type") ?? "" };
};

const resizeImage = async (source: Image, width: number): Promise<Image> => {
  const resized = await sharp(source.body, { animated: true }).autoOrient().resize({ width, withoutEnlargement: true }).webp({ quality: WEBP_QUALITY }).toBuffer();
  // Une source déjà plus légère (AVIF, petite image bien compressée) est servie telle quelle.
  if (resized.length >= source.body.length && source.contentType.startsWith("image/")) return source;
  return { body: resized, contentType: "image/webp" };
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { searchParams } = new URL(request.url);
  const width = Number(searchParams.get("w"));

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(searchParams.get("url") ?? "");
  } catch {
    return new Response("Invalid url", { status: 400 });
  }
  if (!isResizableImageUrl(sourceUrl) || !ALLOWED_WIDTHS.includes(width)) return new Response("Invalid url or width", { status: 400 });

  const cacheKey = `${width}:${sourceUrl.href}`;
  let image = resizedImages.get(cacheKey);

  if (!image) {
    try {
      image = await resizeImage(await fetchSourceImage(sourceUrl), width);
    } catch (error) {
      // L'image reste affichée, simplement sans le gain : on renvoie vers l'original (domaine autorisé uniquement).
      logServerError(request, "image_resize_error", error, { host: sourceUrl.hostname, width });
      return Response.redirect(sourceUrl.href, 302);
    }
    if (resizedImages.size >= CACHE_MAX_ENTRIES) resizedImages.delete(resizedImages.keys().next().value as string);
    resizedImages.set(cacheKey, image);
  }

  return new Response(new Uint8Array(image.body), { headers: { "Content-Type": image.contentType, "Cache-Control": CACHE_CONTROL } });
}
