import type { MissionBrowse, MissionBrowseFilters } from "@engagement/dto";
import { useEffect, useRef } from "react";
import { useLoaderData, useNavigate } from "react-router";

import HeroWebp from "~/assets/images/landings/defis-engagement/hero.webp";
import AscPng from "~/assets/images/logo/asc-logo.png";
import JvaPng from "~/assets/images/logo/jva-logo.png";
import RocPng from "~/assets/images/logo/roc-logo.png";
import SpvPng from "~/assets/images/logo/spv-logo.png";
import CadreMineurs from "~/components/landings/defis-engagement/cadre-mineurs";
import Histoires from "~/components/landings/defis-engagement/histoires";
import Questions from "~/components/landings/defis-engagement/questions";
import TerrainDeJeu from "~/components/landings/defis-engagement/terrain-de-jeu";
import Etapes from "~/components/landings/etapes";
import Hero from "~/components/landings/hero";
import Missions from "~/components/landings/missions";
import Partners from "~/components/layout/partners";
import Highlight from "~/components/ui/highlight";
import { type Partner } from "~/config/partners";
import { browseMissions } from "~/services/api/missions";
import { registerLandingOrigin } from "~/services/tracking";
import { trackCtaClicked, trackPageViewed } from "~/services/tracking/events";
import type { CtaSection, LandingCta, QuizEntrySection } from "~/services/tracking/types";
import { useQuizStore } from "~/stores/quiz";

import type { Route } from "./+types/defis-engagement";
import { pageMeta } from "~/utils/seo";

// Les 4 missions mises en avant (demande des testeurs) : deux bénévolats ouverts aux mineurs (solidarité
// et environnement), un service civique sportif et la réserve de la Gendarmerie. Un créneau sans résultat
// est simplement absent du carrousel.
const MISSION_SLOTS: MissionBrowseFilters[] = [
  { dispositif: "benevolat", domaine_engagement: "solidarite_inclusion", tranche_age: "moins_18_ans" },
  { dispositif: "service_civique", domaine_engagement: "sport", tranche_age: "moins_18_ans" },
  { dispositif: "benevolat", domaine_engagement: "environnement_animaux", tranche_age: "moins_18_ans" },
  { dispositif: "reserve_gendarmerie" },
];

// Partenaires affichés en bas de la landing. Les liens pointent vers des campagnes dédiées à la landing,
// pour attribuer les clics à cette page.
const PARTNERS: Partner[] = [
  {
    name: "JeVeuxAider.gouv.fr",
    description: "La plateforme publique du bénévolat.",
    logo: JvaPng,
  },
  {
    name: "Le Service Civique",
    description: "De 6 à 12 mois, des missions d'intérêt général indemnisées.",
    logo: AscPng,
  },
  {
    name: "Sapeurs-pompiers de France",
    description: "Deviens sapeur-pompier volontaire près de chez toi.",
    logo: SpvPng,
  },
  {
    name: "Gendarmerie nationale",
    description: "Deviens gendarme près de chez toi.",
    logo: RocPng,
  },
];

// CTA "voir les missions" partagé par les blocs Missions, Questions et Témoignages : même destination
// (liste pré-filtrée sur les mineurs) et même wording, définis ici une seule fois.
const MISSIONS_CTA = { to: "/missions?tranche_age=moins_18_ans", label: "Voir toutes les missions" };

export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  return pageMeta(location, {
    title: "Les défis de l'engagement | Trouve ta mission",
    description: "Des missions d'engagement en bénévolat, service civique, pompiers ou réservistes dès 16 ans, dans un cadre pensé pour les mineurs.",
    ogTitle: "Les défis de l'engagement",
    ogDescription: "Dès 16 ans, trouve la mission d'engagement qui te ressemble.",
  });
}

