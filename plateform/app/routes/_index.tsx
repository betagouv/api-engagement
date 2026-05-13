import { useNavigate } from "react-router";
import Hero from "~/components/landing/hero";
import HowItWorks from "~/components/landing/how-it-works";
import MissionExamples from "~/components/landing/mission-examples";
import ProSpace from "~/components/landing/pro-space";
import Testimonials from "~/components/landing/testimonials";
import Newsletter from "~/components/layout/newsletter";
import Partners from "~/components/layout/partners";
import GradientBg from "~/components/ui/gradient-bg";
import { useQuizStore } from "~/stores/quiz";
import type { Route } from "./+types/_index";

import PeoplePng from "~/assets/images/people-landing.png";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "Trouve ta mission d'engagement — API Engagement" },
    { name: "description", content: "À chacun sa façon d'agir. Bénévolat, service civique, réserve : trouve la mission d'engagement qui te ressemble près de chez toi." },
    { property: "og:title", content: "Trouve ta mission d'engagement" },
    { property: "og:description", content: "Bénévolat, service civique, réserve : trouve la mission qui te ressemble." },
    { property: "og:type", content: "website" },
  ];
}

export default function Landing() {
  const navigate = useNavigate();
  const reset = useQuizStore((s) => s.reset);

  const handleStartQuiz = () => {
    reset();
    navigate("/quiz/age");
  };

  return (
    <main>
      <GradientBg className="bg-size-[100%_640px] relative">
        <img src={PeoplePng} alt="" className="absolute right-0 top-0 h-[640px] max-w-[1024px] object-contain" />
        <Hero onStartQuiz={handleStartQuiz} />
        <MissionExamples />
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
