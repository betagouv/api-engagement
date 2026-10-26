import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";

import { registerLandingOrigin } from "~/services/tracking";
import { trackCtaClicked, trackPageViewed } from "~/services/tracking/events";
import type { CtaSection, LandingCta, LandingName, QuizEntrySection } from "~/services/tracking/types";
import { useQuizStore } from "~/stores/quiz";

const MISSIONS_CTA = { to: "/quiz/age", label: "Trouver ma mission" };

// Suivi et CTA communs aux contenus du CMS (pages, articles) : `page.viewed` (sauf en preview), parcours quiz et lien
// « voir les missions ». « chacun-pour-tous » → landing_chacun_pour_tous : mêmes évènements que la landing en code.
export function useCmsPage({ origin, trackView }: { origin: string; trackView: boolean }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const reset = useQuizStore((s) => s.reset);
  const pageViewedFired = useRef(false);
  const landing: LandingName = `landing_${origin}`;

  useEffect(() => {
    if (pageViewedFired.current || !trackView) return;
    pageViewedFired.current = true;
    registerLandingOrigin(origin);
    trackPageViewed({ pageName: landing });
  }, [origin, landing, trackView]);

  const onStartQuiz = (section: QuizEntrySection) => {
    // reset() regénère quiz_attempt_id : on réinitialise avant de tracer, pour rattacher cta.clicked au nouveau funnel.
    reset(pathname);
    trackCtaClicked({ pageName: landing, ctaSection: section, ctaLabel: "Trouve ta mission", ctaDestination: "quiz", destinationPath: "/quiz/age" });
    navigate("/quiz/age", { state: { entrySource: `${landing}_cta`, entrySection: section } });
  };

  const missionsCta = (section: CtaSection): LandingCta => ({
    ...MISSIONS_CTA,
    onClick: () => trackCtaClicked({ pageName: landing, ctaSection: section, ctaLabel: MISSIONS_CTA.label, ctaDestination: "missions_list", destinationPath: MISSIONS_CTA.to }),
  });

  return { landing, pathname, onStartQuiz, missionsCta };
}
