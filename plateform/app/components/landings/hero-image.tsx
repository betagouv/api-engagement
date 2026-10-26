import type { PageMedia } from "@engagement/dto";

// Visuel du hero fourni par le CMS : sous le texte sur mobile, calé en bas à droite à partir de la tablette
// (même emplacement que le visuel de campagne). Sans texte alternatif renseigné, l'image est décorative.
export default function HeroImage({ image }: { image: PageMedia }) {
  return (
    <div className="relative md:absolute md:right-0 md:bottom-0 md:w-[64%] lg:w-[73%]">
      <img src={image.url} alt={image.alternativeText ?? ""} width={image.width ?? undefined} height={image.height ?? undefined} className="block h-auto w-full" />
    </div>
  );
}
