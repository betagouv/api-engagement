import type { Route } from "./+types/mentions-legales";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Mentions légales — API Engagement" }];
}

export default function MentionsLegales() {
  return (
    <main id="contenu" tabIndex={-1}>
      <div className="fr-container max-w-3xl py-8 md:py-16">
        <h1>Mentions légales</h1>

        <h2>Éditeur</h2>
        <p>
          La Plateforme de l'engagement (plateforme.api-engagement.beta.gouv.fr) est un service public numérique édité par la Direction de la Jeunesse, de l'Éducation Populaire et
          de la Vie Associative (DJEPVA), au sein du Ministère des Sports, de la Jeunesse et de la Vie Associative.
        </p>
        <p>
          Adresse : 95 avenue de France, 75650 Paris Cedex 13
          <br />
          Téléphone : 01 40 45 90 00
        </p>

        <h2>Directeur de la publication</h2>
        <p>Thibaut DE SAINT POL, Directeur de la Jeunesse, de l'Éducation Populaire et de la Vie Associative (DJEPVA).</p>

        <h2>Hébergement</h2>
        <p>La plateforme est hébergée par :</p>
        <p>
          SCALEWAY SAS
          <br />
          BP 438 – 8 rue de la Ville l'Evêque, 75008 Paris
          <br />
          SIREN : 433 115 904
          <br />
          Téléphone : 01 84 13 00 00
        </p>

        <h2>Accessibilité</h2>
        <p>
          La Plateforme de l'engagement s'engage à rendre son service accessible conformément à l'article 47 de la loi n° 2005-102 du 11 février 2005. Une déclaration
          d'accessibilité sera publiée prochainement.
        </p>
        <p>
          Pour signaler un défaut d'accessibilité ou demander une alternative accessible, contactez-nous à{" "}
          <a href="mailto:apiengagement@beta.gouv.fr">apiengagement@beta.gouv.fr</a>.
        </p>

        <h2>Sécurité</h2>
        <p>Le site est protégé par un certificat électronique (HTTPS). Cette protection participe à la confidentialité des échanges.</p>

        <h2>Réutilisation des contenus</h2>
        <p>
          Sauf mention contraire, les contenus de ce site sont publiés sous licence{" "}
          <a href="https://www.etalab.gouv.fr/licence-ouverte-open-licence" target="_blank" rel="noopener">
            etalab-2.0
          </a>
          .
        </p>

        <h2>Données personnelles et cookies</h2>
        <p>
          Les informations relatives au traitement des données personnelles et aux cookies sont décrites dans la{" "}
          <a href="/politique-de-confidentialite">politique de confidentialité</a> de la plateforme.
        </p>
      </div>
    </main>
  );
}
