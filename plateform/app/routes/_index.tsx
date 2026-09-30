import { Suspense, useEffect, useRef } from "react";
import { Await, useLoaderData, useNavigate } from "react-router";
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
import Spinner from "~/components/ui/spinner";
import { type Partner } from "~/config/partners";
import { browseMissions } from "~/services/api/missions";
import { trackCtaClicked, trackPageViewed } from "~/services/tracking/events";
import type { CtaSection } from "~/services/tracking/types";
import { useQuizStore } from "~/stores/quiz";

import type { Route } from "./+types/_index";

import type { MissionBrowse, MissionBrowseFilters } from "@engagement/dto";

// Un exemple par dispositif d'engagement, dans l'ordre d'affichage du carrousel. Un dispositif
// sans mission disponible est simplement absent.
const MISSION_SLOTS: MissionBrowseFilters[] = [
  { dispositif: "benevolat" },
  { dispositif: "sapeurs_pompiers" },
  { dispositif: "service_civique" },
  { dispositif: "reserve_armees" },
  { dispositif: "reserve_gendarmerie" },
  { dispositif: "reserve_police_nationale" },
];

// Les liens de redirection sont les campagnes dédiées à la page d'accueil, pour attribuer les clics à
// cette page. Les réserves des armées n'ont pas encore de campagne : le nom s'affiche sans lien.
const PARTNERS: Partner[] = [
  {
    name: "Les réserves des armées",
    description: "Des missions indemnisées de réservistes.",
    logo: RocPng,
  },
  {
    name: "Le Service Civique",
    description: "De 6 à 12 mois, des missions d'intérêt général indemnisées.",
    url: "https://api.api-engagement.beta.gouv.fr/r/campaign/b6e310b8-961c-4d2d-a7b4-94b383adce64",
    logo: AscPng,
  },
  {
    name: "JeVeuxAider.gouv.fr",
    description: "La plateforme publique du bénévolat.",
    url: "https://api.api-engagement.beta.gouv.fr/r/campaign/4de09e85-0651-4eff-af78-a825041ef303",
    logo: JvaPng,
  },
  {
    name: "Sapeurs-pompiers de France",
    description: "Deviens sapeur-pompier volontaire près de chez toi.",
    url: "https://api.api-engagement.beta.gouv.fr/r/campaign/e681deef-81d8-40b7-b78f-af40eb29f151",
    logo: SpvPng,
  },
  {
    // Lien direct vers le site de la Gendarmerie : pas de redirection /r/campaign, les clics ne sont donc pas tracés.
    name: "Gendarmerie nationale",
    description: "Deviens gendarme près de chez toi.",
    url: "https://www.gendarmerie.interieur.gouv.fr/reserves/reserve-operationnelle-de-la-gendarmerie-nationale",
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

// Les exemples ne sont pas attendus : la page s'affiche tout de suite et le carrousel se remplit
// quand les 6 appels à l'API arrivent (promesse streamée, résolue dans <Await>).
export function loader({ request }: Route.LoaderArgs): { examples: Promise<MissionBrowse[]> } {
  const browse = async (filters: MissionBrowseFilters) => {
    try {
      const res = await browseMissions({ ...filters, pageSize: 1 }, request);
      return res.data;
    } catch {
      return [];
    }
  };

  const loadExamples = async () => {
    const results = await Promise.all(MISSION_SLOTS.map(browse));
    return results.flat();
  };

  return { examples: loadExamples() };
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
      <Hero onStartQuiz={() => handleStartQuiz("hero")} />
      <Suspense fallback={<Spinner label="Chargement des exemples de missions…" className="fr-container justify-center pt-8" />}>
        <Await resolve={examples}>{(missions) => <MissionExamples missions={missions} />}</Await>
      </Suspense>
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
