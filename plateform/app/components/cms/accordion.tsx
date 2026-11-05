import { useId, useState, type ReactNode } from "react";

import type { CmsMedia, CmsRichTextNode } from "~/types/cms";
import RichText from "./rich-text";

export type AccordionQuestion = { question: string; answer: CmsRichTextNode[] };

// Questions fréquentes en accordéons DSFR (une seule question ouverte à la fois), lien vers plus de réponses et avatars
// de l'équipe, pilotés par le CMS. Le JS du DSFR n'est pas chargé : l'ouverture est gérée par React, le style par le DSFR
// (`aria-expanded` sur le bouton, `fr-collapse--expanded` sur le panneau).
export default function Accordion({
  title,
  questions,
  linkLabel,
  linkUrl,
  teamPhotos,
}: {
  title: ReactNode;
  questions: AccordionQuestion[];
  linkLabel: string | null;
  linkUrl: string | null;
  teamPhotos: CmsMedia[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const id = useId();

  return (
    <section className="fr-container flex flex-col items-center gap-10 md:gap-14">
      <h2 className="fr-h2 mb-0! text-center">{title}</h2>

      <div className="fr-accordions-group w-full lg:max-w-5xl">
        {questions.map((item, index) => {
          const open = openIndex === index;
          return (
            <section key={item.question} className="fr-accordion">
              <h3 className="fr-accordion__title">
                <button type="button" className="fr-accordion__btn" aria-expanded={open} aria-controls={`${id}-${index}`} onClick={() => setOpenIndex(open ? null : index)}>
                  {item.question}
                </button>
              </h3>
              {/* Réponse en texte riche (paragraphes, listes, liens) : pas de marge sous le dernier élément. */}
              <div id={`${id}-${index}`} className={`fr-collapse [&>*:last-child]:mb-0! ${open ? "fr-collapse--expanded" : ""}`}>
                <RichText nodes={item.answer} />
              </div>
            </section>
          );
        })}
      </div>

      {linkLabel && linkUrl && (
        <a href={linkUrl} className="fr-btn fr-btn--tertiary fr-btn--lg">
          {linkLabel}
        </a>
      )}

      {teamPhotos.length > 0 && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex">
            {teamPhotos.map((photo) => (
              <img key={photo.url} src={photo.url} alt="" loading="lazy" className="bg-beige-gris-galet-850 -mr-2 size-14 rounded-full object-cover last:mr-0" />
            ))}
          </div>
          <p className="text-title-grey mb-0! text-xl leading-7">
            <span className="font-bold">L’équipe de TrouveTaMission.gouv.fr</span>
            <br />
            est là pour t’aider
          </p>
        </div>
      )}
    </section>
  );
}
