import { MissionHistoryEvent, Prisma } from "@prisma/client";
import { SLACK_CRON_CHANNEL_ID } from "../../config";
import prisma from "../../db/postgres";
import { captureException } from "../../error";
import MissionEventModel from "../../models/mission-event";
import { postMessage } from "../../services/slack";
import { MissionEvent } from "../../types";
import { getJobTime } from "../../utils";
import { BaseHandler } from "../base/handler";
import { ExportMissionsEventToPgJobPayload, ExportMissionsEventToPgJobResult } from "./types";
import { transformMongoMissionEventToPg } from "./utils/transformers";

const BULK_SIZE = 10000;
const PG_CHUNK_SIZE = 100;

export class ExportMissionsEventsToPgHandler implements BaseHandler<ExportMissionsEventToPgJobPayload, ExportMissionsEventToPgJobResult> {
  async handle(): Promise<ExportMissionsEventToPgJobResult> {
    const start = new Date();
    console.log(`[Export missions events to PG] Starting at ${start.toISOString()}`);

    const count = await MissionEventModel.countDocuments({ lastExportedToPgAt: null });
    console.log(`[Export missions events to PG] Found ${count} missions to sync`);

    const counter = {
      processed: 0,
      success: 0,
      error: 0,
    };

    for (let i = 0; i < count; i += BULK_SIZE) {
      const events = await MissionEventModel.find({ lastExportedToPgAt: null }).limit(BULK_SIZE).skip(i).lean();
      console.log(`[Export missions events to PG] Processing batch ${i / BULK_SIZE + 1} / ${Math.ceil(count / BULK_SIZE)} (${events.length} events)`);

      for (let i = 0; i < events.length; i += PG_CHUNK_SIZE) {
        const batch = events.slice(i, i + PG_CHUNK_SIZE) as MissionEvent[];
        console.log(`[Export missions to PG] Batch ${i / PG_CHUNK_SIZE + 1} / ${Math.ceil(events.length / PG_CHUNK_SIZE)} (${batch.length} missions)`);

        const missionIds: string[] = [...new Set(events.map((e) => e.missionId.toString()).filter((e) => e !== undefined))] as string[];
        const missions = {} as { [key: string]: string };
        await prisma.mission
          .findMany({
            where: { old_id: { in: missionIds } },
            select: { id: true, old_id: true },
          })
          .then((data) => data.forEach((d) => (missions[d.old_id] = d.id)));

        console.log(`[Export missions to PG] Found ${Object.keys(missions).length} missions related to events`);

        const eventsToCreate: Omit<MissionHistoryEvent, "id">[] = [];
        for (const event of batch) {
          counter.processed++;

          const mission = missions[event.missionId.toString()];
          if (!mission) {
            console.error(`[Export missions to PG] No mission found for event ${event._id.toString()} (missionId: ${event.missionId})`);
            counter.error++;
            continue;
          }
          const result = transformMongoMissionEventToPg(event, mission);
          if (result && result.length > 0) {
            eventsToCreate.push(...result);
          }
        }
        try {
          if (eventsToCreate.length > 0) {
            // Prisma issue: https://github.com/prisma/prisma/issues/12131
            const res = await prisma.missionHistoryEvent.createMany({ data: eventsToCreate.map((e) => ({ ...e, changes: e.changes === null ? Prisma.JsonNull : e.changes })) });
            counter.success += res.count;
          }
        } catch (error) {
          captureException(error, { extra: { eventsToCreate } });
        }

        await MissionEventModel.updateMany({ _id: { $in: batch.map((m) => m._id) } }, { $set: { lastExportedToPgAt: new Date() } });
        console.log(`[Export missions to PG] Updated lastExportedToPgAt for ${batch.length} missions (batch)`);
      }
    }

    const time = getJobTime(start);
    await postMessage(
      {
        title: `Export des evenements historiques des missions vers PG terminée en ${time}`,
        text: `\t• Nombre d'evenements traités: ${counter.processed}\n\t• Nombre d'evenements traités avec succès: ${counter.success}\n\t• Nombre d'evenements en erreur: ${counter.error}`,
      },
      SLACK_CRON_CHANNEL_ID
    );

    return {
      success: true,
      timestamp: new Date(),
      counter,
    };
  }
}
