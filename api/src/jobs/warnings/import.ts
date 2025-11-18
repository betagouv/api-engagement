import { SLACK_WARNING_CHANNEL_ID } from "../../config";
import WarningModel from "../../models/warning";
import { importService } from "../../services/import";
import { postMessage } from "../../services/slack";
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

    const errorWarning = await WarningModel.findOne({ publisherId: publisher.id, type: ERROR_WARNING, fixed: false }, null, { sort: { createdAt: -1 } });
    if (lastImport.status === "FAILED") {
      console.log(`[${publisher.name}] Error while importing`);
      if (errorWarning) {
        errorWarning.description = lastImport.status;
        errorWarning.occurrences += 1;
        await errorWarning.save();
        continue;
      } else {
        const obj = {
          type: ERROR_WARNING,
          title: "Le flux XML n’est pas valable, il renvoie une erreur.",
          description: lastImport.status,
          publisherId: publisher.id,
          publisherName: publisher.name,
          publisherLogo: publisher.logo,
        };
        await WarningModel.create(obj);
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
        errorWarning.fixed = true;
        errorWarning.fixedAt = new Date();
        await errorWarning.save();
      }
    }

    const importWarning = await WarningModel.findOne({ publisherId: publisher.id, type: EMPTY_WARNING, fixed: false }, null, { sort: { createdAt: -1 } });
    if (lastImport.missionCount === 0) {
      console.log(`[${publisher.name}] No mission imported`);
      if (importWarning) {
        importWarning.title = "Aucune mission n’est disponible dans le flux XML.";
        importWarning.description = `Dernière importation : ${lastImport.startedAt}`;
        importWarning.occurrences += 1;
        await importWarning.save();
        continue;
      } else {
        const obj = {
          type: EMPTY_WARNING,
          title: "Aucune mission n’est disponible dans le flux XML.",
          description: `Nombre missions refusées : ${lastImport.refusedCount} / Nombre missions total : ${lastImport.missionCount}`,
          publisherId: publisher.id,
          publisherName: publisher.name,
          publisherLogo: publisher.logo,
        };
        await WarningModel.create(obj);
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
        importWarning.fixed = true;
        importWarning.fixedAt = new Date();
        await importWarning.save();
      }
    }

    const validationWarning = await WarningModel.findOne({ publisherId: publisher.id, type: VALIDATION_WARNING, fixed: false }, null, {
      sort: { createdAt: -1 },
    });
    if (lastImport.refusedCount / lastImport.missionCount > 0.75) {
      console.log(`[${publisher.name}] ${Math.round((lastImport.refusedCount / lastImport.missionCount) * 100)}% of missions refused`);
      if (validationWarning) {
        validationWarning.title = `${Math.round((lastImport.refusedCount / lastImport.missionCount) * 100)}% des missions sont refusées par l’API.`;
        validationWarning.description = `Nombre missions refusées : ${lastImport.refusedCount} / Nombre missions total : ${lastImport.missionCount}, dernière importation : ${lastImport.startedAt}`;
        validationWarning.occurrences += 1;
        await validationWarning.save();
        continue;
      } else {
        const obj = {
          type: VALIDATION_WARNING,
          title: `${Math.round((lastImport.refusedCount / lastImport.missionCount) * 100)}% des missions sont refusées par l’API.`,
          description: `Nombre missions refusées : ${lastImport.refusedCount} / Nombre missions total : ${lastImport.missionCount}, dernière importation : ${lastImport.startedAt}`,
          publisherId: publisher.id,
          publisherName: publisher.name,
          publisherLogo: publisher.logo,
        };
        await WarningModel.create(obj);
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
        validationWarning.fixed = true;
        validationWarning.fixedAt = new Date();
        await validationWarning.save();
      }
    }
  }
};
