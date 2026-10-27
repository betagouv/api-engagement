import { query } from "./client";
import { createDossier, getAllDossiers, getAnnotationId, getChampDescriptors, getDemarche, getDemarcheNumberBySlug, getDossier, resolveDemarcheByUrl } from "./functions";

export default { query, getDemarche, getDossier, getAllDossiers, createDossier, getDemarcheNumberBySlug, getAnnotationId, getChampDescriptors, resolveDemarcheByUrl };
