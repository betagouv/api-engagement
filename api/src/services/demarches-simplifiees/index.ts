import { query } from "./client";
import {
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
};
