import { COMPENSATION_TYPES, COMPENSATION_UNITS } from "../../../constants/compensation";
import { COUNTRIES } from "../../../constants/countries";
import { DOMAINS } from "../../../constants/domains";
import type { MissionRecord } from "../../../types/mission";
import { hasEncodageIssue } from "./helpers";

export const getModeration = (mission: Partial<MissionRecord> & Record<string, any>) => {
  let statusComment: string | undefined;
  if (!mission.title || mission.title === " ") {
    statusComment = "Titre manquant";
  } else if (hasEncodageIssue(mission.title)) {
    statusComment = "Problème d'encodage dans le titre";
  } else if ((mission.title || "").split(" ").length === 1) {
    statusComment = "Le titre est trop court (1 seul mot)";
  } else if (!mission.clientId) {
    statusComment = "ClientId manquant";
  } else if (!mission.description) {
    statusComment = "Description manquante";
  } else if (hasEncodageIssue(mission.description)) {
    statusComment = "Problème d'encodage dans la description";
  } else if ((mission.description || "").length > 20000) {
    mission.description = mission.description.substring(0, 20000);
    statusComment = "La description est trop longue (plus de 20000 caractères)";
  } else if (!mission.applicationUrl) {
    statusComment = "URL de candidature manquant";
  } else if (mission.country && !COUNTRIES.includes(mission.country)) {
    statusComment = `Pays non valide : "${mission.country}"`;
  } else if (mission.remote && !["no", "possible", "full"].includes(mission.remote)) {
    statusComment = "Valeur remote non valide (no, possible ou full)";
  } else if (typeof mission.places === "number" && mission.places <= 0) {
    statusComment = "Nombre de places invalide (doit être supérieur à 0)";
  } else if (mission.domain && !DOMAINS.includes(mission.domain)) {
    statusComment = `Domaine non valide : "${mission.domain}"`;
  } else if (hasEncodageIssue(mission.organizationName || "")) {
    statusComment = "Problème d'encodage dans le nom de l'organisation";
  } else if (typeof mission.compensationAmount === "number" && mission.compensationAmount < 0) {
    statusComment = "Montant de la compensation invalide (nombre positif attendu)";
  } else if (mission.compensationUnit && !COMPENSATION_UNITS.includes(mission.compensationUnit)) {
    statusComment = `Unité de compensation invalide (${COMPENSATION_UNITS.join(", ")})`;
  } else if (mission.compensationType && !COMPENSATION_TYPES.includes(mission.compensationType)) {
    statusComment = `Type de compensation invalide (${COMPENSATION_TYPES.join(", ")})`;
  }

  mission.statusCode = statusComment ? "REFUSED" : "ACCEPTED";
  mission.statusComment = statusComment || "";
};
