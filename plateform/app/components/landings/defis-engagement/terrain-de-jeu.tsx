const TAGS = [
  { emoji: "🗓️", label: "À ton rythme" },
  { emoji: "💸", label: "Avec ou sans indemnité" },
  { emoji: "📍", label: "Près de chez toi ou à distance" },
  { emoji: "🎓", label: "Sans diplôme requis ni expérience" },
  { emoji: "♥️", label: "Adapté à tes valeurs" },
];

export default function TerrainDeJeu() {
  return (
    <section className="fr-container">
      <div className="bg-action-high-blue-france rounded p-4 shadow-lg md:p-12 lg:px-[100px]! lg:py-[60px]!">
        <h2 className="fr-h1 text-inverted-blue-france! mb-4!">
          Choisis ton terrain de <span className="text-yellow-moutarde-850">jeu</span>
        </h2>
        <p className="fr-text--lead text-inverted-blue-france! fr-mb-4w">
          Des missions basées sur tes envies, ton lieu et ta disponibilité. Pour que le bonheur des uns, fasse le bonheur des autres.
        </p>

        <ul role="list" className="m-0! flex list-none! flex-wrap gap-2 p-0! md:gap-6">
          {TAGS.map((tag) => (
            <li key={tag.label} className="bg-background text-title-grey flex items-center gap-2 px-2! py-3! text-base font-bold shadow-lg md:gap-4 md:px-6! md:py-5! md:text-2xl">
              <span aria-hidden="true">{tag.emoji}</span>
              {tag.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
