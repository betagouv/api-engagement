import dotenv from "dotenv";
dotenv.config();

import { Client } from "pg";

type BackfillTarget = {
  tableName: "mission_enrichment_value" | "mission_scoring_value" | "user_scoring_value";
  legacyColumn: "taxonomy_value_id";
};

type CountRow = { count: bigint | number };
type ColumnRow = { column_name: string };

const TARGETS: BackfillTarget[] = [
  { tableName: "mission_enrichment_value", legacyColumn: "taxonomy_value_id" },
  { tableName: "mission_scoring_value", legacyColumn: "taxonomy_value_id" },
  { tableName: "user_scoring_value", legacyColumn: "taxonomy_value_id" },
];

const shouldWrite = process.argv.includes("--write");
const client = new Client({
  connectionString: process.env.DATABASE_URL_CORE,
});

const toCount = (value: bigint | number): number => Number(value);

const assertColumnsExist = async (target: BackfillTarget): Promise<void> => {
  const result = await client.query<ColumnRow>(`
    SELECT "column_name"
    FROM "information_schema"."columns"
    WHERE "table_schema" = 'public'
      AND "table_name" = '${target.tableName}'
      AND "column_name" IN ('taxonomy_key', 'value_key', '${target.legacyColumn}')
  `);

  const availableColumns = new Set(result.rows.map((row) => row.column_name));
  const requiredColumns = ["taxonomy_key", "value_key", target.legacyColumn];

  for (const column of requiredColumns) {
    if (!availableColumns.has(column)) {
      throw new Error(
        `[backfill-taxonomy-keys] colonne '${column}' absente sur '${target.tableName}'. Applique d'abord la migration additive.`
      );
    }
  }
};

const countRowsMissingNewKeys = async (target: BackfillTarget): Promise<number> => {
  const result = await client.query<CountRow>(`
    SELECT COUNT(*)::bigint AS "count"
    FROM "${target.tableName}" target
    WHERE target."${target.legacyColumn}" IS NOT NULL
      AND (target."taxonomy_key" IS NULL OR target."value_key" IS NULL)
  `);

  return toCount(result.rows[0]?.count ?? 0);
};

const countRowsMissingLegacyIds = async (target: BackfillTarget): Promise<number> => {
  const result = await client.query<CountRow>(`
    SELECT COUNT(*)::bigint AS "count"
    FROM "${target.tableName}" target
    WHERE target."${target.legacyColumn}" IS NULL
      AND target."taxonomy_key" IS NOT NULL
      AND target."value_key" IS NOT NULL
  `);

  return toCount(result.rows[0]?.count ?? 0);
};

const backfillNewKeysFromLegacyIds = async (target: BackfillTarget): Promise<number> => {
  const result = await client.query<CountRow>(`
    WITH updated AS (
      UPDATE "${target.tableName}" AS target
      SET
        "taxonomy_key" = taxonomy."key"::text,
        "value_key" = taxonomy_value."key"
      FROM "taxonomy_value" AS taxonomy_value
      JOIN "taxonomy" AS taxonomy
        ON taxonomy."id" = taxonomy_value."taxonomy_id"
      WHERE taxonomy_value."id" = target."${target.legacyColumn}"
        AND (target."taxonomy_key" IS NULL OR target."value_key" IS NULL)
      RETURNING 1
    )
    SELECT COUNT(*)::bigint AS "count" FROM updated
  `);

  return toCount(result.rows[0]?.count ?? 0);
};

const backfillLegacyIdsFromNewKeys = async (target: BackfillTarget): Promise<number> => {
  const result = await client.query<CountRow>(`
    WITH updated AS (
      UPDATE "${target.tableName}" AS target
      SET "${target.legacyColumn}" = taxonomy_value."id"
      FROM "taxonomy_value" AS taxonomy_value
      JOIN "taxonomy" AS taxonomy
        ON taxonomy."id" = taxonomy_value."taxonomy_id"
      WHERE target."${target.legacyColumn}" IS NULL
        AND target."taxonomy_key" IS NOT NULL
        AND target."value_key" IS NOT NULL
        AND taxonomy."key"::text = target."taxonomy_key"
        AND taxonomy_value."key" = target."value_key"
        AND taxonomy_value."taxonomy_id" = taxonomy."id"
      RETURNING 1
    )
    SELECT COUNT(*)::bigint AS "count" FROM updated
  `);

  return toCount(result.rows[0]?.count ?? 0);
};

const run = async () => {
  await client.connect();

  try {
    console.log(`[backfill-taxonomy-keys] mode=${shouldWrite ? "write" : "dry-run"}`);

    for (const target of TARGETS) {
      await assertColumnsExist(target);

      const missingNewKeys = await countRowsMissingNewKeys(target);
      const missingLegacyIds = await countRowsMissingLegacyIds(target);

      console.log(
        `[backfill-taxonomy-keys] ${target.tableName}: missing_new_keys=${missingNewKeys} missing_legacy_ids=${missingLegacyIds}`
      );

      if (!shouldWrite) {
        continue;
      }

      await client.query("BEGIN");

      let filledNewKeys = 0;
      let filledLegacyIds = 0;

      try {
        filledNewKeys = await backfillNewKeysFromLegacyIds(target);
        filledLegacyIds = await backfillLegacyIdsFromNewKeys(target);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }

      console.log(
        `[backfill-taxonomy-keys] ${target.tableName}: updated_new_keys=${filledNewKeys} updated_legacy_ids=${filledLegacyIds}`
      );
    }
  } finally {
    await client.end();
  }
};

run().catch(async (error) => {
  console.error("[backfill-taxonomy-keys] Fatal error:", error);
  await client.end().catch(() => undefined);
  process.exit(1);
});
