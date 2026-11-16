import type { ReactNode } from "react";

// Pastille des « écrans » d'exemple : couleurs de la maquette (fixes), taille selon le contexte.
function Badge({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`inline-block rounded-sm px-1.5 py-0.5 font-bold uppercase ${className}`}>{children}</span>;
}

const BADGE_BENEVOLAT = "bg-[#fee7fc] text-[#6e445a]";
const BADGE_NEUTRE = "bg-[#eee] text-[#3a3a3a]";
const BADGE_INFO = "bg-[#e8edff] text-[#0063cb]";
const BADGE_SUCCES = "bg-[#b8fec9] text-[#18753c]";
const BADGE_ATTENTE = "bg-[#feecc2] text-[#716043]";

// Étape numérotée : texte d'un côté, écran d'exemple de l'autre (inversé une étape sur deux sur desktop).
// Colonnes 7/10 (≈ 460/660 px sur la maquette 1440) pour rester proportionnées sur les largeurs intermédiaires.
function Etape({ num, title, reverse, screen, children }: { num: number; title: string; reverse?: boolean; screen: ReactNode; children: ReactNode }) {
  return (
    <li className={`grid items-center gap-8 lg:gap-20 ${reverse ? "lg:grid-cols-[10fr_7fr]" : "lg:grid-cols-[7fr_10fr]"}`}>
      <div className={reverse ? "lg:order-2" : ""}>
        <p aria-hidden="true" className="bg-blue-france-sun mb-4! flex size-12 items-center justify-center rounded-full text-[22px]! leading-normal! font-bold! text-white">
          {num}
        </p>
        <h3 className="text-title-grey mb-4! text-2xl! leading-normal! font-bold! lg:text-[32px]!">
          <span className="fr-sr-only">Étape {num} : </span>
          {title}
        </h3>
        {children}
      </div>
      <div
        className={`border-border-default-grey bg-background flex flex-col gap-4 rounded-lg border p-7! shadow-[0_6px_24px_rgba(0,0,0,0.08)] ${reverse ? "lg:order-1 lg:col-start-1 lg:row-start-1" : ""}`}
      >
        {screen}
      </div>
    </li>
  );
}

const STATUTS = [
  { mission: "J'arbitre des matchs de jeunes dans un club de football amateur", dispositif: "Bénévolat", statut: "Candidature envoyée", badge: BADGE_SUCCES, row: "" },
  { mission: "Favoriser la pratique sportive des enfants dans un club de foot", dispositif: "Service Civique", statut: "Mission vue", badge: BADGE_ATTENTE, row: "bg-[#fafafa]" },
  { mission: "J'aide à organiser un tournoi de foot solidaire", dispositif: "Bénévolat", statut: "Partagée", badge: BADGE_INFO, row: "" },
  { mission: "Devenir sapeur-pompier volontaire près de chez soi", dispositif: "Sapeurs-pompiers volontaires", statut: "Partagée", badge: BADGE_INFO, row: "" },
];

const TEXTE = "text-default-grey text-lg! leading-normal! mb-0!";

