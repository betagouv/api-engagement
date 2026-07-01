import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import { JobResult } from "@/jobs/types";
import demarchesSimplifiees from "@/services/demarches-simplifiees";
import { isRedirectionAnnotation } from "@/services/demarches-simplifiees/utils";
import { publisherDemarcheSimplifieesService } from "@/services/publisher-demarches-simplifiees";
import { statEventService } from "@/services/stat-event";
import { StatEventRecord } from "@/types";

const FIFTEEN_DAYS_IN_MS = 15 * 24 * 60 * 60 * 1000;

interface DemarchesSimplifieesJobPayload {}

interface DemarchesSimplifieesJobResult extends JobResult {}

export class DemarchesSimplifieesApplyImportHandler implements BaseHandler<DemarchesSimplifieesJobPayload, DemarchesSimplifieesJobResult> {
  name = "Import des candidatures Démarches Simplifiées";

  public async handle(): Promise<DemarchesSimplifieesJobResult> {
    const start = new Date();
    console.log(`[Démarches Simplifiées] Starting at ${start.toISOString()}`);

    const createdSince = new Date(start.getTime() - FIFTEEN_DAYS_IN_MS);
    const demarches = await publisherDemarcheSimplifieesService.findAll();
    const demarcheNumbers = [...new Set(demarches.map((demarche) => demarche.number))];

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
        // 2. Retrouver le clic d'origine : son id est stocké dans l'annotation "Identifiant de la redirection",
        // préremplie lors de la redirection.
        const annotation = dossier.annotations.find((item) => isRedirectionAnnotation(item.label));
        const clickId = annotation?.stringValue;
        if (!clickId) {
          missingClick++;
          console.log(`[Démarches Simplifiées] Démarche ${demarcheNumber}, dossier ${dossier.number}: annotation de redirection vide (dossier non issu d'une redirection trackée)`);
          continue;
        }

        const click = await statEventService.findOneStatEventById(clickId);
        if (!click) {
          missingClick++;
          console.log(`[Démarches Simplifiées] Démarche ${demarcheNumber}, dossier ${dossier.number}: clic ${clickId} introuvable en base`);
          continue;
        }

        // Idempotence : ne pas recréer un apply déjà importé pour ce clic (le job tourne tous les jours sur 15 jours).
        const alreadyImported = await statEventService.hasStatEventWithRecentClickId({ type: "apply", clickId: click._id, since: createdSince });
        if (alreadyImported) {
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

        applyEvent.customAttributes = { demarcheNumeriqueDossierNumber: dossier.number };
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
