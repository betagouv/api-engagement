/**
 * Génère de faux user scorings pour tester le matching engine.
 *
 * Exécution :
 *   npx ts-node scripts/seed-fake-user-scoring.ts [--count N] [--with-geo] [--expires-in-hours N] [--dry-run]
 *
 * Options :
 *   --count N             Nombre de user scorings à créer (défaut : 10)
 *   --with-geo            Ajoute une géolocalisation fake à chaque user scoring
 *   --expires-in-hours N  Expiration en heures à partir de maintenant (défaut : 72)
 *   --dry-run             Log sans écrire en base
 */

import dotenv from "dotenv";
dotenv.config();

import { prisma } from "@/db/postgres";
import { TaxonomyType } from "@/db/core";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const withGeo = args.includes("--with-geo");
const countArgIndex = args.indexOf("--count");
const expiresInHoursArgIndex = args.indexOf("--expires-in-hours");

const count = countArgIndex !== -1 ? parseInt(args[countArgIndex + 1], 10) : 10;
const expiresInHours = expiresInHoursArgIndex !== -1 ? parseInt(args[expiresInHoursArgIndex + 1], 10) : 72;

type TaxonomyWithValues = {
  id: string;
  key: string;
  type: string;
  values: { id: string; key: string }[];
};

type FakeUserScoringValue = {
  taxonomyValueId: string;
  score: number;
};

const FAKE_FRANCE_GEO_POINTS = [
  { label: "Paris", lat: 48.8566, lon: 2.3522, radiusKm: 15 },
  { label: "Lyon", lat: 45.764, lon: 4.8357, radiusKm: 20 },
  { label: "Marseille", lat: 43.2965, lon: 5.3698, radiusKm: 25 },
  { label: "Lille", lat: 50.6292, lon: 3.0573, radiusKm: 20 },
  { label: "Bordeaux", lat: 44.8378, lon: -0.5792, radiusKm: 20 },
  { label: "Toulouse", lat: 43.6047, lon: 1.4442, radiusKm: 25 },
  { label: "Nantes", lat: 47.2184, lon: -1.5536, radiusKm: 20 },
  { label: "Strasbourg", lat: 48.5734, lon: 7.7521, radiusKm: 15 },
] as const;

const pickRandom = <T>(items: T[], countToPick: number): T[] => {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, countToPick);
};

const generateUserScoringValues = (taxonomies: TaxonomyWithValues[]): FakeUserScoringValue[] => {
  const values: FakeUserScoringValue[] = [];

  for (const taxonomy of taxonomies) {
    if (taxonomy.values.length === 0) {
      continue;
    }

    if (taxonomy.type === TaxonomyType.gate) {
      if (Math.random() < 0.25) {
        const picked = pickRandom(taxonomy.values, 1)[0];
        values.push({ taxonomyValueId: picked.id, score: 1 });
      }
      continue;
    }

    if (taxonomy.type === TaxonomyType.categorical || taxonomy.type === TaxonomyType.ordered) {
      const picked = pickRandom(taxonomy.values, 1)[0];
      values.push({ taxonomyValueId: picked.id, score: 1 });
      continue;
    }

    const selectionSize = Math.min(Math.max(1, Math.floor(Math.random() * 3) + 1), taxonomy.values.length);
    const pickedValues = pickRandom(taxonomy.values, selectionSize);

    for (const value of pickedValues) {
      values.push({ taxonomyValueId: value.id, score: 1 });
    }
  }

  if (values.length > 0) {
    return values;
  }

  const firstUsableTaxonomy = taxonomies.find((taxonomy) => taxonomy.type !== TaxonomyType.gate && taxonomy.values.length > 0);
  if (!firstUsableTaxonomy) {
    return [];
  }

  return [{ taxonomyValueId: firstUsableTaxonomy.values[0].id, score: 1 }];
};

const seed = async () => {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error(`'--count' doit être un entier strictement positif. Reçu: ${count}`);
  }

  if (!Number.isInteger(expiresInHours) || expiresInHours <= 0) {
    throw new Error(`'--expires-in-hours' doit être un entier strictement positif. Reçu: ${expiresInHours}`);
  }

  const taxonomies = await prisma.taxonomy.findMany({
    include: {
      values: {
        where: { active: true },
        select: { id: true, key: true },
      },
    },
    orderBy: { key: "asc" },
  });

  if (taxonomies.length === 0) {
    throw new Error("Aucune taxonomie trouvée. Lancer d'abord scripts/seed-taxonomy.ts.");
  }

  const usableTaxonomies = taxonomies.filter((taxonomy) => taxonomy.values.length > 0);
  if (usableTaxonomies.length === 0) {
    throw new Error("Aucune taxonomie active avec des valeurs n'a été trouvée.");
  }

  console.log(
    `[seed-fake-user-scoring] ${usableTaxonomies.length} taxonomies chargées, création de ${count} user scorings${withGeo ? " avec géoloc" : ""}`
  );

  const createdSummaries: Array<{
    id: string;
    valueCount: number;
    expiresAt: Date;
    geoLabel?: string;
  }> = [];

  for (let i = 0; i < count; i++) {
    const values = generateUserScoringValues(usableTaxonomies);
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    const geoPoint = withGeo ? pickRandom([...FAKE_FRANCE_GEO_POINTS], 1)[0] : null;

    if (isDryRun) {
      createdSummaries.push({
        id: `dry-run-${i + 1}`,
        valueCount: values.length,
        expiresAt,
        geoLabel: geoPoint?.label,
      });
      continue;
    }

    const createdUserScoring = await prisma.$transaction(async (tx) => {
      const userScoring = await tx.userScoring.create({
        data: {
          expiresAt,
        },
      });

      await tx.userScoringValue.createMany({
        data: values.map((value) => ({
          userScoringId: userScoring.id,
          taxonomyValueId: value.taxonomyValueId,
          score: value.score,
        })),
      });

      if (geoPoint) {
        await tx.userScoringGeo.create({
          data: {
            userScoringId: userScoring.id,
            lat: geoPoint.lat,
            lon: geoPoint.lon,
            radiusKm: geoPoint.radiusKm,
            countryCode: "FR",
          },
        });
      }

      return userScoring;
    });

    createdSummaries.push({
      id: createdUserScoring.id,
      valueCount: values.length,
      expiresAt,
      geoLabel: geoPoint?.label,
    });
  }

  for (const summary of createdSummaries) {
    console.log(
      `[seed-fake-user-scoring] ${isDryRun ? "[dry-run] " : ""}userScoringId=${summary.id} values=${summary.valueCount} expiresAt=${summary.expiresAt.toISOString()}${
        summary.geoLabel ? ` geo=${summary.geoLabel}` : ""
      }`
    );
  }

  console.log(
    `[seed-fake-user-scoring] ${isDryRun ? "Simulation terminée" : "Création terminée"} — ${createdSummaries.length} user scorings ${isDryRun ? "préparés" : "créés"}`
  );
};

const run = async () => {
  await prisma.$connect();
  console.log(
    `[seed-fake-user-scoring] Connecté à PostgreSQL — options: count=${count}, with-geo=${withGeo}, expires-in-hours=${expiresInHours}, dry-run=${isDryRun}`
  );

  try {
    await seed();
  } finally {
    await prisma.$disconnect();
  }
};

run().catch((error) => {
  console.error("[seed-fake-user-scoring] Fatal error:", error);
  process.exit(1);
});
