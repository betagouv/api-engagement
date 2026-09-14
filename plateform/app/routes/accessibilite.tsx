import type { Route } from "./+types/accessibilite";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Déclaration d'accessibilité — Trouve ta mission" }];
}

export default function Accessibilite() {
  return (
    <main id="contenu" tabIndex={-1}>
      <div className="fr-container max-w-3xl py-8 md:py-16">
        <h1>Déclaration d'accessibilité</h1>
        <p>
          La Direction de la Jeunesse, de l'Éducation Populaire et de la Vie Associative (DJEPVA) s'engage à rendre ses sites internet, intranet, extranet et ses progiciels
          accessibles (et ses applications mobiles et mobilier urbain numérique) conformément à l'article 47 de la loi n° 2005-102 du 11 février 2005.
        </p>
        <p>À cette fin, la DJEPVA s'engage à publier prochainement son schéma pluriannuel de mise en accessibilité et les plans d'actions.</p>
        <p>Cette déclaration d'accessibilité s'applique à plateforme.api-engagement.beta.gouv.fr.</p>

        <h2 className="fr-mt-4w">État de conformité</h2>
        <p>
          La Plateforme de l'engagement est <strong>partiellement conforme</strong> avec le Référentiel Général d'Amélioration de l'Accessibilité (RGAA), version 4.1.2 en raison
          des non-conformités énumérées ci-dessous.
        </p>

        <h3>Résultats des tests</h3>
        <p>L'audit de conformité réalisé par Ethic First révèle que 77,08 % des critères du RGAA version 4.1.2 sont respectés.</p>

        <h2 className="fr-mt-4w">Contenus non accessibles</h2>

        <h3>Non-conformités</h3>
        <ul className="fr-mb-3w">
          <li>Certains liens ne sont pas explicites et contiennent des éléments décoratifs qui ne transmettent pas d'information utile ;</li>
          <li>Les composants interactifs (fenêtre de cookies, bouton, carousels) ne sont pas compatibles avec les technologies d'assistance ;</li>
          <li>Des éléments de contenu textuel (paragraphes) sont absents ou présents sous forme de balises vides ;</li>
          <li>
            Des titres sont utilisés sur des éléments textuels qui ne titrent pas de contenu et des éléments structurants du contenu ne sont pas balisés avec des en-têtes
            appropriés ;
          </li>
          <li>Des contenus ne sont pas visibles lorsque l'affichage est réduit à une largeur de 320px ;</li>
          <li>Certains champs de saisie (formulaires, recherches) n'ont pas d'étiquettes visibles ;</li>
          <li>Certains regroupements de champs de même nature ont une légende non pertinente ;</li>
          <li>Certains champs (email) manquent de messages d'erreur visibles ;</li>
          <li>Le site ne dispose pas d'au moins deux systèmes de navigation différents, tels qu'un menu de navigation ou un moteur de recherche ;</li>
          <li>Le contenu principal ne dispose pas de rôle approprié pour indiquer sa fonction ;</li>
          <li>L'ordre de tabulation de certains éléments interactifs (boutons, vignettes, listes des résultats) n'est pas toujours cohérent.</li>
        </ul>

        <h2 className="fr-mt-4w">Établissement de cette déclaration d'accessibilité</h2>
        <p>Cette déclaration a été établie le 28/07/2026.</p>

        <h3>Technologies utilisées pour la réalisation du site</h3>
        <ul className="fr-mb-3w">
          <li>HTML5 ;</li>
          <li>CSS ;</li>
          <li>JavaScript.</li>
        </ul>

        <h3>Environnement de test</h3>
        <p>Les vérifications de restitution de contenus ont été réalisées sur la base de la combinaison fournie par la base de référence du RGAA, avec les versions suivantes :</p>
        <ul className="fr-mb-3w">
          <li>Firefox 153.3 et NVDA 2026.1.1.</li>
        </ul>

        <h3>Outils pour évaluer l'accessibilité</h3>
        <ul className="fr-mb-3w">
          <li>Module ANDI (Accessible Name and Description Inspector) ;</li>
          <li>Colour Contrast Analyser ;</li>
          <li>Extension Web Developer ;</li>
          <li>Outils pour développeurs intégrés au navigateur Firefox.</li>
        </ul>

        <h3>Pages du site ayant fait l'objet de la vérification de conformité</h3>
        <ul className="fr-mb-3w">
          <li>Accueil ;</li>
          <li>Mentions légales ;</li>
          <li>Missions ;</li>
          <li>Trouver ma mission (toutes les étapes du quiz) ;</li>
          <li>Résultats du quiz (liste des missions) ;</li>
          <li>Détail d'une mission ;</li>
          <li>Plan du site.</li>
        </ul>

        <h2 className="fr-mt-4w">Retour d'information et contact</h2>
        <p>
          Si vous n'arrivez pas à accéder à un contenu ou à un service, vous pouvez contacter le responsable de la Plateforme de l'engagement pour être orienté vers une alternative
          accessible ou obtenir le contenu sous une autre forme.
        </p>
        <ul className="fr-mb-3w">
          <li>
            Envoyer un message à <a href="mailto:apiengagement@beta.gouv.fr">apiengagement@beta.gouv.fr</a> ;
          </li>
          <li>
            Contacter la Direction de la Jeunesse, de l'Éducation Populaire et de la Vie Associative (DJEPVA), 95 avenue de France, 75650 Paris Cedex 13, téléphone : 01 40 45 90
            00.
          </li>
        </ul>

        <h2 className="fr-mt-4w">Voies de recours</h2>
        <p>
          Si vous constatez un défaut d'accessibilité vous empêchant d'accéder à un contenu ou une fonctionnalité du site, que vous nous le signalez et que vous ne parvenez pas à
          obtenir une réponse de notre part, vous êtes en droit de faire parvenir vos doléances ou une demande de saisine au Défenseur des droits.
        </p>
        <p>Plusieurs moyens sont à votre disposition :</p>
        <ul className="fr-mb-3w">
          <li>
            <a href="https://formulaire.defenseurdesdroits.fr/" target="_blank" rel="noopener" title="Écrire un message au Défenseur des droits - nouvelle fenêtre">
              Écrire un message au Défenseur des droits
            </a>
            {" ;"}
          </li>
          <li>
            <a
              href="https://www.defenseurdesdroits.fr/saisir/delegues"
              target="_blank"
              rel="noopener"
              title="Contacter le délégué du Défenseur des droits dans votre région - nouvelle fenêtre"
            >
              Contacter le délégué du Défenseur des droits dans votre région
            </a>
            {" ;"}
          </li>
          <li>Envoyer un courrier par la poste (gratuit, ne pas mettre de timbre) à Défenseur des droits, Libre réponse 71120, 75342 Paris CEDEX 07.</li>
        </ul>
      </div>
    </main>
  );
}
