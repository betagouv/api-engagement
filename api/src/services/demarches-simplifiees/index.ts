import { query } from "./client";
import {
  checkDossier,
  checkToken,
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
  checkToken,
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
