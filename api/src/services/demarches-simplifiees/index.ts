import { query } from "./client";
import { createDossier, getAllDossiers, getAnnotationId, getDemarche, getDemarcheNumberBySlug, getDossier, resolveDemarcheByUrl } from "./functions";

export default { query, getDemarche, getDossier, getAllDossiers, createDossier, getDemarcheNumberBySlug, getAnnotationId, resolveDemarcheByUrl };
