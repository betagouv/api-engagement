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

import type { Route } from "./+types/_index";

import type { MissionBrowse } from "@engagement/dto";
import LandingPng from "~/assets/images/people-landing.png";

const EXAMPLES_COUNT = 5;

export function meta(): Route.MetaDescriptors {
  return [
    { title: "Trouve ta mission d'engagement — API Engagement" },
    { name: "description", content: "À chacun sa façon d'agir. Bénévolat, service civique, réserve : trouve la mission d'engagement qui te ressemble près de chez toi." },
    { property: "og:title", content: "Trouve ta mission d'engagement" },
    { property: "og:description", content: "Bénévolat, service civique, réserve : trouve la mission qui te ressemble." },
    { property: "og:type", content: "website" },
  ];
}

export async function loader({ request }: Route.LoaderArgs): Promise<{ examples: MissionBrowse[] }> {
  try {
    const res = await browseMissions({ pageSize: EXAMPLES_COUNT }, request);
    return {
      examples: res.data.slice(0, EXAMPLES_COUNT),
    };
  } catch {
    return { examples: [] };
  }
}

export default function Landing() {
  const { examples } = useLoaderData<typeof loader>();
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
          <Hero onStartQuiz={handleStartQuiz} />
          <div className="relative overflow-hidden w-full md:absolute md:right-[-140px] md:top-0 md:h-[640px] md:w-auto md:max-w-[1024px]">
            <svg
              aria-hidden
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute left-1/2 top-0 -translate-x-1/2 h-[680px] w-[680px] md:top-[20px] md:h-[480px] md:w-[580px] text-yellow-moutarde-975 dark:text-transparent"
            >
              <ellipse cx="50" cy="50" rx="50" ry="50" fill="currentColor" />
            </svg>
            <img src={LandingPng} alt="" className="relative block object-cover h-[420px] w-full md:h-[640px] md:w-auto md:object-contain" />
          </div>
        </div>
        <MissionExamples missions={examples} className="-mt-14 md:-mt-16" />
      </GradientBg>
      <HowItWorks />
      <Testimonials />
      <ProSpace />
      <Partners style="compact" />
      <Newsletter title="Inscris-toi à la newsletter" subtitle="1 email. Pas de spam." ctaText="Je m'inscris" hintText="Tu te désinscris quand tu veux." />
    </main>
  );
}
