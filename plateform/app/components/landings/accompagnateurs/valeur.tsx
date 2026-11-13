import type { ReactNode } from "react";

// Étape numérotée : texte d'un côté, écran d'exemple de l'autre (inversé une étape sur deux sur desktop).
function Etape({ num, title, reverse, screen, children }: { num: number; title: string; reverse?: boolean; screen: ReactNode; children: ReactNode }) {
  return (
    <li className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
      <div className={reverse ? "md:order-2" : ""}>
        <p aria-hidden="true" className="bg-blue-france-sun mb-4! flex size-12 items-center justify-center rounded-full text-xl font-bold text-white">
          {num}
        </p>
        <h3 className="fr-h4">
          <span className="fr-sr-only">Étape {num} : </span>
          {title}
        </h3>
        {children}
      </div>
      <div className={`border-border-default-grey bg-background shadow-tile rounded-lg border p-6! ${reverse ? "md:order-1" : ""}`}>{screen}</div>
    </li>
  );
}

const STATUTS = [
  { mission: "J'arbitre des matchs de jeunes dans un club de football amateur", dispositif: "Bénévolat", statut: "Candidature envoyée", color: "fr-badge--success" },
  { mission: "Favoriser la pratique sportive des enfants dans un club de foot", dispositif: "Service Civique", statut: "Mission vue", color: "fr-badge--info" },
  { mission: "J'aide à organiser un tournoi de foot solidaire", dispositif: "Bénévolat", statut: "Partagée", color: "" },
  { mission: "Devenir sapeur-pompier volontaire près de chez soi", dispositif: "Sapeurs-pompiers volontaires", statut: "Partagée", color: "" },
];

// Les « écrans » sont des illustrations de l'outil à venir : exemple fictif, signalé comme tel aux technologies d'assistance.
export default function Valeur() {
  return (
    <section className="fr-container" aria-labelledby="valeur">
      <div className="mx-auto mb-12! max-w-200 text-center">
        <p className="fr-badge fr-badge--sm fr-badge--new mb-4!">Bientôt disponible</p>
        <h2 id="valeur" className="fr-h2">
          Vous décrivez la situation, l'outil trouve les missions qui correspondent
        </h2>
        <p className="fr-text--lead mb-0!">
          L'outil absorbe la complexité de l'offre d'engagement : dispositifs, conditions d'éligibilité, recommandations. Et pour vos questions, des ressources vous accompagnent.
        </p>
      </div>

      <ol className="m-0! flex list-none flex-col gap-12 p-0! md:gap-16">
        <Etape
          num={1}
          title="Décrivez sa situation avec vos mots"
          screen={
            <>
              <p className="text-mention-grey fr-text--sm mb-4!">Exemple · 19 ans · Saint-Nazaire (44)</p>
              <p className="bg-contrast-grey border-b-action-high-blue-france mb-4! rounded-t border-b-2 px-4 py-3">
                Passionné de foot, a quitté le lycée. Pas de permis, disponible deux jours par semaine. Veut reprendre confiance.
              </p>
              <ul className="fr-tags-group">
                {["Passionné de foot", "Projet d'électricien", "Sans voiture"].map((t) => (
                  <li key={t}>
                    <p className="fr-tag fr-tag--sm">{t}</p>
                  </li>
                ))}
              </ul>
            </>
          }
        >
          <p>
            Comme vous le feriez à un collègue. L'outil comprend et cherche parmi toute l'offre publique d'engagement : bénévolat, Service Civique, réserves militaires, réserves de
            la Gendarmerie et de la Police nationale, sapeurs-pompiers volontaires.
          </p>
        </Etape>

        <Etape
          num={2}
          title="Explorez des pistes ensemble"
          reverse
          screen={
            <>
              <p className="fr-h5 mb-4!">5 missions proposées</p>
              <p className="bg-action-low-blue-france mb-4! rounded p-4! text-sm">
                Pas de permis : j'ai retenu des missions à moins de 10 km. En tête, une mission d'arbitrage dans un club de foot, puis des pistes autour du sport et de
                l'encadrement d'équipes.
              </p>
              <div className="border-border-default-grey rounded border p-4!">
                <ul className="fr-badges-group mb-2!">
                  <li>
                    <p className="fr-badge fr-badge--sm fr-badge--blue-ecume">Bénévolat</p>
                  </li>
                  <li>
                    <p className="fr-badge fr-badge--sm">Non indemnisée</p>
                  </li>
                  <li>
                    <p className="fr-badge fr-badge--sm">Sport</p>
                  </li>
                </ul>
                <h4 className="fr-h6 mb-2!">J'arbitre des matchs de jeunes dans un club de football amateur</h4>
                <p className="fr-text--sm mb-2!">
                  Pourquoi pour cette personne : sa passion du foot, avec un rôle de responsabilité sur le terrain. Une formation est prévue au départ, de quoi prendre confiance
                  match après match.
                </p>
                <p className="text-mention-grey fr-text--xs mb-2!">Club de football amateur · À 4 km · Le samedi matin</p>
                <p className="fr-badge fr-badge--sm fr-badge--success fr-badge--no-icon">✓ Partagée le 2 novembre</p>
              </div>
            </>
          }
        >
          <p>
            Pour chaque mission : l'indemnité, la distance, le rythme, et une explication liée à ses objectifs. Vous en discutez ensemble puis vous la lui partagez par e-mail ou
            SMS.
          </p>
          <div className="bg-action-low-blue-france rounded p-4!">
            <p className="mb-2!">Et pour vos questions, des ressources :</p>
            {/* Pages dispositifs / blog / FAQ pas encore créées : liens à brancher à leur ouverture. */}
            <ul className="fr-btns-group fr-btns-group--inline fr-btns-group--sm m-0! list-none">
              {["Les dispositifs", "Le blog", "Le centre d'aide (FAQ)"].map((l) => (
                <li key={l} className="fr-tag">
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </Etape>

        <Etape
          num={3}
          title="Suivez où elle en est"
          screen={
            <>
              <p className="fr-h5 mb-1!">Suivi des candidatures</p>
              <p className="text-mention-grey fr-text--sm mb-4!">4 missions partagées · 2 vues · 1 candidature</p>
              <div className="fr-table fr-table--no-caption mb-0!">
                <div className="fr-table__wrapper">
                  <div className="fr-table__container">
                    <div className="fr-table__content">
                      <table>
                        <caption>Suivi des missions partagées</caption>
                        <thead>
                          <tr>
                            <th scope="col">Mission</th>
                            <th scope="col">Dispositif</th>
                            <th scope="col">Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {STATUTS.map((s) => (
                            <tr key={s.mission}>
                              <td>{s.mission}</td>
                              <td>{s.dispositif}</td>
                              <td>
                                <p className={`fr-badge fr-badge--sm fr-badge--no-icon ${s.color}`}>{s.statut}</p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </>
          }
        >
          <p>Retrouvez les missions partagées et voyez si elles ont été consultées et si une candidature a été déposée.</p>
        </Etape>
      </ol>
    </section>
  );
}
