import { query } from "./client";
import {
  checkDossier,
  createDossier,
  getAllDossiers,
  getAnnotationId,
  getChampDescriptors,
  getDemarche,
  getDemarcheAccess,
  getDemarcheNumberBySlug,
  getDossier,
  getPublicChampDescriptors,
  resolveDemarcheByUrl,
} from "./functions";

export default {
  query,
  getDemarche,
  getDossier,
  getAllDossiers,
  createDossier,
  getDemarcheNumberBySlug,
  getAnnotationId,
  getChampDescriptors,
  getPublicChampDescriptors,
  getDemarcheAccess,
  resolveDemarcheByUrl,
  checkDossier,
};
