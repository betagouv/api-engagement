import { PUBLISHER_IDS } from "@/config";
import { LINKEDIN_PAGES } from "@/jobs/linkedin/config";
import { descriptionBlock } from "@/jobs/linkedin/dispositifs/blocks";
import { DispositifDefinition } from "@/jobs/linkedin/types";

// Montant à mettre à jour chaque année.
const MONTHLY_ALLOWANCE = "619,83 €";

export const serviceCivique: DispositifDefinition = {
  id: "service-civique",
  label: "Service Civique",
  scope: { publisherIds: [PUBLISHER_IDS.SERVICE_CIVIQUE] },
  jobType: "INTERNSHIP",
  page: () => LINKEDIN_PAGES.TTM,
  // Sans doubler un préfixe « Service Civique » déjà présent dans le titre.
  title: (mission) => `Service Civique : ${mission.title.trim().replace(/^service civique\s*[:\-–—]?\s*/i, "")}`,
  description: (mission) => `<p>Mission de service civique proposée par ${mission.organizationName}.</p>
${descriptionBlock(mission)}
<p><b>Conditions d'éligibilité</b></p>
<p>Pour postuler à un Service Civique, vous devez obligatoirement :</p>
<ul>
<li><b>Avoir 16 à 25 ans</b> (jusqu'à 30 ans, pour les personnes en situation de handicap)</li>
<li><b>Être ressortissant français,</b> UE (ou hors UE avec titre de séjour valide)</li>
</ul>
<p><b>L'indemnité mensuelle s'élève à ${MONTHLY_ALLOWANCE} nets</b> (non imposable), avec une majoration possible selon votre situation.</p>
<p>Le Service Civique permet de réaliser des missions dans différents domaines d'actions, pour se sentir utile, acquérir des compétences ou se découvrir.</p>`,
};
