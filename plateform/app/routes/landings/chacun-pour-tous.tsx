import type { MissionBrowse, MissionBrowseFilters } from "@engagement/dto";
import MailSendSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/mail-send.svg?url";
import SearchSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/search.svg?url";
import SelfTrainingSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/self-training.svg?url";
import { useEffect, useRef } from "react";
import { useLoaderData, useNavigate } from "react-router";

import AscPng from "~/assets/images/logo/asc-logo.png";
import GendarmeriePng from "~/assets/images/logo/gendarmerie-logo.png";
import JvaPng from "~/assets/images/logo/jva-logo.png";
import RocPng from "~/assets/images/logo/roc-logo.png";
import SpvPng from "~/assets/images/logo/spv-logo.png";
import BonPourToi from "~/components/landings/chacun-pour-tous/bon-pour-toi";
import EtapesVie from "~/components/landings/chacun-pour-tous/etapes-vie";
import HeroVisual from "~/components/landings/chacun-pour-tous/hero-visual";
import Histoires from "~/components/landings/chacun-pour-tous/histoires";
import Questions from "~/components/landings/chacun-pour-tous/questions";
import Etapes, { type Etape } from "~/components/landings/etapes";
import Hero from "~/components/landings/hero";
import Missions from "~/components/landings/missions";
import BetaBanner from "~/components/layout/beta-banner";
import Partners from "~/components/layout/partners";
import Highlight from "~/components/ui/highlight";
import { type Partner } from "~/config/partners";
import { browseMissions } from "~/services/api/missions";
import { registerLandingOrigin } from "~/services/tracking";
import { trackCtaClicked, trackPageViewed } from "~/services/tracking/events";
import type { CtaSection, LandingCta, QuizEntrySection } from "~/services/tracking/types";
import { useQuizStore } from "~/stores/quiz";
import { pageMeta } from "~/utils/seo";

import type { Route } from "./+types/chacun-pour-tous";

// Les 4 missions mises en avant, calées sur les exemples de la maquette : bénévolat solidaire, Service Civique
// sportif, pompiers volontaires et bénévolat éducatif. Un créneau sans résultat est simplement absent du carrousel.
const MISSION_SLOTS: MissionBrowseFilters[] = [
  { dispositif: "benevolat", domaine_engagement: "solidarite_inclusion" },
  { dispositif: "service_civique", domaine_engagement: "sport" },
  { dispositif: "sapeurs_pompiers" },
  { dispositif: "benevolat", domaine_engagement: "education" },
];

const ETAPES: Etape[] = [
  {
    icon: SelfTrainingSvg,
    title: "Répondez à quelques questions",
    description: "Un questionnaire simple et rapide pour préciser vos envies, vos disponibilités et les causes qui vous tiennent à cœur.",
  },
  { icon: SearchSvg, title: "Découvrez les missions", description: "On vous propose celles qui correspondent à vos envies et à votre rythme." },
  { icon: MailSendSvg, title: "Commencez à agir", description: "On vous met en relation avec la structure qui a besoin de vous." },
];

const PARTNERS: Partner[] = [
  { name: "Les réserves des armées", description: "Des missions indemnisées de réservistes.", logo: RocPng },
  { name: "JeVeuxAider.gouv.fr", description: "La plateforme publique du bénévolat.", logo: JvaPng },
  { name: "Le Service Civique", description: "De 6 à 12 mois, des missions d'intérêt général indemnisées.", logo: AscPng },
  { name: "Sapeurs-pompiers de France", description: "Devenez sapeur-pompier volontaire près de chez vous.", logo: SpvPng },
  { name: "Gendarmerie nationale", description: "Devenez gendarme près de chez vous.", logo: GendarmeriePng },
];

// CTA "voir les missions" partagé par les blocs Missions, Étapes de vie et Histoires.
const MISSIONS_CTA = { to: "/quiz/age", label: "Trouve ta mission" };

