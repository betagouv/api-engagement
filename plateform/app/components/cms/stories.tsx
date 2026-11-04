import type { ReactNode } from "react";
import { Link } from "react-router";

import Carousel from "~/components/ui/carousel";
import type { LandingCta } from "~/services/tracking/types";

export type Story = { image: string; domain: string; story: string; publisher: string; logo: string };

// Carrousel d'histoires (image, domaine, texte, annonceur), piloté par le CMS.
export default function Stories({ cta, title, intro, histoires }: { cta: LandingCta; title: ReactNode; intro?: ReactNode; histoires: Story[] }) {
  return (
    // `overflow-x-clip` : le carrousel dépasse jusqu'au bord de l'écran, sans créer de scroll horizontal.
    <section className="overflow-x-clip">
      <div className="fr-container">
        <div className="bg-brown-cafe-creme-975 @container mx-[calc(50%-50vw)] px-4 py-6 md:mx-0 md:px-6 md:py-14! lg:px-24">
          <h2 className="fr-h1 mb-4!">{title}</h2>
          {intro && <p className="fr-text--lead mb-4! md:mb-6! lg:mb-8!">{intro}</p>}

          <Carousel
            squareArrows
            label="Histoires de personnes engagées"
            previousLabel="Voir les histoires précédentes"
            nextLabel="Voir les histoires suivantes"
            // Débord jusqu'aux bords de l'écran des deux côtés : la marge négative (50vw - 50cqw, soit l'écart entre
            // le bandeau et le bord de l'écran) est compensée par un padding identique, donc les cartes restent
            // alignées sur le titre. `cqw` (le bandeau est un conteneur) plutôt que `%`, que `scroll-padding`
            // calculerait sur la liste elle-même.
            listClassName="ml-[calc(50cqw-50vw)]! mr-[calc(50cqw-50vw)]! pl-[calc(50vw-50cqw)]! pr-[calc(50vw-50cqw)]! scroll-pl-[calc(50vw-50cqw)]!"
            itemClassName="w-[85vw] max-w-82 md:w-82"
            action={
              <Link to={cta.to} onClick={cta.onClick} className="fr-btn fr-btn--secondary fr-btn--lg w-full! justify-center md:w-auto!">
                {cta.label}
              </Link>
            }
          >
            {histoires.map((histoire) => (
              <div key={histoire.story} className="border-border-default-grey bg-background shadow-card flex h-full flex-col border">
                <img src={histoire.image} alt="" loading="lazy" className="h-59 w-full object-cover" />
                <div className="flex flex-1 flex-col gap-3 px-6 py-4">
                  <span className="bg-blue-france-950 text-blue-france-sun w-fit rounded-xl px-2 text-sm font-bold">{histoire.domain}</span>
                  <p className="text-title-grey mb-0!">{histoire.story}</p>
                  <p className="mt-auto! text-mention-grey mb-0! flex items-center gap-2 text-xs">
                    <img src={histoire.logo} alt="" className="size-8 bg-white object-contain" />
                    {histoire.publisher}
                  </p>
                </div>
              </div>
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  );
}
