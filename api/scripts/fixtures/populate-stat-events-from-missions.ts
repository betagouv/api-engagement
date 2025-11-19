import { randomUUID } from "crypto";

import mongoose from "mongoose";

import { loadEnvironment } from "../mongo-backfill/utils/options";

import type { Mission } from "../../src/types";
import type { StatEventRecord, StatEventSource, StatEventStatus, StatEventType } from "../../src/types/stat-event";

type PublisherInfo = {
  id: string;
  name: string;
};

type SourceVariant = {
  source: StatEventSource;
  sourceName: string;
  origin: string;
  referer: string;
  host: string;
  userAgent: string;
  tags: string[];
  device: string;
  isBot?: boolean;
};

type ScriptOptions = {
  perType: number;
  dryRun: boolean;
  publisherId?: string;
};

type ConfigModule = typeof import("../../src/config");
type MongoModule = typeof import("../../src/db/mongo");
type PostgresModule = typeof import("../../src/db/postgres");
type MissionModelModule = typeof import("../../src/models/mission");
type PublisherRepositoryModule = typeof import("../../src/repositories/publisher");
type StatEventServiceModule = typeof import("../../src/services/stat-event");

let publisherIdsMap: ConfigModule["PUBLISHER_IDS"] | null = null;
let mongoReady: MongoModule["mongoConnected"] | null = null;
let prismaCore: PostgresModule["prismaCore"] | null = null;
let MissionModel: MissionModelModule["default"] | null = null;
let publisherRepository: PublisherRepositoryModule["publisherRepository"] | null = null;
let statEventService: StatEventServiceModule["statEventService"] | null = null;

const STAT_TYPES: StatEventType[] = ["click", "print", "apply", "account"];
const STATUS_ROTATION: StatEventStatus[] = ["PENDING", "VALIDATED", "CARRIED_OUT", "REFUSED"];

const SOURCE_VARIANTS: SourceVariant[] = [
  {
    source: "publisher",
    sourceName: "JVA portail",
    origin: "https://www.jeveuxaider.gouv.fr",
    referer: "https://www.jeveuxaider.gouv.fr/trouver-une-mission",
    host: "www.jeveuxaider.gouv.fr",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    tags: ["national"],
    device: "desktop",
  },
  {
    source: "widget",
    sourceName: "Widget diffuseur",
    origin: "https://widget.jeveuxaider.beta.gouv.fr",
    referer: "https://diffuseur.example.org/actions",
    host: "widget.jeveuxaider.beta.gouv.fr",
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7)",
    tags: ["widget"],
    device: "mobile",
  },
  {
    source: "api",
    sourceName: "API diffuseur",
    origin: "https://api.jeveuxaider.beta.gouv.fr",
    referer: "https://app.diffuseur.fr/mission/123",
    host: "api.jeveuxaider.beta.gouv.fr",
    userAgent: "curl/8.5.0",
    tags: ["api"],
    device: "server",
    isBot: true,
  },
  {
    source: "seo",
    sourceName: "Référencement",
    origin: "https://www.jeveuxaider.gouv.fr",
    referer: "https://www.google.com/search?q=je+veux+aider",
    host: "www.jeveuxaider.gouv.fr",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    tags: ["seo"],
    device: "desktop",
  },
];

type MissionFixture = {
  id: string;
  clientId: string;
  title: string;
  domain: string;
  postalCode: string;
  departmentName: string;
  organizationId?: string;
  organizationName?: string;
  organizationClientId?: string;
  tag?: string;
  tags: string[];
};

function getArgValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  return null;
}

function parseOptions(): ScriptOptions {
  const perTypeRaw = getArgValue("--per-type");
  const parsedPerType = perTypeRaw ? Number.parseInt(perTypeRaw, 10) : NaN;
  const perType = Number.isNaN(parsedPerType) ? 25 : Math.max(1, Math.min(parsedPerType, 500));
  const dryRun = process.argv.includes("--dry-run");
  const publisherId = getArgValue("--publisher-id") ?? undefined;
  return { perType, dryRun, publisherId };
}

async function ensureDependenciesLoaded() {
  if (publisherIdsMap) {
    return;
  }

  const [configModule, mongoModule, postgresModule, missionModule, publisherModule, statEventModule] = await Promise.all([
    import("../../src/config"),
    import("../../src/db/mongo"),
    import("../../src/db/postgres"),
    import("../../src/models/mission"),
    import("../../src/repositories/publisher"),
    import("../../src/services/stat-event"),
  ]);

  publisherIdsMap = configModule.PUBLISHER_IDS;
  mongoReady = mongoModule.mongoConnected;
  prismaCore = postgresModule.prismaCore;
  MissionModel = missionModule.default;
  publisherRepository = publisherModule.publisherRepository;
  statEventService = statEventModule.statEventService;
}

