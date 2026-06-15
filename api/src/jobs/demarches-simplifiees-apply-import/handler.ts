import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import { JobResult } from "@/jobs/types";
import demarchesSimplifiees from "@/services/demarches-simplifiees";
import { statEventService } from "@/services/stat-event";
import { StatEventRecord } from "@/types";
import { DEMARCHE_SIMPLIFIEES_DEMARCH_NUMBERS_MAP } from "@/utils/demarches-simplifiees";

const FIFTEEN_DAYS_IN_MS = 15 * 24 * 60 * 60 * 1000;

interface DemarchesSimplifieesJobPayload {}

interface DemarchesSimplifieesJobResult extends JobResult {}

export class DemarchesSimplifieesApplyImportHandler implements BaseHandler<DemarchesSimplifieesJobPayload, DemarchesSimplifieesJobResult> {
  name = "Import des candidatures Démarches Simplifiées";

  public async handle(): Promise<DemarchesSimplifieesJobResult> {
    const start = new Date();
    console.log(`[Démarches Simplifiées] Starting at ${start.toISOString()}`);

    const createdSince = new Date(start.getTime() - FIFTEEN_DAYS_IN_MS);
    const demarcheNumbers = Object.values(DEMARCHE_SIMPLIFIEES_DEMARCH_NUMBERS_MAP);

    let submitted = 0;
    let created = 0;
    let alreadyExisting = 0;
    let missingClick = 0;
    const failedDemarches: number[] = [];

    for (const demarcheNumber of demarcheNumbers) {
      // 1. Récupérer les dossiers de la démarche créés sur les 15 derniers jours.
      const dossiersResult = await demarchesSimplifiees.getAllDossiers(demarcheNumber, createdSince);
      if (!dossiersResult.ok) {
        captureException("[Démarches Simplifiées] Failed to fetch dossiers", { extra: { demarcheNumber, message: dossiersResult.message } });
        failedDemarches.push(demarcheNumber);
        continue;
      }

      // Un dossier est considéré "déposé" (candidature envoyée) dès qu'il a une dateDepot.
      const submittedDossiers = dossiersResult.data.filter((dossier) => dossier.dateDepot);
      submitted += submittedDossiers.length;
      console.log(`[Démarches Simplifiées] Démarche ${demarcheNumber}: ${dossiersResult.data.length} dossiers récupérés, ${submittedDossiers.length} déposés`);

      for (const dossier of submittedDossiers) {
        // 2. Retrouver le clic d'origine : il porte le numéro de dossier dans customAttributes.dNDossierNumber
        // (posé lors de la création du dossier prérempli côté redirect).
        const click = await statEventService.findOneStatEventByDossierNumber({ dossierNumber: dossier.number, type: "click" });
        if (!click) {
          missingClick++;
          continue;
        }

        // Idempotence : ne pas recréer un apply déjà importé pour ce dossier (le job tourne tous les jours sur 15 jours).
        const existingApply = await statEventService.findOneStatEventByDossierNumber({ dossierNumber: dossier.number, type: "apply" });
        if (existingApply) {
          alreadyExisting++;
          continue;
        }

        // 3. Créer l'apply, lié au clic (mêmes mission/publishers/source), daté du dépôt du dossier.
        const applyEvent = {
          referer: click.referer,
          userAgent: click.userAgent,
          host: click.host,
          origin: click.origin,
          type: "apply",
          createdAt: dossier.dateDepot ? new Date(dossier.dateDepot) : new Date(),
          isBot: click.isBot,
          isHuman: click.isHuman,
        } as StatEventRecord;

        applyEvent.customAttributes = { dNDossierNumber: dossier.number };
        applyEvent.clickId = click._id;
        applyEvent.clickUser = click.user;
        applyEvent.user = click.user;
        applyEvent.source = click.source;
        applyEvent.sourceName = click.sourceName;
        applyEvent.sourceId = click.sourceId;
        applyEvent.fromPublisherId = click.fromPublisherId;
        applyEvent.fromPublisherName = click.fromPublisherName;
        applyEvent.toPublisherId = click.toPublisherId;
        applyEvent.toPublisherName = click.toPublisherName;
        applyEvent.missionId = click.missionId;

        await statEventService.createStatEvent(applyEvent);
        created++;
      }
    }

    console.log(`[Démarches Simplifiées] Ended at ${new Date().toISOString()}`);
    return {
      success: failedDemarches.length === 0,
      timestamp: new Date(),
      message: `\t• Dossiers déposés: ${submitted}\n\t• Apply créés: ${created}\n\t• Déjà existants: ${alreadyExisting}\n\t• Clic introuvable: ${missingClick}\n\t• Démarches en échec: ${failedDemarches.length}`,
    };
  }
}
