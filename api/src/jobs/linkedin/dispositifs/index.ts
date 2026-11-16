import { jva } from "@/jobs/linkedin/dispositifs/jva";
import { partner } from "@/jobs/linkedin/dispositifs/partner";
import { reserve } from "@/jobs/linkedin/dispositifs/reserve";
import { serviceCivique } from "@/jobs/linkedin/dispositifs/service-civique";
import { spv } from "@/jobs/linkedin/dispositifs/spv";
import { DispositifDefinition } from "@/jobs/linkedin/types";

// Ajouter un dispositif = créer son fichier dans ce dossier puis l'ajouter ici.
// Le périmètre reste borné par les règles de diffusion LinkedIn (`mission_diffusion`).
export const DISPOSITIFS: DispositifDefinition[] = [jva, serviceCivique, spv, reserve, partner];

export { jva, partner, reserve, serviceCivique, spv };