function getDefaultPublisherIds(): string[] {
  if (!publisherIdsMap) {
    return [];
  }
  return [publisherIdsMap.JEVEUXAIDER, publisherIdsMap.JAGIS_POUR_LA_NATURE].filter((id): id is string => Boolean(id));
}

function minusMonths(base: Date, months: number) {
  const clone = new Date(base);
  clone.setMonth(clone.getMonth() - months);
  return clone;
}

function randomDateBetween(from: Date, to: Date) {
  const fromMs = from.getTime();
  const toMs = to.getTime();
  const randomMs = fromMs + Math.random() * (toMs - fromMs);
  return new Date(randomMs);
}

function rotateValue<T>(values: T[], index: number): T {
  return values[index % values.length];
}

function buildStatEventRecords({
  perType,
  toPublisher,
  fromPublishers,
  missions,
  startDate,
  endDate,
}: {
  perType: number;
  toPublisher: PublisherInfo;
  fromPublishers: PublisherInfo[];
  missions: MissionFixture[];
  startDate: Date;
  endDate: Date;
}): StatEventRecord[] {
  const events: StatEventRecord[] = [];

  if (!missions.length) {
    throw new Error("Aucune mission disponible pour générer des StatEvents.");
  }

  STAT_TYPES.forEach((type, typeIndex) => {
    for (let i = 0; i < perType; i += 1) {
      const mission = rotateValue(missions, typeIndex + i);
      const sourceVariant = rotateValue(SOURCE_VARIANTS, typeIndex + i);
      const fromPublisher = rotateValue(fromPublishers, typeIndex + i);
      const createdAt = randomDateBetween(startDate, endDate);
      const status = rotateValue(STATUS_ROTATION, typeIndex + i);
      const isBot = Boolean(sourceVariant.isBot);
      const isHuman = !isBot;
      const tags = Array.from(new Set([...mission.tags, ...sourceVariant.tags]));

      const base: StatEventRecord = {
        _id: randomUUID(),
        type,
        createdAt,
        origin: sourceVariant.origin,
        referer: sourceVariant.referer,
        userAgent: sourceVariant.userAgent,
        host: sourceVariant.host,
        user: `${type}-user-${(i % 7) + 1}`,
        isBot,
        isHuman,
        source: sourceVariant.source,
        sourceId: `${mission.clientId}-${type}-${i + 1}`,
        sourceName: sourceVariant.sourceName,
        customAttributes: {
          channel: sourceVariant.sourceName,
          missionTopic: mission.domain,
          device: sourceVariant.device,
          batch: `${createdAt.getFullYear()}-${createdAt.getMonth() + 1}`,
        },
        status,
        fromPublisherId: fromPublisher.id,
        fromPublisherName: fromPublisher.name,
        toPublisherId: toPublisher.id,
        toPublisherName: toPublisher.name,
        missionId: mission.id,
        missionClientId: mission.clientId,
        missionDomain: mission.domain,
        missionTitle: mission.title,
        missionPostalCode: mission.postalCode,
        missionDepartmentName: mission.departmentName,
        missionOrganizationId: mission.organizationId,
        missionOrganizationName: mission.organizationName,
        missionOrganizationClientId: mission.organizationClientId,
        tag: mission.tag,
        tags,
        requestId: randomUUID(),
      };

      if (type === "click") {
        base.clickId = randomUUID();
        base.clickUser = base.user;
      }

      events.push(base);
    }
  });

  return events;
}

async function resolvePublishers(targetId: string): Promise<{ target: PublisherInfo; diffuseurs: PublisherInfo[] }> {
  if (!publisherRepository || !publisherIdsMap) {
    throw new Error("Dépendances publisherRepository/publisherIds non initialisées.");
  }

  const targetPublisher = await publisherRepository.findUnique({
    where: { id: targetId },
    select: { id: true, name: true },
  });

  if (!targetPublisher) {
    throw new Error(`Publisher ${targetId} introuvable en base.`);
  }

  const possibleDiffuseurs = [publisherIdsMap.LINKEDIN, publisherIdsMap.LEBONCOIN, publisherIdsMap.LETUDIANT]
    .filter((id): id is string => Boolean(id) && id !== targetId)
    .filter((value, index, array) => array.indexOf(value) === index);

  if (!possibleDiffuseurs.length) {
    return { target: targetPublisher, diffuseurs: [targetPublisher] };
  }

  const diffuseurPublishers = await publisherRepository.findMany({
    where: { id: { in: possibleDiffuseurs } },
    select: { id: true, name: true },
  });

  const diffuseurs = diffuseurPublishers.length ? diffuseurPublishers : [targetPublisher];

  return { target: targetPublisher, diffuseurs };
}

