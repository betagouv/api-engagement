import { SLACK_WARNING_CHANNEL_ID } from "../../config";

import { importService } from "../../services/import";
import { postMessage } from "../../services/slack";
import { warningService } from "../../services/warning";
import type { PublisherRecord } from "../../types/publisher";

const ERROR_WARNING = "ERROR_WARNING";
const EMPTY_WARNING = "EMPTY_WARNING";
const VALIDATION_WARNING = "VALIDATION_WARNING";

export const checkImports = async (publishers: PublisherRecord[]) => {
  const imports = await importService.findLastImportsPerPublisher();
  console.log(`Checking ${imports.length} import from ${publishers.length} publishers`);

  for (const publisher of publishers) {
    const lastImport = imports.find((i) => i.publisherId === publisher.id);
    if (!lastImport) {
      console.log(`[${publisher.name}] Never imported`);
      continue;
    }

    console.log(`[${publisher.name}] Last import at ${lastImport.startedAt}`);

    const errorWarning = await warningService.findOneWarning({
      publisherId: publisher.id,
      type: ERROR_WARNING,
      fixed: false,
    });
    if (lastImport.status === "FAILED") {
      console.log(`[${publisher.name}] Error while importing`);
      if (errorWarning) {
        await warningService.updateWarning(errorWarning.id, {
          description: lastImport.status,
          occurrences: errorWarning.occurrences + 1,
        });
        continue;
      } else {
        await warningService.createWarning({
          type: ERROR_WARNING,
          title: "Le flux XML n'est pas valable, il renvoie une erreur.",
          description: lastImport.status,
          publisherId: publisher.id,
        });
        const res = await postMessage(
          {
            text: `Alerte détectée: ${publisher.name} - Erreur de flux \n ${lastImport.error}`,
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
    if (lastImport.missionCount === 0) {
      console.log(`[${publisher.name}] No mission imported`);
      if (importWarning) {
        await warningService.updateWarning(importWarning.id, {
          title: "Aucune mission n'est disponible dans le flux XML.",
          description: `Dernière importation : ${lastImport.startedAt}`,
          occurrences: importWarning.occurrences + 1,
        });
        continue;
      } else {
        await warningService.createWarning({
          type: EMPTY_WARNING,
          title: "Aucune mission n'est disponible dans le flux XML.",
          description: `Nombre missions refusées : ${lastImport.refusedCount} / Nombre missions total : ${lastImport.missionCount}`,
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
      console.log(`[${publisher.name}] ${lastImport.missionCount} missions imported`);
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
    if (lastImport.refusedCount / lastImport.missionCount > 0.75) {
      console.log(`[${publisher.name}] ${Math.round((lastImport.refusedCount / lastImport.missionCount) * 100)}% of missions refused`);
      if (validationWarning) {
        await warningService.updateWarning(validationWarning.id, {
          title: `${Math.round((lastImport.refusedCount / lastImport.missionCount) * 100)}% des missions sont refusées par l'API.`,
          description: `Nombre missions refusées : ${lastImport.refusedCount} / Nombre missions total : ${lastImport.missionCount}, dernière importation : ${lastImport.startedAt}`,
          occurrences: validationWarning.occurrences + 1,
        });
        continue;
      } else {
        await warningService.createWarning({
          type: VALIDATION_WARNING,
          title: `${Math.round((lastImport.refusedCount / lastImport.missionCount) * 100)}% des missions sont refusées par l'API.`,
          description: `Nombre missions refusées : ${lastImport.refusedCount} / Nombre missions total : ${lastImport.missionCount}, dernière importation : ${lastImport.startedAt}`,
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
      console.log(`[${publisher.name}] ${Math.round((lastImport.refusedCount / lastImport.missionCount) * 100)}% of missions refused`);
      if (validationWarning) {
        await warningService.updateWarning(validationWarning.id, {
          fixed: true,
          fixedAt: new Date(),
        });
      }
    }
  }
};
