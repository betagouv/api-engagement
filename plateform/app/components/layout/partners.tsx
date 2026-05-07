type Partner = {
  name: string;
  description: string;
  url: string;
};

const PARTNERS: Partner[] = [
  {
    name: "Les réserves des armées",
    description: "Des missions rémunérées de réservistes.",
    url: "https://www.reservistes.defense.gouv.fr",
  },
  {
    name: "JeVeuxAider.gouv.fr",
    description: "La plateforme publique du bénévolat.",
    url: "https://www.jeveuxaider.gouv.fr",
  },
  {
    name: "Le Service Civique",
    description: "De 6 à 12 mois, des missions d'intérêt général rémunérées.",
    url: "https://www.service-civique.gouv.fr",
  },
  {
    name: "Sapeurs-pompiers de France",
    description: "Deviens sapeur-pompier volontaire près de chez toi.",
    url: "https://www.pompiers.fr",
  },
];

export default function Partners() {
  return (
    <section className="bg-beige-gris-galet-975">
      <div className="fr-container fr-py-8w">
        <h2 className="fr-h2 fr-mb-2w">Il y a plein d'autres missions…</h2>
        <p className="fr-mb-6w text-title-grey fr-text--lead">…directement sur les sites qui les proposent, jettes-y un coup d'oeil !</p>

        <div className="fr-grid-row fr-grid-row--gutters">
          {PARTNERS.map((partner) => (
            <div key={partner.name} className="fr-col-12 fr-col-md-6">
              <div className="flex items-start gap-4">
                <div className="bg-white size-12 shrink-0 rounded" aria-hidden="true" />
                <div className="flex-1">
                  <p className="fr-mb-1w font-bold">
                    <a href={partner.url} target="_blank" rel="noopener noreferrer" className="text-title-grey bg-none!">
                      {partner.name}
                    </a>
                  </p>
                  <p className="fr-mb-0 fr-text--sm fr-text--mention-grey">{partner.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
