import type { ReactNode } from "react";

// Hero partagé par les landings : texte et CTA quiz à gauche, visuel (`children`) sous le texte sur mobile.
// Le visuel se positionne lui-même à partir de la tablette (calé en bas à droite de la section) ;
// `className` porte le fond et la hauteur minimale propres à chaque landing.
export default function Hero({
  kicker,
  title,
  titleClassName = "lg:text-[80px]! lg:leading-22!",
  description,
  descriptionClassName = "",
  hint,
  onStartQuiz,
  className = "",
  children,
}: {
  kicker?: string;
  title: ReactNode;
  // Taille desktop du titre (80px par défaut) et largeur propre à chaque landing : une landing qui le passe
  // redonne aussi la taille, sinon deux `lg:text-*` se contrediraient.
  titleClassName?: string;
  description: ReactNode;
  descriptionClassName?: string;
  // Sans `onStartQuiz`, pas de CTA quiz (ni d'indication) sous la description.
  hint?: string;
  onStartQuiz?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`relative overflow-hidden rounded-b-[20px] md:rounded-none ${className}`}>
      <div className="fr-container relative z-10">
        <div className="pt-8 md:max-w-98 md:pt-11 lg:max-w-156 lg:pt-24">
          {kicker && <p className="fr-h4 text-title-grey! mb-0! md:mb-2! lg:text-[32px]! lg:leading-10!">{kicker}</p>}
          <h1 className={`text-title-grey! fr-mb-2w text-[40px]! leading-12! ${titleClassName}`}>{title}</h1>
          <p className={`fr-text--lead mb-8! md:mb-6! ${descriptionClassName}`}>{description}</p>

          {onStartQuiz && (
            <>
              <button type="button" onClick={onStartQuiz} className="fr-btn fr-btn--lg w-full! justify-center! md:max-w-60!">
                Trouve ta mission
              </button>
              <p className="fr-text--xs text-mention-grey fr-mt-1w mb-0! text-center italic md:max-w-60! md:text-left">{hint}</p>
            </>
          )}
        </div>
      </div>

      {children}
    </section>
  );
}