// Les « écrans » sont des illustrations de l'outil à venir : exemple fictif, signalé comme tel aux technologies d'assistance.
export default function Valeur() {
  return (
    <section className="-mt-12 bg-(--background-alt-grey) py-12 md:-mt-20 md:py-20" aria-labelledby="valeur">
      <div className="fr-container">
        <div className="mx-auto mb-10! flex max-w-200 flex-col items-center gap-4 text-center md:mb-14!">
          <p className="fr-badge fr-badge--new mb-0!">Bientôt disponible</p>
          <h2 id="valeur" className="text-title-grey mb-0! text-[28px]! leading-normal! font-bold! md:text-[36px]!">
            Vous décrivez la situation, l'outil trouve les missions qui correspondent
          </h2>
          <p className={`${TEXTE} max-w-200`}>
            L'outil absorbe la complexité de l'offre d'engagement : dispositifs, conditions d'éligibilité, recommandations. Et pour vos questions, des ressources vous accompagnent.
          </p>
        </div>

        <ol className="m-0! flex list-none! flex-col gap-12 p-0! md:gap-14">
          <Etape
            num={1}
            title="Décrivez sa situation avec vos mots"
            screen={
              <>
                <p className="text-default-grey mb-0! text-sm! leading-normal!">Exemple · 19 ans · Saint-Nazaire (44)</p>
                <p className="border-b-(--text-default-grey) mb-0! border-b-2 bg-(--background-contrast-grey) px-4! pt-3! pb-7! text-[15px]! leading-normal! text-(--text-title-grey)">
                  Passionné de foot, a quitté le lycée. Pas de permis, disponible deux jours par semaine. Veut reprendre confiance.
                </p>
                <ul className="m-0! flex list-none! flex-wrap gap-2 p-0!">
                  {["Passionné de foot", "Projet d'électricien", "Sans voiture"].map((t) => (
                    <li key={t} className="bg-blue-france-925 text-blue-france-sun rounded-2xl px-3 py-1.5 text-[13px] leading-normal font-medium">
                      {t}
                    </li>
                  ))}
                </ul>
              </>
            }
          >
            <p className={TEXTE}>
              Comme vous le feriez à un collègue. L'outil comprend et cherche parmi toute l'offre publique d'engagement : bénévolat, Service Civique, réserves militaires, réserves
              de la Gendarmerie et de la Police nationale, sapeurs-pompiers volontaires.
            </p>
          </Etape>

          <Etape
            num={2}
            title="Explorez des pistes ensemble"
            reverse
            screen={
              <>
                <p className="text-title-grey mb-0! text-xl! leading-normal! font-bold!">5 missions proposées</p>
                <p className="mb-0! border-l-[3px] border-(--border-active-blue-france) bg-(--background-contrast-grey) px-5! py-4! text-sm! leading-normal! text-(--text-title-grey)">
                  Pas de permis : j'ai retenu des missions à moins de 10 km. En tête, une mission d'arbitrage dans un club de foot, puis des pistes autour du sport et de
                  l'encadrement d'équipes.
                </p>
                <div className="border-border-default-grey bg-background flex flex-col gap-2.5 border p-5!">
                  <ul className="m-0! flex list-none! gap-1.5 p-0!">
                    <li>
                      <Badge className={`${BADGE_BENEVOLAT} text-[11px] leading-normal`}>Bénévolat</Badge>
                    </li>
                    <li>
                      <Badge className={`${BADGE_NEUTRE} text-[11px] leading-normal`}>Non indemnisée</Badge>
                    </li>
                    <li>
                      <Badge className={`${BADGE_INFO} text-[11px] leading-normal`}>Sport</Badge>
                    </li>
                  </ul>
                  <h4 className="text-title-grey mb-0! text-[17px]! leading-normal! font-bold!">J'arbitre des matchs de jeunes dans un club de football amateur</h4>
                  <p className="text-default-grey mb-0! text-[13px]! leading-normal!">
                    <strong>Pourquoi pour cette personne :</strong> sa passion du foot, avec un rôle de responsabilité sur le terrain. Une formation est prévue au départ, de quoi
                    prendre confiance match après match.
                  </p>
                  <p className="text-mention-grey mb-0! flex flex-wrap gap-x-4 text-xs! leading-normal!">
                    <span>Club de football amateur</span>
                    <span>À 4 km</span>
                    <span>Le samedi matin</span>
                  </p>
                  <p className={`${BADGE_SUCCES} mb-0! flex w-fit gap-2 rounded-sm px-2.5! py-1.5! text-[13px]! leading-normal! font-bold!`}>
                    <span aria-hidden="true">✓</span>
                    <span>Partagée le 2 novembre</span>
                  </p>
                </div>
              </>
            }
          >
            <p className={TEXTE}>
              Pour chaque mission : l'indemnité, la distance, le rythme, et une explication liée à ses objectifs. Vous en discutez ensemble puis vous la lui partagez par e-mail ou
              SMS.
            </p>
            {/* Pages dispositifs / blog / FAQ pas encore créées : liens à brancher à leur ouverture (aujourd'hui, simple texte souligné). */}
            <div className="bg-blue-france-925 text-blue-france-sun mt-6 flex flex-col gap-2.5 rounded-lg px-5 py-4 text-[15px] leading-normal lg:max-w-110">
              <p className="mb-0! font-bold!">Et pour vos questions, des ressources :</p>
              <ul className="m-0! flex list-none! flex-wrap gap-x-4 gap-y-2 p-0! font-medium">
                {["Les dispositifs", "Le blog", "Le centre d'aide (FAQ)"].map((l) => (
                  <li key={l} className="underline">
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
                <p className="text-title-grey mb-0! text-xl! leading-normal! font-bold!">Suivi des candidatures</p>
                <p className="text-mention-grey mb-0! text-xs! leading-normal!">4 missions partagées · 2 vues · 1 candidature</p>
                {/* Tableau simple (pas de `fr-table` : son JS DSFR réécrit le DOM et casse l'hydratation). */}
                <div className="border-border-default-grey overflow-x-auto border">
                  <table className="w-full table-fixed text-left text-[13px] leading-normal">
                    <caption className="fr-sr-only">Suivi des missions partagées</caption>
                    <thead className="text-title-grey bg-(--background-alt-grey)">
                      <tr>
                        <th scope="col" className="px-4! py-3! font-bold!">
                          Mission
                        </th>
                        <th scope="col" className="w-28 px-4! py-3! font-bold! max-md:hidden!">
                          Dispositif
                        </th>
                        <th scope="col" className="w-44 px-4! py-3! font-bold!">
                          Statut
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {STATUTS.map((s) => (
                        <tr key={s.mission} className={s.row}>
                          <td className="text-blue-france-sun px-4! py-3! underline">{s.mission}</td>
                          <td className="text-default-grey px-4! py-3! max-md:hidden!">{s.dispositif}</td>
                          <td className="px-4! py-3!">
                            <Badge className={`${s.badge} text-[10px] leading-normal whitespace-nowrap`}>{s.statut}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            }
          >
            <p className={TEXTE}>Retrouvez les missions partagées et voyez si elles ont été consultées et si une candidature a été déposée.</p>
          </Etape>
        </ol>
      </div>
    </section>
  );
}
