const PROFESSIONNELS = [
  "Conseiller France Travail",
  "Conseiller mission locale",
  "PsyEN",
  "Conseiller en orientation",
  "Coach en orientation",
  "Informateur jeunesse",
  "Travailleur social",
  "Enseignant",
  "Animateur",
  "Mentor associatif",
];

const ACCOMPAGNES = [
  "Lycéens",
  "Étudiants",
  "Jeunes en CEJ",
  "Personnes sans diplôme",
  "Demandeurs d'emploi",
  "Bénéficiaires du RSA",
  "Personnes en reconversion",
  "Personnes en remobilisation",
];

function Colonne({ title, tags, className }: { title: string; tags: string[]; className: string }) {
  return (
    <div className={`rounded-lg px-6! py-5! md:px-8! ${className}`}>
      <h3 className="fr-h5 text-blue-france-sun mb-4!">{title}</h3>
      <ul className="fr-tags-group">
        {tags.map((tag) => (
          <li key={tag}>
            <p className="fr-tag">{tag}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PourQui() {
  return (
    <section className="fr-container" aria-labelledby="pour-qui">
      <h2 id="pour-qui" className="fr-h2 mb-8! text-center">
        Cette plateforme est faite pour vous si…
      </h2>
      <div className="grid gap-6 md:grid-cols-2">
        <Colonne title="Vous êtes" tags={PROFESSIONNELS} className="bg-action-low-blue-france" />
        <Colonne title="… ou vous accompagnez" tags={ACCOMPAGNES} className="bg-brown-cafe-creme-975" />
      </div>
    </section>
  );
}
