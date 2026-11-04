import type { CmsHeroTagIcon } from "~/types/cms";

// Icône DSFR et couleurs (fond de la pastille d'icône, icône) de chaque pastille du hero.
const TAG_ICONS: Record<CmsHeroTagIcon, { icon: string; className: string }> = {
  team: { icon: "fr-icon-team-line", className: "bg-green-bourgeon-975 text-(--green-emeraude-main-632)" },
  money: { icon: "fr-icon-money-euro-circle-line", className: "bg-brown-caramel-950 text-(--brown-caramel-main-648)" },
  briefcase: { icon: "fr-icon-briefcase-line", className: "bg-blue-france-950 text-(--blue-france-sun-113-625)" },
  plant: { icon: "fr-icon-plant-line", className: "bg-blue-france-950 text-(--blue-france-sun-113-625)" },
  heart: { icon: "fr-icon-heart-line", className: "bg-pink-tuile-950 text-(--pink-tuile-main-556)" },
};

const isExternal = (url: string) => /^https?:\/\//i.test(url);

type HeroLink = { label: string; url: string };

// Sous la description du hero CMS : pastilles, bouton principal (lien, ou quiz à défaut), bouton secondaire et indication.
// Un lien externe s'ouvre dans un nouvel onglet, signalé par l'icône et le titre (RGAA 13.2).
export default function HeroActions({
  tags,
  primary,
  secondary,
  hint,
  onStartQuiz,
}: {
  tags: { icon: CmsHeroTagIcon; label: string }[];
  primary: HeroLink | null;
  secondary: HeroLink | null;
  hint: string | null;
  onStartQuiz: () => void;
}) {
  return (
    <div className="md:max-w-98 lg:max-w-156">
      {tags.length > 0 && (
        <ul role="list" className="m-0! mb-8! flex list-none! flex-wrap gap-2 p-0!">
          {tags.map((tag) => (
            <li key={tag.label} className="bg-background flex items-center gap-2 rounded-full p-1 pr-3! shadow-[0_4px_7px_rgba(0,0,0,0.1)]">
              <span aria-hidden="true" className={`flex size-6 items-center justify-center rounded-full ${TAG_ICONS[tag.icon].className}`}>
                <span className={`${TAG_ICONS[tag.icon].icon} fr-icon--xs`} />
              </span>
              <span className="text-default-grey text-xs">{tag.label}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:gap-6">
        {primary ? (
          <HeroButton link={primary} className="fr-btn--lg" />
        ) : (
          <button type="button" onClick={onStartQuiz} className="fr-btn fr-btn--lg w-full! justify-center! md:w-auto!">
            Trouve ta mission
          </button>
        )}
        {secondary && <HeroButton link={secondary} className="fr-btn--secondary fr-btn--lg" />}
      </div>

      {hint && <p className="fr-text--xs text-mention-grey fr-mt-1w mb-0! italic">{hint}</p>}
    </div>
  );
}

function HeroButton({ link, className }: { link: HeroLink; className: string }) {
  if (!isExternal(link.url)) {
    return (
      <a href={link.url} className={`fr-btn w-full! justify-center! md:w-auto! ${className}`}>
        {link.label}
      </a>
    );
  }
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${link.label} - nouvelle fenêtre`}
      className={`fr-btn fr-btn--icon-right fr-icon-external-link-line w-full! justify-center! md:w-auto! ${className}`}
    >
      {link.label}
    </a>
  );
}
