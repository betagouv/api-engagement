import { useEffect, useState } from "react";
import { QUIZ_FLOW_VERSION } from "~/config/quiz-flow";
import { TALLY_FEEDBACK_URL } from "~/services/config";
import { trackBetaBannerClicked } from "~/services/tracking/events";
import { dismissBetaBanner, isBetaBannerDismissed, type BetaBannerSource } from "~/utils/beta-banner";

// Pendant le quiz, l'utilisateur n'a pas encore vu ses résultats : on ne peut pas lui demander
// s'ils sont pertinents. D'où deux formulations, aiguillées côté Tally par le champ `source`.
const CONTENT: Record<BetaBannerSource, { title: string; desc: string }> = {
  quiz: {
    title: "Cette plateforme est en version bêta.",
    desc: "Ton avis nous aide à l'améliorer avant le lancement.",
  },
  results: {
    title: "Version bêta : ces résultats te semblent pertinents ?",
    desc: "Dis-nous ce qu'on peut améliorer.",
  },
};

interface BetaBannerProps {
  source: BetaBannerSource;
  // Identifiant transmis à Tally pour recroiser la réponse avec les réponses du quiz dans PostHog :
  // quizAttemptId (super property quiz_attempt_id) pendant le parcours, userScoringId
  // (super property quiz_session_id) sur les résultats.
  session: string;
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

  const { title, desc } = CONTENT[source];
  const href = `${TALLY_FEEDBACK_URL}?source=${encodeURIComponent(source)}&session=${encodeURIComponent(session)}&quiz_version=${encodeURIComponent(QUIZ_FLOW_VERSION)}`;

  return (
    <div className="fr-notice fr-notice--info">
      <div className="fr-container">
        <div className="fr-notice__body">
          <p>
            <span className="fr-notice__title">{title}</span>
            <span className="fr-notice__desc">{desc}</span>
            {/* RGAA 13.x : l'ouverture dans un nouvel onglet est annoncée dans l'intitulé du lien. */}
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
          </p>
          <button type="button" className="fr-btn--close fr-btn" title="Fermer le bandeau" onClick={handleClose}>
            Fermer le bandeau
          </button>
        </div>
      </div>
    </div>
  );
}
