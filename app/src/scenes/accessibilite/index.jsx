const AUDITED_PAGES = [
  { href: "https://app.api-engagement.beta.gouv.fr/login", label: "Authentification" },
  { href: "https://app.api-engagement.beta.gouv.fr/my-account", label: "Mon compte" },
  { href: "https://app.api-engagement.beta.gouv.fr/public-stats?year=2025", label: "Statistiques" },
  { href: "https://app.api-engagement.beta.gouv.fr/performance", label: "Mode diffuseur / Performance" },
  {
    href: "https://app.api-engagement.beta.gouv.fr/performance/means?from=2025-04-12T22%3A00%3A00.000Z&to=2025-05-13T21%3A59%3A59.999Z",
    label: "Mode diffuseur / Performance / onglet Moyens de diffusion",
  },
  { href: "https://app.api-engagement.beta.gouv.fr/broadcast/", label: "Mode diffuseur / Diffuser des missions" },
  { href: "https://app.api-engagement.beta.gouv.fr/broadcast/widgets", label: "Mode diffuseur / Diffuser des missions / onglet Widgets" },
  {
    href: "https://app.api-engagement.beta.gouv.fr/broadcast/moderation?mission=68261b05b31b0edbfeafb2c2",
    label: "Mode diffuseur / Diffuser des missions / onglet Widgets / Créer un Widget",
  },
  { href: "https://app.api-engagement.beta.gouv.fr/broadcast/moderation", label: "Mode diffuseur / Diffuser des missions / onglet Modération" },
  {
    href: "https://app.api-engagement.beta.gouv.fr/broadcast/moderation?mission=68261b05b31b0edbfeafb2c2",
    label: "Mode diffuseur / Diffuser des missions / onglet Modération / page Mission",
  },
  { href: "https://app.api-engagement.beta.gouv.fr/performance?from=2025-04-12T22%3A00%3A00.000Z&to=2025-05-13T21%3A59%3A59.999Z", label: "Mode annonceur / Performances" },
  { href: "https://app.api-engagement.beta.gouv.fr/my-missions?size=25&page=1", label: "Mode annonceur / Vos missions" },
  { href: "https://app.api-engagement.beta.gouv.fr/settings", label: "Mode annonceur / Paramètres / onglet Flux de missions" },
  { href: "https://app.api-engagement.beta.gouv.fr/settings/tracking", label: "Mode annonceur / Paramètres / onglet Suivi des événements" },
  { href: "https://app.api-engagement.beta.gouv.fr/settings/real-time?type=print", label: "Mode annonceur / Paramètres / onglet Événements en temps réel" },
];

