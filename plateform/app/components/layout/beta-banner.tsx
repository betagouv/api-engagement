import { useEffect, useState } from "react";
import { SERVICE_TITLE } from "~/components/layout/header";
import { QUIZ_FLOW_VERSION } from "~/config/quiz-flow";
import { TALLY_FEEDBACK_URL } from "~/services/config";
import { trackBetaBannerClicked } from "~/services/tracking/events";
import { dismissBetaBanner, isBetaBannerDismissed, type BetaBannerSource } from "~/utils/beta-banner";

// Pendant le quiz, l'utilisateur n'a pas encore vu ses résultats : on ne peut pas lui demander
// s'ils sont pertinents. D'où deux formulations, aiguillées côté Tally par le champ `source`.
// Sur l'accueil et les landings (`site`), le bandeau informe seulement de la bêta : pas de lien de feedback.
const CONTENT: Record<BetaBannerSource, { title: string; desc: string; feedback: boolean }> = {
  quiz: {
    title: `${SERVICE_TITLE} est en version bêta.`,
    desc: "Ton avis nous aide à l'améliorer avant le lancement.",
    feedback: true,
  },
  results: {
    title: "Version bêta : ces résultats te semblent pertinents ?",
    desc: "Dis-nous ce qu'on peut améliorer.",
    feedback: true,
  },
  site: {
    title: "Version bêta.",
    desc: "Le site s’améliore en continu avant son lancement.",
    feedback: false,
  },
};

interface BetaBannerProps {
  source: BetaBannerSource;
  // Identifiant transmis à Tally pour recroiser la réponse avec les réponses du quiz dans PostHog :
  // quizAttemptId (super property quiz_attempt_id) pendant le parcours, userScoringId
  // (super property quiz_session_id) sur les résultats. Inutile sans lien de feedback (`site`).
  session?: string;
}

export default function BetaBanner({ source, session }: BetaBannerProps) {
  // Le localStorage n'est lu qu'après montage : le rendu initial est identique côté serveur et client.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(!isBetaBannerDismissed(source, window.localStorage));
    } catch {
      // Storage indisponible (navigation privée, cookies bloqués) : on affiche le bandeau.
      setVisible(true);
    }
  }, [source]);

  const handleClose = () => {
    setVisible(false);
    try {
      dismissBetaBanner(source, window.localStorage);
    } catch {
      // La fermeture reste effective pour la navigation en cours.
    }
  };

  if (!visible) return null;

  const { title, desc, feedback } = CONTENT[source];
  const href =
    feedback && session
      ? `${TALLY_FEEDBACK_URL}?source=${encodeURIComponent(source)}&session=${encodeURIComponent(session)}&quiz_version=${encodeURIComponent(QUIZ_FLOW_VERSION)}`
      : null;

  return (
    <div className="fr-notice fr-notice--info">
      <div className="fr-container">
        <div className="fr-notice__body">
          <p>
            <span className="fr-notice__title">{title}</span>
            <span className="fr-notice__desc">{desc}</span>
            {/* RGAA 13.x : l'ouverture dans un nouvel onglet est annoncée dans l'intitulé du lien. */}
            {href && (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title="Donner mon avis (2 min) - nouvelle fenêtre"
                className="fr-notice__link"
                onClick={() => trackBetaBannerClicked({ source })}
              >
                Donner mon avis (2 min)
              </a>
            )}
          </p>
          <button type="button" className="fr-btn--close fr-btn" title="Fermer le bandeau" onClick={handleClose}>
            Fermer le bandeau
          </button>
        </div>
      </div>
    </div>
  );
}
