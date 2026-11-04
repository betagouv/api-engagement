import PodcastSvg from "@gouvfr/dsfr/dist/artwork/pictograms/leisure/podcast.svg?url";
import { useState } from "react";

import type { CmsMedia } from "~/types/cms";

export type Testimonial = { image: CmsMedia; quote: string; name: string; role: string };

const ARROW_CLASS_NAME = "fr-btn fr-btn--tertiary fr-icon--md size-12! max-h-none! max-w-none! justify-center! before:mr-0!";

// Témoignages affichés un par un (photo + citation), avec flèches de navigation en boucle, pilotés par le CMS.
export default function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  const [index, setIndex] = useState(0);

  const testimonial = testimonials[index];
  if (!testimonial) return null;

  const showPrevious = () => setIndex((current) => (current - 1 + testimonials.length) % testimonials.length);
  const showNext = () => setIndex((current) => (current + 1) % testimonials.length);

  return (
    <section className="fr-container">
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-16 lg:mx-auto lg:max-w-[1034px]">
        <div className="bg-blue-france-950 shrink-0 p-3 md:w-80 lg:w-107">
          <img
            src={testimonial.image.url}
            alt={testimonial.image.alternativeText ?? ""}
            width={testimonial.image.width ?? undefined}
            height={testimonial.image.height ?? undefined}
            loading="lazy"
            className="aspect-[403/441] w-full object-cover"
          />
        </div>

        <div className="flex flex-col gap-6">
          <img src={PodcastSvg} alt="" aria-hidden="true" className="size-15" />

          {/* Annonce le témoignage affiché quand on navigue avec les flèches. */}
          <figure aria-live="polite" className="m-0!">
            <blockquote className="m-0!">
              <p className="fr-h4 text-title-grey mb-6!">“{testimonial.quote}”</p>
            </blockquote>
            <figcaption className="text-mention-grey">
              <span className="font-bold">{testimonial.name}</span> {testimonial.role}
            </figcaption>
          </figure>

          {testimonials.length > 1 && (
            <div className="flex gap-6">
              <button type="button" onClick={showPrevious} aria-label="Témoignage précédent" className={`${ARROW_CLASS_NAME} fr-icon-arrow-left-line`} />
              <button type="button" onClick={showNext} aria-label="Témoignage suivant" className={`${ARROW_CLASS_NAME} fr-icon-arrow-right-line`} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