const Index = () => {
  return (
    <>
      <title>API Engagement - Déclaration d’accessibilité</title>
      <div className="mx-auto my-14 w-full max-w-[1200px] flex-1 space-y-10 px-4 sm:w-4/5 sm:px-0">
        <h1 className="mb-2 text-4xl font-bold">Déclaration d’accessibilité</h1>

        <div className="shadow-border-gray mt-12 space-y-10 bg-white px-4 py-12 text-base sm:px-24">
          <div className="space-y-6">
            <p>
              La Direction de la Jeunesse, de l’Éducation Populaire et de la Vie Associative (DJEPVA) s’engage à rendre ses sites internet, intranet, extranet et ses progiciels
              accessibles (et ses applications mobiles et mobilier urbain numérique) conformément à l’article 47 de la loi n°2005-102 du 11 février 2005.
            </p>
            <p>Le schéma pluriannuel de mise en accessibilité et les plans d’actions sont actuellement en cours de rédaction et seront publiés prochainement.</p>
            <p>Cette déclaration d’accessibilité s’applique au tableau de bord API Engagement - Plateforme de partage de missions de bénévolat et de volontariat.</p>
          </div>

          <div className="space-y-6">
            <h2 className="text-lg font-bold">État de conformité</h2>
            <p>
              <a href="https://app.api-engagement.beta.gouv.fr" className="underline">
                Le tableau de bord API Engagement
              </a>{" "}
              est <strong>totalement conforme</strong> avec le Référentiel Général d’Amélioration de l’Accessibilité (RGAA) version 4.1.2.
            </p>
          </div>

          <div className="space-y-6">
            <h2 className="text-lg font-bold">Résultats des tests</h2>
            <p>
              L’audit de conformité réalisé par{" "}
              <a href="https://www.ethicfirst.fr" target="_blank" rel="noopener external" title="Ethic First - nouvelle fenêtre" className="underline">
                Ethic First
              </a>{" "}
              révèle que 38,46 % des critères du RGAA version 4.1.2 sont respectés.
            </p>
            <p>Suite à des actions correctives suivies d’un contre-audit réalisé par Ethic First, le taux de conformité est désormais de 100 %.</p>
          </div>

          <div className="space-y-6">
            <h2 className="text-lg font-bold">Contenus non accessibles</h2>
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Non-conformités</h3>
              <p>Aucune non-conformité n’a été relevée.</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-lg font-bold">Établissement de cette déclaration d’accessibilité</h2>
            <p>Cette déclaration a été établie le 15/07/2025.</p>
            <p>Elle a été mise à jour le 13/10/2026.</p>
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Technologies utilisées pour la réalisation du site</h3>
              <ul className="list-inside list-disc">
                <li>HTML5</li>
                <li>CSS</li>
                <li>JavaScript</li>
                <li>PDF</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Environnement de test</h3>
              <p>
                Les vérifications de restitution de contenus ont été réalisées sur la base de la combinaison fournie par la base de référence du RGAA, avec les versions suivantes :
                Firefox version 140.0.4 et NVDA 2025.1.1.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Outils pour évaluer l’accessibilité</h3>
              <ul className="list-inside list-disc">
                <li>
                  Module ANDI (<span lang="en">Accessible Name and Description Inspector</span>) ;
                </li>
                <li>
                  <span lang="en">Colour Contrast Analyser</span> ;
                </li>
                <li>
                  Extension <span lang="en">Web Developer</span> ;
                </li>
                <li>Outils pour développeurs intégrés au navigateur Firefox ;</li>
                <li>
                  <span lang="en">PDF Accessibility Checker</span>.
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Pages du site ayant fait l’objet de la vérification de conformité</h3>
              <ul className="list-inside list-disc">
                {AUDITED_PAGES.map((page) => (
                  <li key={page.label}>
                    <a href={page.href} className="underline">
                      {page.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-lg font-bold">Retour d’information et contact</h2>
            <p>
              Si vous n’arrivez pas à accéder à un contenu ou à un service, vous pouvez contacter le responsable de API Engagement pour être orienté vers une alternative accessible
              ou obtenir le contenu sous une autre forme.
            </p>
            <ul className="list-inside list-disc">
              <li>
                E-mail :{" "}
                <a href="mailto:api-engagement@beta.gouv.fr" className="underline">
                  api-engagement@beta.gouv.fr
                </a>{" "}
                ;
              </li>
              <li>
                Adresse : Ministère de l’Éducation nationale et de la jeunesse – DJEPVA – Direction de la Jeunesse, de l’Éducation Populaire et de la Vie Associative – « Mission
                Réserve civique » – 95, avenue de France – 75650 PARIS Cedex ;
              </li>
              <li>
                Sur{" "}
                <a href="https://www.linkedin.com/company/api-engagement/" className="underline">
                  LinkedIn
                </a>
                .
              </li>
            </ul>
          </div>

          <div className="space-y-6">
            <h2 className="text-lg font-bold">Voies de recours</h2>
            <p>
              Si vous constatez un défaut d’accessibilité vous empêchant d’accéder à un contenu ou une fonctionnalité du site, que vous nous le signalez et que vous ne parvenez pas
              à obtenir une réponse de notre part, vous êtes en droit de faire parvenir vos doléances ou une demande de saisine au Défenseur des droits.
            </p>
            <p>Plusieurs moyens sont à votre disposition :</p>
            <ul className="list-inside list-disc">
              <li>
                Écrire un message au{" "}
                <a href="https://formulaire.defenseurdesdroits.fr/" className="underline">
                  Défenseur des droits
                </a>
              </li>
              <li>
                Contacter le{" "}
                <a href="https://www.defenseurdesdroits.fr/saisir/delegues" className="underline">
                  délégué du Défenseur des droits
                </a>{" "}
                dans votre région
              </li>
              <li>Envoyer un courrier par la poste (gratuit, ne pas mettre de timbre) à Défenseur des droits, Libre réponse 71120, 75342 Paris CEDEX 07</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default Index;
