import dotenv from "dotenv";
dotenv.config();

import demarchesSimplifiees from "@/services/demarches-simplifiees";
import { detectCandidateFields, extractCandidateAttributes, extractDemarcheSlug, resolveCandidateFields } from "@/services/demarches-simplifiees/utils";

// Teste, sur un dossier réel, les fonctions utilisées par le job d'import des candidatures Démarches Simplifiées
// pour enrichir les candidatures (customAttributes candidate*). Lecture seule : aucune écriture en base ni sur DN.
// Usage : npx ts-node scripts/try-demarches-simplifiees.ts <dossierNumber> [demarcheUrl]
//
// Prérequis : DEMARCHES_SIMPLIFIEES_TOKEN dans le .env, avec accès à la démarche du dossier.
// Le dossier doit avoir été créé il y a moins de 15 jours (même fenêtre que le job).

const FIFTEEN_DAYS_IN_MS = 15 * 24 * 60 * 60 * 1000;

const print = (title: string, value: unknown) => {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(value, null, 2));
};

const main = async () => {
  const [, , dossierNumberArg, demarcheUrl] = process.argv;
  const dossierNumber = Number.parseInt(dossierNumberArg, 10);
  if (!dossierNumber) {
    console.error("Usage: npx ts-node scripts/try-demarches-simplifiees.ts <dossierNumber> [demarcheUrl]");
    process.exit(1);
  }

  const dossierDemarche = await demarchesSimplifiees.query<{ dossier: { demarche: { number: number } } }>(
    `query ($number: Int!) {
      dossier(number: $number) {
        demarche {
          number
        }
      }
    }`,
    { number: dossierNumber }
  );
  if (!dossierDemarche.ok) {
    print(`Démarche du dossier #${dossierNumber} introuvable`, dossierDemarche);
    return;
  }
  const demarcheNumber = dossierDemarche.data.dossier.demarche.number;
  console.log(`\nDossier #${dossierNumber} → démarche #${demarcheNumber}`);

  if (demarcheUrl) {
    print(`resolveDemarcheByUrl(${demarcheUrl})`, await demarchesSimplifiees.resolveDemarcheByUrl(demarcheUrl));
  }

  const descriptors = await demarchesSimplifiees.getChampDescriptors(demarcheNumber, extractDemarcheSlug(demarcheUrl));
  print(`getChampDescriptors(${demarcheNumber})`, descriptors);
  if (!descriptors.ok) {
    return;
  }

  const detectedFields = detectCandidateFields(descriptors.data);
  print("detectCandidateFields", detectedFields);

  const dossiers = await demarchesSimplifiees.getAllDossiers(demarcheNumber, new Date(Date.now() - FIFTEEN_DAYS_IN_MS));
  if (!dossiers.ok) {
    print(`getAllDossiers(${demarcheNumber})`, dossiers);
    return;
  }
  const dossier = dossiers.data.find((item) => item.number === dossierNumber);
  if (!dossier) {
    console.log(`\nDossier #${dossierNumber} absent des ${dossiers.data.length} dossiers créés ces 15 derniers jours`);
    return;
  }
  print(`Dossier #${dossierNumber} (via getAllDossiers)`, dossier);

  // Comme le job, avec les champs détectés comme config du back-office (aucun champ manquant attendu).
  const { fields, missingFields } = resolveCandidateFields(detectedFields, descriptors.data);
  print("resolveCandidateFields", { fields, missingFields });

  if (!dossier.dateDepot) {
    console.log("\nDossier non déposé : il serait ignoré par le job (calcul de l'âge à la date du jour)");
  }
  const referenceDate = dossier.dateDepot ? new Date(dossier.dateDepot) : new Date();
  print("extractCandidateAttributes", extractCandidateAttributes(dossier, fields, referenceDate));
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[try-demarches-simplifiees] Fatal error:", error);
    process.exit(1);
  });
