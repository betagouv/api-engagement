import type { ReactNode } from "react";

// Hero partagé par les landings : texte et CTA quiz à gauche, visuel (`children`) sous le texte sur mobile.
// Le visuel se positionne lui-même à partir de la tablette (calé en bas à droite de la section) ;
// `className` porte le fond et la hauteur minimale propres à chaque landing.
export default function Hero({
  badge,
  kicker,
  title,
  titleClassName = "lg:text-[80px]! lg:leading-22!",
  description,
  descriptionClassName = "",
  contentClassName = "md:max-w-98 lg:max-w-156",
  hint,
  onStartQuiz,
  action,
  className = "",
  children,
}: {
  // Pastille au-dessus du titre (ex. domaine d'une landing thématique).
  badge?: string;
  kicker?: string;
  title: ReactNode;
  // Taille desktop du titre (80px par défaut) et largeur propre à chaque landing : une landing qui le passe
  // redonne aussi la taille, sinon deux `lg:text-*` se contrediraient.
  titleClassName?: string;
  description: ReactNode;
  descriptionClassName?: string;
  // Largeur de la colonne de texte à partir de la tablette (par défaut : colonne étroite à côté du visuel).
  contentClassName?: string;
  // Sans `onStartQuiz`, pas de CTA quiz (ni d'indication) sous la description.
  hint?: string;
  onStartQuiz?: () => void;
  // Bloc affiché sous le texte à la place du CTA quiz (ex. recherche par localisation).
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`relative overflow-hidden rounded-b-[20px] md:rounded-none ${className}`}>
      <div className="fr-container relative z-10">
        <div className={`pt-8 md:pt-11 lg:pt-24 ${contentClassName}`}>
          {badge && <p className="bg-action-low-blue-france text-blue-france-sun mb-2! w-fit rounded-full px-2.5 text-xs leading-5! font-bold uppercase">{badge}</p>}
          {kicker && <p className="fr-h4 text-title-grey! mb-0! md:mb-2! lg:text-[32px]! lg:leading-10!">{kicker}</p>}
          <h1 className={`text-title-grey! fr-mb-2w text-[40px]! leading-12! ${titleClassName}`}>{title}</h1>
          <p className={`fr-text--lead mb-8! md:mb-6! ${descriptionClassName}`}>{description}</p>

          {onStartQuiz && (
            <>
              <button type="button" onClick={onStartQuiz} className="fr-btn fr-btn--lg w-full! justify-center! md:max-w-60!">
                Trouve ta mission
              </button>
              {hint && <p className="fr-text--xs text-mention-grey fr-mt-1w mb-0! text-center italic md:max-w-60! md:text-left">{hint}</p>}
            </>
          )}
        </div>
        {/* Hors de la colonne de texte : peut occuper toute la largeur du conteneur (ex. tablette). */}
        {action}
      </div>

      {children}
    </section>
  );
}
