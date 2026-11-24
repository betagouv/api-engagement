import { useEffect, useRef } from "react";
import type { MissionBrowseFilters } from "@engagement/dto";
import { useLoaderData, useNavigate } from "react-router";
import About from "~/components/home/about";
import Hero from "~/components/home/hero";
import HowItWorks from "~/components/home/how-it-works";
import MissionExamples from "~/components/home/mission-examples";
import BetaBanner from "~/components/layout/beta-banner";
import Partners from "~/components/layout/partners";
import Testimonials from "~/components/home/testimonials";
import Newsletter from "~/components/layout/newsletter";
import { STATE_PARTNERS, STATE_PARTNERS_TITLE } from "~/config/partners";
import { browseMissions } from "~/services/api/missions";
import { trackCtaClicked, trackPageViewed } from "~/services/tracking/events";
import type { CtaSection } from "~/services/tracking/types";
import { useQuizStore } from "~/stores/quiz";

import type { Route } from "./+types/_index";
import { pageMeta } from "~/utils/seo";

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://trouvetamission.gouv.fr/#website",
      name: "TrouveTaMission.gouv.fr",
      alternateName: ["TrouveTaMission.gouv.fr", "Trouve ta mission"],
      url: "https://trouvetamission.gouv.fr/",
      inLanguage: "fr",
      publisher: { "@id": "https://trouvetamission.gouv.fr/#organization" },
    },
    {
      "@type": "GovernmentOrganization",
      "@id": "https://trouvetamission.gouv.fr/#organization",
      name: "TrouveTaMission.gouv.fr",
      url: "https://trouvetamission.gouv.fr/",
      logo: "https://trouvetamission.gouv.fr/logo.png",
      parentOrganization: { "@type": "GovernmentOrganization", name: "Direction de la Jeunesse, de l'Éducation Populaire et de la Vie Associative (DJEPVA)" },
    },
  ],
};

// Un exemple par dispositif d'engagement, dans l'ordre d'affichage du carrousel. Un dispositif
// sans mission disponible (ou en erreur) est simplement absent.
const MISSION_EXAMPLE_SLOTS: MissionBrowseFilters[] = [
  { dispositif: "sapeurs_pompiers" },
  { dispositif: "service_civique" },
  { dispositif: "reserve_armees" },
  { dispositif: "benevolat" },
  { dispositif: "reserve_gendarmerie" },
  { dispositif: "reserve_police_nationale" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const examples = await Promise.all(
    MISSION_EXAMPLE_SLOTS.map(async (filters) => {
      try {
        const response = await browseMissions({ ...filters, pageSize: 1 }, request);
        return response.data;
      } catch {
        return [];
      }
    }),
  );
  return { examples: examples.flat() };
}

export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  return [
    ...pageMeta(location, {
      title: "S'engager et se rendre utile | TrouveTaMission.gouv.fr",
      description: "Bénévolat, Service Civique, réserves, sapeur-pompier volontaire : trouvez la mission qui vous ressemble, près de chez vous, à distance ou à l'étranger.",
    }),
    { "script:ld+json": STRUCTURED_DATA },
  ];
}

export default function Landing() {
  const { examples } = useLoaderData<typeof loader>();
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
      {/* Test : bandeau bêta en complément du badge bêta du header, sans lien de feedback. */}
      <BetaBanner source="site" />
      <Hero onStartQuiz={() => handleStartQuiz("hero")} />
      <MissionExamples missions={examples} />
      <HowItWorks onStartQuiz={() => handleStartQuiz("how_it_works")} />
      <Testimonials onStartQuiz={() => handleStartQuiz("testimonials")} />
      <About />
      <Newsletter
        title="Inscris-toi à la newsletter"
        subtitle="Chaque mois, des missions liées à l'actualité et un éclairage sur les différentes façons de s'engager."
        ctaText="Je m'inscris"
        hintText="1 e-mail par mois. Tu peux te désinscrire en un clic depuis chaque e-mail."
        signupSource="home_newsletter"
      />
      <Partners style="compact" partners={STATE_PARTNERS} title={STATE_PARTNERS_TITLE} description={null} />
    </main>
  );
}
