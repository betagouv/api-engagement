import { captureException } from "@/error";
import { BaseHandler } from "@/jobs/base/handler";
import { JobResult } from "@/jobs/types";
import { missionAddressRepository } from "@/repositories/mission-address";
import { enrichWithGeoloc, GeolocMissionInput } from "@/services/geoloc";

const CHUNK_SIZE = 2000;
const LABEL = "enrich-missions-geoloc";
const MAX_FAILURES = 5;

export interface EnrichMissionsGeolocJobPayload {
  includeFailedAddresses?: boolean;
}

export interface EnrichMissionsGeolocJobResult extends JobResult {
  enrichedCount: number;
  failedCount: number;
}

export class EnrichMissionsGeolocHandler implements BaseHandler<EnrichMissionsGeolocJobPayload, EnrichMissionsGeolocJobResult> {
  name = "Enrichissement géographique des missions";

  async handle(payload: EnrichMissionsGeolocJobPayload = {}): Promise<EnrichMissionsGeolocJobResult> {
    const start = new Date();
    console.log(`[${LABEL}] Starting at ${start.toISOString()}`);

    const statuses = ["SHOULD_ENRICH", ...(payload.includeFailedAddresses ? ["FAILED"] : [])];

    let enrichedCount = 0;
    let failedCount = 0;
    let lastProcessedId: string | null = null;

    while (true) {
      const addresses = await missionAddressRepository.findMany({
        where: {
          geolocStatus: { in: statuses },
          geolocFailureCount: { lt: MAX_FAILURES },
          mission: { deletedAt: null },
          ...(lastProcessedId ? { id: { gt: lastProcessedId } } : {}),
        },
        include: { mission: { select: { clientId: true } } },
        orderBy: { id: "asc" },
        take: CHUNK_SIZE,
      });

      if (!addresses.length) {
        break;
      }
      lastProcessedId = addresses[addresses.length - 1].id;

      // Group addresses by missionId, preserving order for stable addressIndex
      const missionMap = new Map<string, { clientId: string; addresses: typeof addresses }>();
      for (const addr of addresses) {
        const mission = (addr as any).mission as { clientId: string };
        if (!mission) {
          continue;
        }
        if (!missionMap.has(addr.missionId)) {
          missionMap.set(addr.missionId, { clientId: mission.clientId, addresses: [] });
        }
        missionMap.get(addr.missionId)!.addresses.push(addr);
      }

      const geolocInputs: GeolocMissionInput[] = Array.from(missionMap.values()).map(({ clientId, addresses: missionAddresses }) => ({
        clientId,
        addresses: missionAddresses.map((a) => ({
          street: a.street,
          city: a.city,
          postalCode: a.postalCode,
          departmentCode: a.departmentCode,
          geolocStatus: a.geolocStatus,
        })),
      }));

      const results = await enrichWithGeoloc(LABEL, geolocInputs);

      for (const result of results) {
        const missionEntry = Array.from(missionMap.values()).find((e) => e.clientId === result.clientId);
        if (!missionEntry) {
          continue;
        }

        const targetAddress = missionEntry.addresses[result.addressIndex];
        if (!targetAddress) {
          continue;
        }

        try {
          await missionAddressRepository.update(targetAddress.id, {
            street: result.street ?? targetAddress.street,
            city: result.city ?? targetAddress.city,
            postalCode: result.postalCode ?? targetAddress.postalCode,
            departmentCode: result.departmentCode ?? targetAddress.departmentCode,
            departmentName: result.departmentName ?? targetAddress.departmentName,
            region: result.region ?? targetAddress.region,
            locationLat: result.location?.lat ?? null,
            locationLon: result.location?.lon ?? null,
            geolocStatus: result.geolocStatus,
          });

          if (result.geolocStatus === "ENRICHED_BY_API") {
            enrichedCount++;
          } else {
            failedCount++;
          }
        } catch (error) {
          captureException(error, `[${LABEL}] Failed to update address ${targetAddress.id}`);
          failedCount++;
          try {
            await missionAddressRepository.update(targetAddress.id, {
              geolocStatus: "FAILED",
              geolocFailureCount: { increment: 1 },
            });
          } catch {
            // DB is unavailable — will be retried next run
          }
        }
      }

      console.log(`[${LABEL}] Processed chunk of ${addresses.length} addresses (lastProcessedId ${lastProcessedId})`);
    }

    const message = `${enrichedCount} addresses enriched, ${failedCount} failed or not found`;
    console.log(`[${LABEL}] Done. ${message}`);

    return {
      success: true,
      timestamp: start,
      message,
      enrichedCount,
      failedCount,
    };
  }
}
