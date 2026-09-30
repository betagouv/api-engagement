import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import AscPng from "~/assets/images/logo/asc-logo.png";
import GendarmeriePng from "~/assets/images/logo/gendarmerie-logo.png";
import JvaPng from "~/assets/images/logo/jva-logo.png";
import RocPng from "~/assets/images/logo/roc-logo.png";
import SpvPng from "~/assets/images/logo/spv-logo.png";
import About from "~/components/home/about";
import Hero from "~/components/home/hero";
import HowItWorks from "~/components/home/how-it-works";
import MissionExamples from "~/components/home/mission-examples";
import Partners from "~/components/home/partners";
import Testimonials from "~/components/home/testimonials";
import Newsletter from "~/components/layout/newsletter";
import { type Partner } from "~/config/partners";
import { trackCtaClicked, trackPageViewed } from "~/services/tracking/events";
import type { CtaSection } from "~/services/tracking/types";
import { useQuizStore } from "~/stores/quiz";

import type { Route } from "./+types/_index";

const PARTNERS: Partner[] = [
  {
    name: "Les réserves des armées",
    description: "Des missions indemnisées de réservistes.",
    logo: RocPng,
  },
  {
    name: "Le Service Civique",
    description: "De 6 à 12 mois, des missions d'intérêt général indemnisées.",
    logo: AscPng,
  },
  {
    name: "JeVeuxAider.gouv.fr",
    description: "La plateforme publique du bénévolat.",
    logo: JvaPng,
  },
  {
    name: "Sapeurs-pompiers de France",
    description: "Deviens sapeur-pompier volontaire près de chez toi.",
    logo: SpvPng,
  },
  {
    name: "Gendarmerie nationale",
    description: "Deviens gendarme près de chez toi.",
    logo: GendarmeriePng,
  },
];

export function meta(): Route.MetaDescriptors {
  return [
    { title: "Trouve ta mission d'engagement" },
    { name: "description", content: "À chacun sa façon d'agir. Bénévolat, service civique, réserve : trouve la mission d'engagement qui te ressemble près de chez toi." },
    { property: "og:title", content: "Trouve ta mission d'engagement" },
    { property: "og:description", content: "Bénévolat, service civique, réserve : trouve la mission qui te ressemble." },
    { property: "og:type", content: "website" },
  ];
}

export default function Landing() {
  const navigate = useNavigate();
  const reset = useQuizStore((s) => s.reset);
  const pageViewedFired = useRef(false);

  useEffect(() => {
    if (pageViewedFired.current) return;
    pageViewedFired.current = true;
    trackPageViewed({ pageName: "homepage" });
  }, []);

  const handleStartQuiz = (ctaSection: CtaSection) => {
    // reset() regénère quiz_attempt_id : le tracer avant émettrait cta.clicked avec l'ancien id et le
    // découplerait de quiz.started et du reste du funnel PostHog. On reset donc avant de tracer.
    reset();
    trackCtaClicked({ pageName: "homepage", ctaSection, ctaLabel: "Trouve ta mission", ctaDestination: "quiz", destinationPath: "/quiz/age" });
    navigate("/quiz/age", { state: { entrySource: "homepage_cta" } });
  };

  return (
    <main id="contenu" tabIndex={-1}>
      <Hero onStartQuiz={() => handleStartQuiz("hero")} />
      <MissionExamples />
      <HowItWorks onStartQuiz={() => handleStartQuiz("how_it_works")} />
      <Testimonials onStartQuiz={() => handleStartQuiz("testimonials")} />
      <About />
      <Newsletter
        title="Inscris-toi à la newsletter"
        subtitle="1 e-mail par mois avec nos meilleures missions adaptées à tes critères"
        ctaText="Je m'inscris"
        hintText="1 email. Pas de spam. Tu te désinscris quand tu veux."
      />
      <Partners partners={PARTNERS} title="Toutes les missions d'engagement vérifiées par l'État" />
    </main>
  );
}