export async function loader({ request }: Route.LoaderArgs): Promise<{ missions: MissionBrowse[] }> {
  const browse = async (filters: MissionBrowseFilters) => {
    try {
      const res = await browseMissions(filters, request);
      return res.data;
    } catch {
      return [];
    }
  };

  // Les missions mises en avant, puis 10 missions ouvertes aux mineurs prises sur une page tirée au
  // hasard parmi les 10 premières, pour varier le carrousel d'une visite à l'autre.
  const results = await Promise.all([
    ...MISSION_SLOTS.map((slot) => browse({ ...slot, pageSize: 1 })),
    browse({ tranche_age: "moins_18_ans", pageSize: 10, page: Math.ceil(Math.random() * 10) }),
  ]);

  // Dédoublonnage : une mission mise en avant peut aussi ressortir dans le complément.
  const missions = new Map(results.flat().map((mission) => [mission.id, mission]));

  return { missions: [...missions.values()] };
}

export default function DefisEngagement() {
  const { missions } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const reset = useQuizStore((s) => s.reset);
  const pageViewedFired = useRef(false);

  useEffect(() => {
    if (pageViewedFired.current) return;
    pageViewedFired.current = true;
    // Super property de session : relie les évènements suivants (page.viewed /missions, quiz.*, etc.) à cette landing.
    registerLandingOrigin("defis_engagement");
    trackPageViewed({ pageName: "landing_defis_engagement" });
  }, []);

  const handleStartQuiz = (section: QuizEntrySection) => {
    // reset() regénère quiz_attempt_id : le tracer avant émettrait cta.clicked avec l'ancien id et le
    // détacherait du funnel (quiz.started et la suite portent le nouvel id). On réinitialise donc d'abord.
    reset("/defis-engagement");
    trackCtaClicked({ pageName: "landing_defis_engagement", ctaSection: section, ctaLabel: "Trouve ta mission", ctaDestination: "quiz", destinationPath: "/quiz/age" });
    navigate("/quiz/age", { state: { entrySource: "landing_defis_engagement_cta", entrySection: section } });
  };

  const missionsCta = (section: CtaSection): LandingCta => ({
    ...MISSIONS_CTA,
    onClick: () =>
      trackCtaClicked({
        pageName: "landing_defis_engagement",
        ctaSection: section,
        ctaLabel: MISSIONS_CTA.label,
        ctaDestination: "missions_list",
        destinationPath: MISSIONS_CTA.to,
      }),
  });

  return (
    <main id="contenu" tabIndex={-1} className="flex flex-col gap-16! md:gap-24!">
      <Hero
        kicker="Tu veux te rendre utile ?"
        title="À chacun sa façon d'agir"
        description="Des missions d'engagement en bénévolat, Service Civique, pompiers ou réservistes dans la gendarmerie dès 16 ans pour changer les choses (même un peu)."
        hint="Réponds en quelques clics, on te propose une mission qui te correspond"
        onStartQuiz={() => handleStartQuiz("hero")}
        className="bg-beige-gris-galet-975 md:min-h-130 lg:min-h-[max(664px,46vw)]"
      >
        {/* Visuel calé en bas de la section : sous le texte sur mobile, à droite à partir de la tablette (le débord
            à droite sur tablette est rogné par la section, comme dans la maquette). */}
        <img src={HeroWebp} alt="" className="mx-auto aspect-774/662 w-[97%] md:absolute md:bottom-0 md:left-[45.3%] md:mt-0 md:w-[60.2%] lg:right-0 lg:left-auto lg:w-[53.75%]" />
      </Hero>
      <Missions
        missions={missions}
        cta={missionsCta("missions")}
        title={
          <>
            Des missions à <Highlight className="bg-[#9ef9be] dark:bg-transparent">ne pas louper</Highlight> !
          </>
        }
        description="Accompagner une personne en difficulté, protéger la nature, organiser des événements, aider des personnes isolées, s'engager pour son pays… Découvre les missions qui te correspondent !"
        landing="landing_defis_engagement"
        backTo="/defis-engagement"
      />
      <Etapes onStartQuiz={() => handleStartQuiz("etapes")} />
      <TerrainDeJeu />
      <Questions cta={missionsCta("questions")} />
      <CadreMineurs />
      <Histoires cta={missionsCta("histoires")} />
      <Partners style="compact" squareArrows partners={PARTNERS} title="Toutes les missions d’engagement vérifiées par l'État" description={null} />
    </main>
  );
}
