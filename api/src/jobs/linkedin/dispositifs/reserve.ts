import { LINKEDIN_PAGES } from "@/jobs/linkedin/config";
import { DispositifDefinition } from "@/jobs/linkedin/types";
import { PublisherMissionType } from "@/types/publisher";

const INTRO = `<p>🎖️ <b>Et si vous deveniez réserviste ?</b></p>
<p>Découvrez la réserve, un engagement qui vous permet de servir votre pays tout en gardant votre activité.</p>
<ul>
<li>🎯 <b>Des missions variées</b>, de la protection du territoire à des missions liées à vos compétences.</li>
<li>👥 <b>Ouvert de 17 à 72 ans.</b></li>
<li>🩺 <b>Pas de test sportif systématique</b>, mais une visite médicale d'aptitude reste obligatoire.</li>
<li>📅 <b>Aucune obligation de jours</b> hors crise majeure : les dates se fixent toujours d'un commun accord avec le réserviste.</li>
<li>💼 <b>Côté salarié :</b> dans une entreprise de plus de 50 salariés, 10 jours par an peuvent être consacrés à la réserve, voire davantage si une convention d'entreprise a été signée.</li>
<li>💰 <b>Rémunération :</b> dans la majorité des cas, entre 50 € et 100 € par jour, hors primes (non imposables).</li>
</ul>
<p>Vous serez formé et épaulé à chaque étape : la formation est adaptée à votre profil, progressive, et vous permettra d'acquérir des compétences utiles toute la vie.</p>
<p><b>Pourquoi devenir réserviste ?</b></p>
<ul>
<li>🇫🇷 Agir concrètement pour son pays</li>
<li>🤝 Rejoindre une équipe soudée et solidaire</li>
<li>🎓 Développer des compétences reconnues (travail en équipe, …)</li>
<li>🔎 Accéder à des offres de recrutement dans les différentes armées</li>
<li>💼 Compatible avec une activité professionnelle ou des études</li>
</ul>
<p><b>Deux façons de vous engager :</b> postuler à une offre précise, ou vous porter volontaire pour une armée en particulier.</p>`;

export const reserve: DispositifDefinition = {
  id: "reserve",
  label: "Réserve (ROC, PN, GN)",
  scope: { missionType: PublisherMissionType.VOLONTARIAT_RESERVE_OPERATIONNELLE },
  // LinkedIn n'accepte qu'un type d'emploi (la spec souhaitait CONTRACT + PART_TIME).
  jobType: "CONTRACT",
  page: () => LINKEDIN_PAGES.TTM,
  title: (mission) => `Réserviste : ${mission.title.trim()} - Sécurité, Défense, Résilience nationale`,
  intro: () => INTRO,
};
