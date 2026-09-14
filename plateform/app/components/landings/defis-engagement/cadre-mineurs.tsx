const GARANTIES = [
  <>
    Missions
    <br /> vérifiées par l'État
  </>,
  <>
    Encadrement
    <br /> adapté à ton âge
  </>,
  <>
    Autorisation
    <br /> parentale requise
  </>,
];

export default function CadreMineurs() {
  return (
    <section className="fr-container">
      <div className="bg-[#BFCCFB] dark:bg-white/8 flex flex-col items-center gap-6 rounded p-4 shadow-lg md:gap-10 md:p-12 lg:px-20! lg:py-10!">
        <h2 className="fr-h1 text-title-grey! mb-0! text-center">Un cadre pensé pour les mineurs</h2>

        <ul role="list" className="m-0! flex list-none! flex-col items-center gap-6 p-0! md:flex-row md:justify-center md:gap-16">
          {GARANTIES.map((garantie, index) => (
            <li key={`garantie-${index}`} className="text-title-grey flex flex-col items-center gap-3.5 text-center text-xl font-bold md:text-2xl">
              <span className="fr-icon-checkbox-circle-line" aria-hidden="true" />
              {garantie}
            </li>
          ))}
        </ul>

        <div className="text-title-grey text-center">
          <p className="mb-0! font-bold">Tes données sont protégées, c'est bien le minimum !</p>
          <p className="mb-0!">La plateforme respecte le RGPD et protège les données de tous les utilisateurs</p>
        </div>
      </div>
    </section>
  );
}