function fallbackString(value: string | null | undefined, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

async function fetchRandomMissions(publisherId: string, requestedCount: number): Promise<MissionFixture[]> {
  if (!MissionModel || !mongoReady) {
    throw new Error("MissionModel ou mongoConnected non initialisés.");
  }

  const sampleSize = Math.min(Math.max(requestedCount, 20), 300);
  await mongoReady;

  const missions = await MissionModel.aggregate<Mission>([
    {
      $match: {
        publisherId,
        deleted: { $ne: true },
        statusCode: "ACCEPTED",
      },
    },
    { $sample: { size: sampleSize } },
  ]);

  if (!missions.length) {
    throw new Error(`Aucune mission trouvée pour le publisher ${publisherId}.`);
  }

  return missions.map((mission) => {
    const id = mission._id ? ((mission._id as any).toString?.() ?? String(mission._id)) : randomUUID();
    const domain = fallbackString(mission.domain ?? mission.activity, "divers");
    const departmentName = fallbackString(mission.departmentName, "Inconnu");
    const organizationName = fallbackString(mission.organizationName, mission.publisherName);
    const tag = mission.tags?.[0];
    const tags = mission.tags?.length ? mission.tags : ([domain, departmentName].filter(Boolean) as string[]);

    return {
      id,
      clientId: mission.clientId ?? id,
      title: mission.title ?? `Mission ${id}`,
      domain,
      postalCode: fallbackString(mission.postalCode, "00000"),
      departmentName,
      organizationId: mission.organizationId ?? undefined,
      organizationName,
      organizationClientId: mission.organizationClientId ?? mission.organizationId ?? undefined,
      tag: tag ?? domain,
      tags,
    };
  });
}

async function processPublisher(publisherId: string, options: ScriptOptions, startDate: Date, now: Date) {
  if (!statEventService) {
    throw new Error("statEventService non initialisé.");
  }

  const { target, diffuseurs } = await resolvePublishers(publisherId);
  const missions = await fetchRandomMissions(publisherId, options.perType * STAT_TYPES.length);
  const events = buildStatEventRecords({
    perType: options.perType,
    toPublisher: target,
    fromPublishers: diffuseurs,
    missions,
    startDate,
    endDate: now,
  });

  console.log(
    `[fixtures:stat-events] Préparation de ${events.length} événements pour ${target.name} (${publisherId}) sur ${STAT_TYPES.length} types (per-type=${options.perType}).`
  );

  if (options.dryRun) {
    console.log("[fixtures:stat-events] Mode dry-run: aucun enregistrement ne sera créé.");
    console.log("[fixtures:stat-events] Exemple d'événement:", JSON.stringify(events[0], null, 2));
    return;
  }

  for (const event of events) {
    await statEventService.createStatEvent(event);
  }

  console.log(
    `[fixtures:stat-events] ${events.length} StatEvents créés pour ${target.name} entre ${startDate.toISOString()} et ${now.toISOString()}.`
  );
}

async function main() {
  const options = parseOptions();
  loadEnvironment({ dryRun: options.dryRun }, __dirname, "PopulateStatEventsFromMissions");
  await ensureDependenciesLoaded();

  const now = new Date();
  const startDate = minusMonths(now, 3);
  const defaultPublisherIds = getDefaultPublisherIds();
  const publisherIds = (options.publisherId ? [options.publisherId] : defaultPublisherIds).filter(
    (id, index, array): id is string => Boolean(id) && array.indexOf(id) === index
  );

  if (!publisherIds.length) {
    throw new Error("Aucun publisher cible configuré (utilisez --publisher-id ou mettez à jour vos .env).");
  }

  for (const publisherId of publisherIds) {
    await processPublisher(publisherId, options, startDate, now);
  }
}

main()
  .catch((error) => {
    console.error("[fixtures:stat-events] Erreur:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await prismaCore?.$disconnect();
    } catch (error) {
      console.error("[fixtures:stat-events] Erreur lors de la fermeture Prisma:", error);
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
