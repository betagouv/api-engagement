import { useLoaderData, useNavigate } from "react-router";
import Hero from "~/components/landing/hero";
import HowItWorks from "~/components/landing/how-it-works";
import MissionExamples from "~/components/landing/mission-examples";
import ProSpace from "~/components/landing/pro-space";
import Testimonials from "~/components/landing/testimonials";
import Newsletter from "~/components/layout/newsletter";
import Partners from "~/components/layout/partners";
import GradientBg from "~/components/ui/gradient-bg";
import { browseMissions } from "~/services/api/missions";
import { useQuizStore } from "~/stores/quiz";
import type { BrowseMission } from "~/types/api";
import type { Route } from "./+types/_index";

import LandingPng from "~/assets/images/landing-no-bg.png";

const EXAMPLES_COUNT = 5;
const TESTIMONIALS_COUNT = 4;

export function meta(): Route.MetaDescriptors {
  return [
    { title: "Trouve ta mission d'engagement — API Engagement" },
    { name: "description", content: "À chacun sa façon d'agir. Bénévolat, service civique, réserve : trouve la mission d'engagement qui te ressemble près de chez toi." },
    { property: "og:title", content: "Trouve ta mission d'engagement" },
    { property: "og:description", content: "Bénévolat, service civique, réserve : trouve la mission qui te ressemble." },
    { property: "og:type", content: "website" },
  ];
}

export async function loader({ request }: Route.LoaderArgs): Promise<{ examples: BrowseMission[]; testimonials: BrowseMission[] }> {
  try {
    const res = await browseMissions({ pageSize: EXAMPLES_COUNT + TESTIMONIALS_COUNT }, request);
    return {
      examples: res.data.slice(0, EXAMPLES_COUNT),
      testimonials: res.data.slice(EXAMPLES_COUNT, EXAMPLES_COUNT + TESTIMONIALS_COUNT),
    };
  } catch {
    return { examples: [], testimonials: [] };
  }
}

export default function Landing() {
  const { examples, testimonials } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const reset = useQuizStore((s) => s.reset);

  const handleStartQuiz = () => {
    reset();
    navigate("/quiz/age");
  };

  return (
    <main>
      <GradientBg className="bg-size-[100%_640px]">
        <div className="relative md:min-h-[640px] md:overflow-hidden">
          <img
            src={LandingPng}
            alt=""
            className="absolute hidden md:block right-[-100px] bottom-0 object-contain md:bottom-auto md:top-0 md:h-[640px] md:w-auto md:max-w-[1024px]"
          />
          <Hero onStartQuiz={handleStartQuiz} />
          <img src={LandingPng} alt="" className="block md:hidden right-0 bottom-0 object-contain h-[420px] w-full" />
        </div>
        <MissionExamples missions={examples} className="-mt-14 md:-mt-24" />
      </GradientBg>
      <HowItWorks />
      <Testimonials missions={testimonials} />
      <ProSpace />
      <Partners style="compact" />
      <Newsletter
        title="Inscris-toi à la newsletter"
        subtitle="1 email par mois avec les missions qui pourraient t'intéresser."
        ctaText="Je m'inscris"
        hintText="Tu peux te désinscrire à tout moment"
      />
    </main>
  );
}
