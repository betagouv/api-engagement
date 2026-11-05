import type { MissionBrowse, MissionDetailResponse } from "@engagement/dto";

import HeroVisual from "~/components/landings/chacun-pour-tous/hero-visual";
import Etapes from "~/components/landings/etapes";
import Hero from "~/components/landings/hero";
import Missions from "~/components/landings/missions";
import Newsletter from "~/components/layout/newsletter";
import Partners from "~/components/layout/partners";
import Accordion from "./accordion";
import Benefits from "./benefits";
import Cards from "./cards";
import Faq from "./faq";
import HeroActions from "./hero-actions";
import InlineText from "./inline-text";
import MissionDetail from "./mission-detail";
import RichText from "./rich-text";
import Stories from "./stories";
import Testimonials from "./testimonials";
import type { CtaSection, LandingCta, LandingName, QuizEntrySection } from "~/services/tracking/types";
import type { CmsBlock } from "~/types/cms";

import { PICTOGRAMS } from "./pictograms";

const HIGHLIGHT_GREEN = "bg-[#9ef9be] dark:bg-transparent";
const HIGHLIGHT_YELLOW = "bg-yellow-tournesol-925 dark:bg-transparent";
const BACKGROUNDS = { creme: "bg-brown-cafe-creme-975", galet: "bg-beige-gris-galet-975" } as const;

// Contexte partagé par les blocs : nom de la page (tracking), chemin de retour depuis une fiche mission, missions
// chargées par le loader (par index de bloc), CTA.
export type CmsBlocksContext = {
  landing: LandingName;
  path: string;
  missionsByBlock: Record<number, MissionBrowse[]>;
  missionDetailsByBlock: Record<number, MissionDetailResponse>;
  onStartQuiz: (section: QuizEntrySection) => void;
  missionsCta: (section: CtaSection) => LandingCta;
};

// Registre des blocs du CMS (`__component`) → composants de plateform. Un bloc inconnu est ignoré :
// un contenu publié avec un bloc pas encore déployé ne fait pas tomber la page.
export default function CmsBlocks({ blocks, context }: { blocks: CmsBlock[]; context: CmsBlocksContext }) {
  return blocks.map((block, index) => <Block key={`${block.__component}-${index}`} block={block} index={index} context={context} />);
}

function Block({ block, index, context }: { block: CmsBlock; index: number; context: CmsBlocksContext }) {
  switch (block.__component) {
    case "blocks.hero": {
      const campaignVisual = block.visual === "chacun_pour_tous";
      const image = campaignVisual ? null : block.image;
      const mobileImage = block.imageMobile ?? image;
      const primary = block.primaryLabel && block.primaryUrl ? { label: block.primaryLabel, url: block.primaryUrl } : null;
      const secondary = block.secondaryLabel && block.secondaryUrl ? { label: block.secondaryLabel, url: block.secondaryUrl } : null;
      // Sans pastille ni bouton renseigné : hero historique avec le seul bouton quiz.
      const withActions = block.tags.length > 0 || primary || secondary;
      return (
        <Hero
          title={block.title}
          titleClassName={campaignVisual ? "lg:w-184 lg:text-[80px]! lg:leading-22!" : "lg:text-[72px]! lg:leading-20!"}
          description={<InlineText text={block.description} />}
          hint={withActions ? undefined : (block.hint ?? undefined)}
          onStartQuiz={withActions ? undefined : () => context.onStartQuiz("hero")}
          action={withActions && <HeroActions tags={block.tags} primary={primary} secondary={secondary} hint={block.hint} onStartQuiz={() => context.onStartQuiz("hero")} />}
          className={`${BACKGROUNDS.creme} ${campaignVisual ? "md:min-h-130 lg:min-h-[max(664px,51.6vw)]" : image ? "md:min-h-130 lg:min-h-187" : "pb-8 md:pb-11"}`}
        >
          {campaignVisual && <HeroVisual />}
          {/* Visuel du CMS : sous le texte, en pleine largeur et collé au bas du hero sur mobile (image mobile si
              renseignée), calé en bas à droite à partir de la tablette (48em, point de rupture `md` du DSFR). */}
          {image && (
            <picture>
              <source media="(min-width: 48em)" srcSet={image.url} width={image.width ?? undefined} height={image.height ?? undefined} />
              <img
                src={mobileImage?.url}
                alt={image.alternativeText ?? ""}
                width={mobileImage?.width ?? undefined}
                height={mobileImage?.height ?? undefined}
                className="mt-8 block h-auto w-full md:absolute md:right-0 md:bottom-0 md:mt-0 md:w-[46%] lg:w-[56%] lg:max-w-[812px]"
              />
            </picture>
          )}
        </Hero>
      );
    }
    case "blocks.mission-detail": {
      // Mission introuvable ou non diffusée : le bloc est ignoré.
      const mission = context.missionDetailsByBlock[index];
      return mission ? <MissionDetail mission={mission} backUrl={block.backUrl} landing={context.landing} /> : null;
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
        <Benefits
          title={<InlineText text={block.title} />}
          benefices={block.benefits}
          newsletterTitle={<InlineText text={block.newsletterTitle} />}
          newsletterText={block.newsletterText}
        />
      );
    case "blocks.cards":
      return (
        <Cards
          title={<InlineText text={block.title} highlightClassName={HIGHLIGHT_GREEN} />}
          cards={block.cards.map((card) => ({ icon: PICTOGRAMS[card.icon], title: card.title, points: card.points.split("\n").filter(Boolean) }))}
          onStartQuiz={() => context.onStartQuiz("etapes_vie")}
          cta={context.missionsCta("etapes_vie")}
        />
      );
    case "blocks.stories":
      return (
        <Stories
          title={<InlineText text={block.title} highlightClassName={HIGHLIGHT_GREEN} breakClassName="hidden md:block" />}
          intro={block.intro && <InlineText text={block.intro} />}
          histoires={block.stories.map((story) => ({ ...story, image: story.image.url, logo: story.logo.url }))}
          cta={context.missionsCta("histoires")}
        />
      );
    case "blocks.testimonials":
      return <Testimonials testimonials={block.testimonials} />;
    case "blocks.faq":
      return (
        <Faq
          title={<InlineText text={block.title} highlightClassName={HIGHLIGHT_YELLOW} />}
          intro={block.intro && <InlineText text={block.intro} linkClassName="fr-link fr-text--lg!" />}
          questions={block.questions.map((question) => ({ ...question, icon: PICTOGRAMS[question.icon] }))}
        />
      );
    case "blocks.accordion":
      return (
        <Accordion
          title={<InlineText text={block.title} highlightClassName={HIGHLIGHT_YELLOW} />}
          questions={block.questions}
          linkLabel={block.linkLabel}
          linkUrl={block.linkUrl}
          teamPhotos={block.teamPhotos ?? []}
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
    case "blocks.newsletter":
      return <Newsletter title={block.title} subtitle={block.subtitle} ctaText={block.ctaText} hintText={block.hintText} />;
    default:
      return null;
  }
}
