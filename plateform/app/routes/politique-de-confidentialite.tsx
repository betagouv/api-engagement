import type { Route } from "./+types/politique-de-confidentialite";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Politique de confidentialité — API Engagement" }];
}

export default function PolitiqueDeConfidentialite() {
  return (
    <main id="contenu" tabIndex={-1}>
      <div className="fr-container max-w-3xl py-8 md:py-16">
        <h1>Politique de confidentialité de la Plateforme de l'Engagement</h1>

        <h2>Qui sommes-nous ?</h2>
        <p>
          La plateforme de l'engagement est le{" "}
          <strong>service de référence de l'engagement public : elle agrège l'ensemble de l'offre publique d'engagement et la rend visible aux citoyens</strong>.
        </p>
        <p>
          La plateforme de l'engagement est sous la responsabilité de la Direction de la Jeunesse, de l'Éducation Populaire et de la Vie Associative (DJEPVA) au sein du ministère
          des Sports, de la Jeunesse et de la Vie Associative.
        </p>

        <h2>Pourquoi traitons-nous des données à caractère personnel ?</h2>
        <p>La plateforme de l'engagement traite des données à caractère personnel pour permettre de proposer des missions d'engagement en fonction des préférences des citoyens.</p>

        <h2>Quelles sont les données collectées sur la plateforme ?</h2>
        <p>
          La plateforme de l'engagement collecte seulement l'adresse courriel, qui peut souvent contenir aussi le nom et le prénom. Le reste des données collectées ne sont pas
          identifiantes, et sont liées à la mission.
        </p>

        <h2>Quelles sont les données utilisées du Service National Universel ?</h2>
        <p>Certaines données sont récupérées via le SNU pour certains volontaires, notamment le nom, prénom, numéro de téléphone, adresse courriel, date de naissance.</p>

        <h2>Qu'est-ce qui nous autorise à traiter des données à caractère personnel ?</h2>
        <p>
          La plateforme de l'engagement traite des données à caractère personnel pour l'exécution d'une mission d'intérêt public ou relevant de l'exercice de l'autorité publique
          dont est investi le responsable de traitement conformément à l'article 6-1 e) du RGPD.
        </p>
        <p>Cette mission d'intérêt public se traduit en pratique par :</p>
        <ul>
          <li>Le décret n° 2017-930 du 9 mai 2017 relatif à la Réserve Civique ;</li>
          <li>
            L'article 10-2 du décret n° 2014-133 du 17 février 2014 fixant l'organisation de l'administration centrale des ministères des Sports, de la Jeunesse et de la Vie
            Associative et de l'enseignement supérieur et de la recherche.
          </li>
        </ul>

        <h2>Pendant combien de temps conservons-nous vos données à caractère personnel ?</h2>
        <p>Les données sont conservées pendant 2 ans à partir du dernier contact avec les personnes concernées.</p>

        <h2>Quels sont vos droits ?</h2>
        <p>Vous disposez :</p>
        <ul>
          <li>D'un droit d'information et d'un droit d'accès ;</li>
          <li>D'un droit de rectification ;</li>
          <li>D'un droit d'opposition ;</li>
          <li>D'un droit à la limitation du traitement de vos données.</li>
        </ul>
        <p>Vous pouvez exercer vos droits auprès du Ministère des Sports, de la Jeunesse et de la Vie Associative.</p>
        <ol>
          <li>
            Par voie postale : Ministère des Sports, de la Jeunesse et de la Vie Associative, À l'attention du délégué à la protection des données (DPD) – 110 rue de Grenelle,
            75357 Paris Cedex 07 France
          </li>
          <li>
            Ou par le biais du formulaire de saisine en ligne :{" "}
            <a href="https://www.education.gouv.fr/contacter-le-delegue-la-protection-des-donnees-dpd-469373" target="_blank" rel="noopener">
              https://www.education.gouv.fr/contacter-le-delegue-la-protection-des-donnees-dpd-469373
            </a>
            . Le responsable de traitement s'engage à vous répondre dans un délai raisonnable qui ne saurait dépasser 1 mois à compter de la réception de votre demande.
          </li>
        </ol>

        <h2>Qui peut accéder à vos données ?</h2>
        <p>Les destinataires des données d'inscription sont uniquement accessibles aux membres habilités de l'équipe de la plateforme de l'engagement.</p>

        <h2>Qui nous aide à traiter vos données à caractère personnel ?</h2>
        <p>
          Certaines des données sont envoyées à des sous-traitants pour réaliser certaines missions. Le responsable de traitement s'est assuré de la mise en œuvre par ses
          sous-traitants des garanties adéquates et du respect des conditions de confidentialité et de sécurité des données.
        </p>
        <div className="fr-table">
          <table>
            <thead>
              <tr>
                <th scope="col">Partenaire</th>
                <th scope="col">Pays du partenaire</th>
                <th scope="col">Traitement réalisé</th>
                <th scope="col">Garanties</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Scaleway</td>
                <td>France</td>
                <td>Hébergement des données</td>
                <td>
                  <a href="https://www-uploads.scaleway.com/Data_Processing_Agreement_03092021_6e2ca4da3c.pdf" target="_blank" rel="noopener">
                    Data Processing Agreement
                  </a>
                </td>
              </tr>
              <tr>
                <td>Brevo</td>
                <td>France</td>
                <td>Solution d'e-mailing</td>
                <td>
                  <a href="https://www.brevo.com/legal/termsofuse/#annex" target="_blank" rel="noopener">
                    Conditions d'utilisation
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>Gestion de cookies</h2>
        <p>
          Lors de votre navigation sur la Plateforme, des cookies ou traceurs peuvent être déposés sur votre terminal. Conformément à l'article 82 de la loi informatique et
          libertés et aux recommandations de la CNIL, vous devez consentir au dépôt de cookies via un bandeau, accessible à tout moment. Vous pouvez revenir sur votre choix via le
          lien « Gestion de cookies » qui vous redirige vers l'outil Tarteaucitron. Nous utilisons également Plausible, une solution qui ne dépose aucun cookie ou traceur et ne
          collecte pas votre adresse IP.
        </p>

        <h3>Traceurs soumis à consentement</h3>
        <div className="fr-table">
          <table>
            <thead>
              <tr>
                <th scope="col">Outil</th>
                <th scope="col">Finalité</th>
                <th scope="col">Cookies déposés</th>
                <th scope="col">Durée de conservation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>PostHog</td>
                <td>Mesure d'audience produit et amélioration du service</td>
                <td>
                  <code>ph_*</code>
                </td>
                <td>1 an</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Cookies strictement nécessaires</h3>
        <p>
          Les cookies techniques indispensables au bon fonctionnement du service (session, sécurité CSRF, préférences d'interface) sont déposés sans consentement préalable,
          conformément à l'article 82 de la loi Informatique et Libertés.
        </p>
      </div>
    </main>
  );
}
