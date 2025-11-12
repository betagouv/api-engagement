import { SLACK_WARNING_CHANNEL_ID } from "../../config";
import ImportModel from "../../models/import";
import { postMessage } from "../../services/slack";
import { warningService } from "../../services/warning";
import { Import } from "../../types";
import type { PublisherRecord } from "../../types/publisher";

const ERROR_WARNING = "ERROR_WARNING";
const EMPTY_WARNING = "EMPTY_WARNING";
const VALIDATION_WARNING = "VALIDATION_WARNING";

export const checkImports = async (publishers: PublisherRecord[]) => {
  const imports = await ImportModel.aggregate([{ $group: { _id: "$publisherId", doc: { $last: "$$ROOT" } } }]);
  console.log(`Checking ${imports.length} import from ${publishers.length} publishers`);

  for (const publisher of publishers) {
    const lastImport = imports.find((i) => i.doc.publisherId === publisher.id) as { doc: Import } | undefined;
    if (!lastImport) {
      console.log(`[${publisher.name}] Never imported`);
      continue;
    }

    if (!lastImport) {
      console.log(`[${publisher.name}] Never imported`);
      continue;
    }
    console.log(`[${publisher.name}] Last import at ${lastImport.doc.startedAt}`);

    const errorWarning = await warningService.findOneWarning({
      publisherId: publisher.id,
      type: ERROR_WARNING,
      fixed: false,
    });
    if (lastImport.doc.status === "FAILED") {
      console.log(`[${publisher.name}] Error while importing`);
      if (errorWarning) {
        await warningService.updateWarning(errorWarning.id, {
          description: lastImport.doc.status,
          occurrences: errorWarning.occurrences + 1,
        });
        continue;
      } else {
        await warningService.createWarning({
          type: ERROR_WARNING,
          title: "Le flux XML n'est pas valable, il renvoie une erreur.",
          description: lastImport.doc.status,
          publisherId: publisher.id,
        });
        const res = await postMessage(
          {
            text: `Alerte détectée: ${publisher.name} - Erreur de flux \n ${lastImport.doc.error}`,
          },
          SLACK_WARNING_CHANNEL_ID
        );
        if (res.error) {
          console.error(res.error);
        } else {
          console.log("Slack message sent");
        }
        continue;
      }
    } else {
      console.log(`[${publisher.name}] No error while importing`);
      if (errorWarning) {
        await warningService.updateWarning(errorWarning.id, {
          fixed: true,
          fixedAt: new Date(),
        });
      }
    }

    const importWarning = await warningService.findOneWarning({
      publisherId: publisher.id,
      type: EMPTY_WARNING,
      fixed: false,
    });
    if (lastImport.doc.missionCount === 0) {
      console.log(`[${publisher.name}] No mission imported`);
      if (importWarning) {
        await warningService.updateWarning(importWarning.id, {
          title: "Aucune mission n'est disponible dans le flux XML.",
          description: `Dernière importation : ${lastImport.doc.startedAt}`,
          occurrences: importWarning.occurrences + 1,
        });
        continue;
      } else {
        await warningService.createWarning({
          type: EMPTY_WARNING,
          title: "Aucune mission n'est disponible dans le flux XML.",
          description: `Nombre missions refusées : ${lastImport.doc.refusedCount} / Nombre missions total : ${lastImport.doc.missionCount}`,
          publisherId: publisher.id,
        });
        const res = await postMessage({ text: `Alerte détectée: ${publisher.name} - Flux vide` }, SLACK_WARNING_CHANNEL_ID);
        if (res.error) {
          console.error(res.error);
        } else {
          console.log("Slack message sent");
        }
        continue;
      }
    } else {
      console.log(`[${publisher.name}] ${lastImport.doc.missionCount} missions imported`);
      if (importWarning) {
        await warningService.updateWarning(importWarning.id, {
          fixed: true,
          fixedAt: new Date(),
        });
      }
    }

    const validationWarning = await warningService.findOneWarning({
      publisherId: publisher.id,
      type: VALIDATION_WARNING,
      fixed: false,
    });
    if (lastImport.doc.refusedCount / lastImport.doc.missionCount > 0.75) {
      console.log(`[${publisher.name}] ${Math.round((lastImport.doc.refusedCount / lastImport.doc.missionCount) * 100)}% of missions refused`);
      if (validationWarning) {
        await warningService.updateWarning(validationWarning.id, {
          title: `${Math.round((lastImport.doc.refusedCount / lastImport.doc.missionCount) * 100)}% des missions sont refusées par l'API.`,
          description: `Nombre missions refusées : ${lastImport.doc.refusedCount} / Nombre missions total : ${lastImport.doc.missionCount}, dernière importation : ${lastImport.doc.startedAt}`,
          occurrences: validationWarning.occurrences + 1,
        });
        continue;
      } else {
        await warningService.createWarning({
          type: VALIDATION_WARNING,
          title: `${Math.round((lastImport.doc.refusedCount / lastImport.doc.missionCount) * 100)}% des missions sont refusées par l'API.`,
          description: `Nombre missions refusées : ${lastImport.doc.refusedCount} / Nombre missions total : ${lastImport.doc.missionCount}, dernière importation : ${lastImport.doc.startedAt}`,
          publisherId: publisher.id,
        });
        const res = await postMessage({ text: `Alerte détectée: ${publisher.name} - Taux de validation critique` }, SLACK_WARNING_CHANNEL_ID);
        if (res.error) {
          console.error(res.error);
        } else {
          console.log("Slack message sent");
        }
        continue;
      }
    } else {
      console.log(`[${publisher.name}] ${Math.round((lastImport.doc.refusedCount / lastImport.doc.missionCount) * 100)}% of missions refused`);
      if (validationWarning) {
        await warningService.updateWarning(validationWarning.id, {
          fixed: true,
          fixedAt: new Date(),
        });
      }
    }
  }
};
