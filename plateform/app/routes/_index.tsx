import { useLoaderData, useNavigate } from "react-router";
import Hero from "~/components/landing/hero";
import HowItWorks from "~/components/landing/how-it-works";
import MissionExamples from "~/components/landing/mission-examples";
import ProSpace from "~/components/landing/pro-space";
import Testimonials from "~/components/landing/testimonials";
import Newsletter from "~/components/layout/newsletter";
import Partners from "~/components/layout/partners";
import GradientBg from "~/components/ui/gradient-bg";
import { browseMissions } from "~/services/mission-browse";
import { useQuizStore } from "~/stores/quiz";

import type { Route } from "./+types/_index";

import type { MissionBrowse } from "@engagement/dto";
import PeopleMobilePng from "~/assets/images/people-landing-mobile.png";
import PeoplePng from "~/assets/images/people-landing.png";

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

export async function loader(): Promise<{ examples: MissionBrowse[] }> {
  try {
    const res = await browseMissions({ pageSize: EXAMPLES_COUNT });
    return { examples: res.data.slice(0, EXAMPLES_COUNT) };
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
        <div className="relative md:min-h-[640px]">
          <img src={PeoplePng} alt="" className="absolute hidden md:block right-0 bottom-0 object-contain md:bottom-auto md:top-0 md:h-[640px] md:w-auto md:max-w-[1024px]" />
          <Hero onStartQuiz={handleStartQuiz} />
          <img src={PeopleMobilePng} alt="" className="block md:hidden right-0 bottom-0 object-contain h-[420px] w-full" />
        </div>
        <MissionExamples missions={examples} className="-mt-14 md:-mt-24" />
      </GradientBg>
      <HowItWorks />
      <Testimonials />
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
