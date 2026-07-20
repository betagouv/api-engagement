/**
 * Comportement de défilement respectant `prefers-reduced-motion` (RGAA 13.8).
 * Un `behavior: "smooth"` explicite passé à `scrollBy`/`scrollTo` ignore la
 * propriété CSS `scroll-behavior` : la préférence doit être vérifiée côté JS.
 */
export function getScrollBehavior(): "auto" | "smooth" {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
