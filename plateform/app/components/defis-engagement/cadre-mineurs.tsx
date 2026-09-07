const GARANTIES = ["Missions vérifiées par l'État", "Encadrement adapté à ton âge", "Autorisation parentale requise"];

export default function CadreMineurs() {
  return (
    <section className="fr-container fr-mb-8w">
      <div className="bg-action-high-blue-france fr-p-4w md:fr-p-6w lg:px-20! lg:py-10! flex flex-col items-center gap-10 rounded shadow-lg">
        <h2 className="fr-h1 text-inverted-blue-france! mb-0! text-center">
          Un cadre pensé pour les <span className="text-yellow-moutarde-850">mineurs</span>
        </h2>

        <ul role="list" className="m-0! flex list-none! flex-col items-center gap-8 p-0! md:flex-row md:justify-center md:gap-16">
          {GARANTIES.map((garantie) => (
            <li key={garantie} className="text-inverted-blue-france flex flex-col items-center gap-3.5 text-center text-2xl font-bold">
              <span className="fr-icon-checkbox-circle-line" aria-hidden="true" />
              {garantie}
            </li>
          ))}
        </ul>

        <div className="text-inverted-blue-france text-center">
          <p className="mb-0! font-bold">Tes données sont protégées, c'est bien le minimum !</p>
          <p className="mb-0!">La plateforme respecte le RGPD et protège les données de tous les utilisateurs</p>
        </div>
      </div>
    </section>
  );
}