export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  return pageMeta(location, {
    title: "Chacun pour tous | Trouve ta mission",
    description: "S'engager, c'est chacun pour tous ! Bénévolat, Service Civique, pompiers ou réservistes : trouvez la mission d'engagement qui vous ressemble.",
    ogTitle: "Chacun pour tous",
    ogDescription: "En France, 3 personnes sur 4 ont accompli un acte civique dans l'année. Et vous ?",
    robots: "noindex, follow",
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

  // Les missions mises en avant, puis 10 missions prises sur une page tirée au hasard parmi les 10 premières,
  // pour varier le carrousel d'une visite à l'autre.
  const results = await Promise.all([...MISSION_SLOTS.map((slot) => browse({ ...slot, pageSize: 1 })), browse({ pageSize: 10, page: Math.ceil(Math.random() * 10) })]);

  // Dédoublonnage : une mission mise en avant peut aussi ressortir dans le complément.
  const missions = new Map(results.flat().map((mission) => [mission.id, mission]));

  return { missions: [...missions.values()] };
}

export default function ChacunPourTous() {
  const { missions } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const reset = useQuizStore((s) => s.reset);
  const pageViewedFired = useRef(false);

  useEffect(() => {
    if (pageViewedFired.current) return;
    pageViewedFired.current = true;
    // Super property de session : relie les évènements suivants (page.viewed /missions, quiz.*, etc.) à cette landing.
    registerLandingOrigin("chacun_pour_tous");
    trackPageViewed({ pageName: "landing_chacun_pour_tous" });
  }, []);

  const handleStartQuiz = (section: QuizEntrySection) => {
    // reset() regénère quiz_attempt_id : on réinitialise avant de tracer, pour rattacher cta.clicked au nouveau funnel.
    reset("/chacun-pour-tous");
    trackCtaClicked({ pageName: "landing_chacun_pour_tous", ctaSection: section, ctaLabel: "Trouve ta mission", ctaDestination: "quiz", destinationPath: "/quiz/age" });
    navigate("/quiz/age", { state: { entrySource: "landing_chacun_pour_tous_cta", entrySection: section } });
  };

  const missionsCta = (section: CtaSection): LandingCta => ({
    ...MISSIONS_CTA,
    onClick: () =>
      trackCtaClicked({
        pageName: "landing_chacun_pour_tous",
        ctaSection: section,
        ctaLabel: MISSIONS_CTA.label,
        ctaDestination: "missions_list",
        destinationPath: MISSIONS_CTA.to,
      }),
  });

  return (
    <>
      {/* Même bandeau bêta que la page d'accueil, hors du <main> pour ne pas hériter de son espacement entre blocs. */}
      <BetaBanner source="site" />
      <main id="contenu" tabIndex={-1} className="flex flex-col gap-12! md:gap-15!">
        <Hero
          title={"S'engager, c'est chacun pour tous\u00a0!"}
          titleClassName="lg:w-184 lg:text-[80px]! lg:leading-22!"
          description={
            "Vous vous engagez peut-être déjà, sans même vous en rendre compte\u00a0: aider un voisin, donner de votre temps, voter… Et vous êtes loin d'être seul\u00a0: en France, 3 personnes sur 4 ont accompli un acte civique dans l'année. Trouvez la mission qui vous ressemble, près de chez vous et à votre rythme."
          }
          onStartQuiz={() => handleStartQuiz("hero")}
          className="bg-brown-cafe-creme-975 md:min-h-130 lg:min-h-[max(664px,51.6vw)]"
        >
          <HeroVisual />
        </Hero>
        <Missions
          missions={missions}
          cta={missionsCta("missions")}
          title={
            <>
              Mille façons de s'engager. <Highlight className="bg-[#9ef9be] dark:bg-transparent">Laquelle vous ressemble&nbsp;?</Highlight>
            </>
          }
          description={
            <>
              Accompagner une personne en difficulté, protéger la nature, organiser des événements, aider des personnes isolées, s'engager pour son pays… Les occasions d'agir sont
              nombreuses&nbsp;!
              <br />
              Découvrez les missions qui correspondent à vos envies et à vos disponibilités.
            </>
          }
          landing="landing_chacun_pour_tous"
          backTo="/chacun-pour-tous"
          examples
          className="bg-brown-cafe-creme-975"
        />
        <BonPourToi />
        <EtapesVie onStartQuiz={() => handleStartQuiz("etapes_vie")} cta={missionsCta("etapes_vie")} />
        <Histoires cta={missionsCta("histoires")} />
        <Etapes etapes={ETAPES} onStartQuiz={() => handleStartQuiz("etapes")} />
        <Questions />
        <Partners style="compact" squareArrows partners={PARTNERS} title="Toutes les missions d’engagement vérifiées par l'État" description={null} />
      </main>
    </>
  );
}
