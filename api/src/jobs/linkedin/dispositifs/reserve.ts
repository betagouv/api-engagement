import { PUBLISHER_IDS } from "@/config";
import { LINKEDIN_PAGES } from "@/jobs/linkedin/config";
import { descriptionBlock, scheduleBlock } from "@/jobs/linkedin/dispositifs/blocks";
import { DispositifDefinition } from "@/jobs/linkedin/types";

const ROC_INTRO = `<p>🎖️ <b>Et si vous deveniez réserviste ?</b></p>
<p>Découvrez la réserve, un engagement qui vous permet de servir votre pays tout en gardant votre activité.</p>
<ul>
<li>🎯 Des missions variées, de la protection du territoire à des missions liées à vos compétences.</li>
<li>👥 Ouvert de 17 à 72 ans, aux personnes de nationalité française, en règle avec la journée de mobilisation et sans condamnation.</li>
<li>🩺 Pas de test sportif systématique, mais une visite médicale d'aptitude est obligatoire.</li>
<li>📅 Les dates de mobilisation se fixent toujours d'un commun accord avec le réserviste.</li>
<li>💼 Côté salarié : dans une entreprise de plus de 50 salariés, 10 jours par an peuvent être consacrés à la réserve, voire davantage si une convention d'entreprise a été signée.</li>
<li>💰 Rémunération : dans la majorité des cas, entre 50 € et 100 € par jour selon le grade, hors primes. Solde non imposable.</li>
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

// Réserve : même titre, page et contenu de mission ; seule l'introduction diffère selon le publisher.
const reserviste = {
  // LinkedIn n'accepte qu'un type d'emploi (la spec souhaitait CONTRACT + PART_TIME).
  jobType: "CONTRACT",
  page: () => LINKEDIN_PAGES.TTM,
  title: (mission) => `Réserviste : ${mission.title.trim()} - Sécurité, Défense, Résilience nationale`,
} satisfies Pick<DispositifDefinition, "jobType" | "page" | "title">;

export const roc: DispositifDefinition = {
  ...reserviste,
  id: "roc",
  label: "Réserve opérationnelle (ROC)",
  scope: { publisherIds: [PUBLISHER_IDS.ROC] },
  description: (mission) => `${ROC_INTRO}\n${descriptionBlock(mission)}\n${scheduleBlock(mission)}`,
};

export const pnGn: DispositifDefinition = {
  ...reserviste,
  id: "pn-gn",
  label: "Réserve Police et Gendarmerie (PN, GN)",
  scope: { publisherIds: [PUBLISHER_IDS.POLICE, PUBLISHER_IDS.GENDARMERIE] },
  description: (mission) => `<p>Mission proposée par ${mission.organizationName}</p>\n${descriptionBlock(mission)}\n${scheduleBlock(mission)}`,
};
