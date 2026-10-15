/**
 * Backfill des customAttributes des stat_event "apply" du SDIS 91 (formulaire Forminator SPV).
 * Appariement par horodatage : chaque apply est associé aux lignes du CSV (heure à la minute)
 * du publisher dont createdAt tombe dans [T - 30s, T + 120s[. En cas de plusieurs lignes pour un même apply
 * (double candidature), la plus complète est retenue. Pays absent = "France".
 * Les apply qui ont déjà des customAttributes ne sont jamais modifiés.
 *
 * Usage (depuis api/):
 *   npx ts-node scripts/backfill-sdis91-apply-custom-attributes.ts --file ~/Downloads/forminator.csv --publisher-id 68594dcdc9c116c1b5502d57
 *
 * Options:
 *   --file <chemin>        Export CSV Forminator (séparateur ";") (obligatoire)
 *   --publisher-id <id>    Publisher annonceur (to_publisher_id) (obligatoire)
 *   --timezone <tz>        Fuseau de l'horodatage du CSV (défaut: Europe/Paris)
 *   --execute              Écrit en base (sinon dry-run)
 */
import dotenv from "dotenv";
dotenv.config();

import fs from "node:fs";

import { pgConnected, prisma } from "@/db/postgres";

const MONTHS: Record<string, number> = { jan: 0, fév: 1, mar: 2, avr: 3, mai: 4, juin: 5, juil: 6, août: 7, sep: 8, oct: 9, nov: 10, déc: 11 };
const WINDOW_BEFORE_MS = 30_000;
const WINDOW_AFTER_MS = 120_000;

const flag = (name: string) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};
const FILE = flag("--file");
const PUBLISHER_ID = flag("--publisher-id");
const TIMEZONE = flag("--timezone") ?? "Europe/Paris";
const EXECUTE = process.argv.includes("--execute");

// Décalage (ms) du fuseau à un instant donné
const tzOffsetMs = (utcMs: number) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    })
      .formatToParts(new Date(utcMs))
      .map((x) => [x.type, Number(x.value)])
  );
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - utcMs;
};

// "Oct 13, 2026 @ 6:43 PM" (heure locale du fuseau) -> Date UTC
const parseSubmission = (raw: string): Date | null => {
  const m = raw.trim().match(/^(\S+) (\d+), (\d{4}) @ (\d+):(\d+) (AM|PM)$/);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (month === undefined) return null;
  const hour = (Number(m[4]) % 12) + (m[6] === "PM" ? 12 : 0);
  const asUtc = Date.UTC(Number(m[3]), month, Number(m[2]), hour, Number(m[5]));
  return new Date(asUtc - tzOffsetMs(asUtc - tzOffsetMs(asUtc)));
};

type Row = { formId: string; at: Date; completeness: number; attributes: Record<string, string | number> };

const parseCsv = (path: string): { rows: Row[]; invalid: number } => {
  const lines = fs.readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean).slice(1);
  const rows: Row[] = [];
  let invalid = 0;
  for (const line of lines) {
    const [formId, submittedAt, gender, age, , postalCode, country] = line.split(";");
    const at = parseSubmission(submittedAt ?? "");
    if (!at) {
      invalid++;
      continue;
    }
    // Même forme que le tag côté site (formulaire corrigé le 13/10)
    const attributes: Record<string, string | number> = {};
    const parsedAge = Number.parseInt(age, 10);
    if (!Number.isNaN(parsedAge)) attributes.candidateAge = parsedAge;
    if (postalCode) attributes.candidatePostalCode = postalCode;
    if (gender) attributes.candidateGender = gender;
    if (Object.keys(attributes).length)
      rows.push({ formId, at, attributes: { ...attributes, candidateCountry: country || "France" }, completeness: Object.keys(attributes).length + (country ? 1 : 0) });
    else invalid++;
  }
  return { rows, invalid };
};

const isEmpty = (v: unknown) => v == null || (typeof v === "object" && Object.keys(v as object).length === 0);

const run = async () => {
  if (!FILE || !PUBLISHER_ID) throw new Error("--file et --publisher-id sont obligatoires.");
  console.log(`[Sdis91Backfill] Mode: ${EXECUTE ? "EXECUTE" : "dry-run"} | tz: ${TIMEZONE}`);

  const { rows, invalid } = parseCsv(FILE);
  const from = new Date(Math.min(...rows.map((r) => r.at.getTime())) - WINDOW_BEFORE_MS);
  const to = new Date(Math.max(...rows.map((r) => r.at.getTime())) + WINDOW_AFTER_MS);

  await pgConnected();
  const events = (
    await prisma.statEvent.findMany({
      where: { type: "apply", toPublisherId: PUBLISHER_ID, createdAt: { gte: from, lt: to } },
      select: { id: true, createdAt: true, customAttributes: true },
    })
  ).filter((e) => isEmpty(e.customAttributes));

  const inWindow = (r: Row, createdAt: Date) => {
    const d = createdAt.getTime() - r.at.getTime();
    return d >= -WINDOW_BEFORE_MS && d < WINDOW_AFTER_MS;
  };

  let updated = 0;
  let noRow = 0;
  let doubles = 0;
  for (const event of events) {
    const matching = rows.filter((r) => inWindow(r, event.createdAt));
    if (!matching.length) {
      noRow++; // apply absent du CSV (autre formulaire / hors export)
      continue;
    }
    // Double candidature : on garde la ligne la plus complète (à égalité, la plus récente)
    const row = matching.reduce((best, r) => (r.completeness > best.completeness || (r.completeness === best.completeness && r.at > best.at) ? r : best));
    if (matching.length > 1) {
      doubles++;
      console.log(`[Sdis91Backfill] DOUBLE event=${event.id} rows=${matching.map((r) => r.formId)} -> retenue=${row.formId}`);
    }
    console.log(
      `[Sdis91Backfill] ${EXECUTE ? "UPDATE" : "DRY"} form=${row.formId} event=${event.id} createdAt=${event.createdAt.toISOString()} keys=${Object.keys(row.attributes)}`
    );
    if (EXECUTE) await prisma.statEvent.update({ where: { id: event.id }, data: { customAttributes: row.attributes } });
    updated++;
  }

  console.log("\n[Sdis91Backfill] Résumé");
  console.log(`- Lignes CSV exploitables: ${rows.length} (ignorées/invalides: ${invalid})`);
  console.log(`- Apply sans attributs dans la plage: ${events.length}`);
  console.log(`- Appariées ${EXECUTE ? "et mises à jour" : "(dry-run)"}: ${updated}`);
  console.log(`- Dont doubles candidatures (ligne la plus complète retenue): ${doubles}`);
  console.log(`- Apply sans ligne CSV: ${noRow}`);
};

run()
  .then(() => prisma.$disconnect().then(() => process.exit(0)))
  .catch(async (error) => {
    console.error("[Sdis91Backfill] Erreur:", error);
    await prisma.$disconnect().catch(() => undefined);
    process.exit(1);
  });
