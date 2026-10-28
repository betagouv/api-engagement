import type { MissionBrowse } from "@engagement/dto";
import type { CSSProperties } from "react";

import BonPourToi from "~/components/landings/chacun-pour-tous/bon-pour-toi";
import EtapesVie from "~/components/landings/chacun-pour-tous/etapes-vie";
import HeroVisual from "~/components/landings/chacun-pour-tous/hero-visual";
import Histoires from "~/components/landings/chacun-pour-tous/histoires";
import Questions from "~/components/landings/chacun-pour-tous/questions";
import Etapes from "~/components/landings/etapes";
import Hero from "~/components/landings/hero";
import HeroImage from "~/components/landings/hero-image";
import Missions from "~/components/landings/missions";
import Partners from "~/components/layout/partners";
import InlineText from "~/components/ui/inline-text";
import RichText from "./rich-text";
import type { CtaSection, LandingCta, LandingName, QuizEntrySection } from "~/services/tracking/types";
import type { PageBlock } from "~/types/page";

import { PICTOGRAMS } from "./pictograms";

const HIGHLIGHT_GREEN = "bg-[#9ef9be] dark:bg-transparent";
const HIGHLIGHT_YELLOW = "bg-yellow-tournesol-925 dark:bg-transparent";
const BACKGROUNDS = { creme: "bg-brown-cafe-creme-975", galet: "bg-beige-gris-galet-975" } as const;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

// Contexte partagé par les blocs : nom de la page (tracking), chemin de retour depuis une fiche mission, CTA.
export type PageBlocksContext = {
  landing: LandingName;
  path: string;
  missionsByBlock: Record<number, MissionBrowse[]>;
  onStartQuiz: (section: QuizEntrySection) => void;
  missionsCta: (section: CtaSection) => LandingCta;
};

// Registre des blocs du CMS (`__component`) → composants de plateform. Un bloc inconnu est ignoré :
// un contenu publié avec un bloc pas encore déployé ne fait pas tomber la page.
export default function PageBlocks({ blocks, context }: { blocks: PageBlock[]; context: PageBlocksContext }) {
  return blocks.map((block, index) => <Block key={`${block.__component}-${index}`} block={block} index={index} context={context} />);
}

function Block({ block, index, context }: { block: PageBlock; index: number; context: PageBlocksContext }) {
  switch (block.__component) {
    case "blocks.hero": {
      const campaignVisual = !block.image && block.visual === "chacun_pour_tous";
      // La couleur du CMS passe par une variable CSS ; en thème sombre, on retombe sur le fond DSFR.
      const color = block.backgroundColor && HEX_COLOR.test(block.backgroundColor) ? block.backgroundColor : null;
      return (
        <Hero
          title={block.title}
          titleClassName={campaignVisual ? "lg:w-184 lg:text-[80px]! lg:leading-22!" : undefined}
          description={<InlineText text={block.description} />}
          hint={block.hint ?? undefined}
          onStartQuiz={() => context.onStartQuiz("hero")}
          style={color ? ({ "--hero-bg": color } as CSSProperties) : undefined}
          className={`${color ? "bg-(--hero-bg) dark:bg-background" : ""} ${block.image || campaignVisual ? "md:min-h-130 lg:min-h-[max(664px,51.6vw)]" : ""}`}
        >
          {block.image ? <HeroImage image={block.image} /> : campaignVisual && <HeroVisual />}
        </Hero>
      );
    }
    case "blocks.rich-text":
      return (
        <section className="fr-container max-w-3xl">
          {block.title && <h2>{block.title}</h2>}
          <RichText nodes={block.body} />
        </section>
      );
    case "blocks.image":
      // Sans texte alternatif renseigné dans la médiathèque, l'image est décorative.
      return (
        <figure className="fr-container max-w-3xl">
          <img
            src={block.image.url}
            alt={block.image.alternativeText ?? ""}
            width={block.image.width ?? undefined}
            height={block.image.height ?? undefined}
            loading="lazy"
            className="h-auto max-w-full"
          />
          {block.caption && <figcaption className="fr-text--xs mt-2">{block.caption}</figcaption>}
        </figure>
      );
    case "blocks.missions":
      return (
        <Missions
          missions={context.missionsByBlock[index] ?? []}
          cta={context.missionsCta("missions")}
          title={<InlineText text={block.title} highlightClassName={HIGHLIGHT_GREEN} />}
          description={block.description}
          landing={context.landing}
          backTo={context.path}
          examples={block.examples}
          className={block.background === "creme" ? BACKGROUNDS.creme : undefined}
        />
      );
    case "blocks.etapes":
      return <Etapes etapes={block.items.map((item) => ({ ...item, icon: PICTOGRAMS[item.icon] }))} onStartQuiz={() => context.onStartQuiz("etapes")} />;
    case "blocks.benefits":
      return (
        <BonPourToi
          title={<InlineText text={block.title} />}
          benefices={block.benefits}
          newsletterTitle={<InlineText text={block.newsletterTitle} />}
          newsletterText={block.newsletterText}
        />
      );
    case "blocks.cards":
      return (
        <EtapesVie
          title={<InlineText text={block.title} highlightClassName={HIGHLIGHT_GREEN} />}
          etapes={block.cards.map((card) => ({ icon: PICTOGRAMS[card.icon], title: card.title, points: card.points.split("\n").filter(Boolean) }))}
          onStartQuiz={() => context.onStartQuiz("etapes_vie")}
          cta={context.missionsCta("etapes_vie")}
        />
      );
    case "blocks.stories":
      return (
        <Histoires
          title={<InlineText text={block.title} highlightClassName={HIGHLIGHT_GREEN} breakClassName="hidden md:block" />}
          intro={block.intro && <InlineText text={block.intro} />}
          histoires={block.stories.map((story) => ({ ...story, image: story.image.url, logo: story.logo.url }))}
          cta={context.missionsCta("histoires")}
        />
      );
    case "blocks.faq":
      return (
        <Questions
          title={<InlineText text={block.title} highlightClassName={HIGHLIGHT_YELLOW} />}
          intro={block.intro && <InlineText text={block.intro} linkClassName="fr-link fr-text--lg!" />}
          questions={block.questions.map((question) => ({ ...question, icon: PICTOGRAMS[question.icon] }))}
        />
      );
    case "blocks.partners":
      return (
        <Partners
          style="compact"
          squareArrows
          title={block.title}
          description={null}
          partners={block.partners.map((partner) => ({ name: partner.name, description: partner.description, url: partner.url ?? undefined, logo: partner.logo.url }))}
        />
      );
    default:
      return null;
  }
}
