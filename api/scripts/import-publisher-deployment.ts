/**
 * Importe le chargé de déploiement (deploymentUserId) et le flag "tracking des candidatures déployé" (expectedApplications)
 * des publishers depuis deux CSV (annonceurs / diffuseurs). Dry-run par défaut.
 *
 * Usage (depuis api/) :
 *   npx ts-node scripts/import-publisher-deployment.ts --annonceurs <csv> --diffuseurs <csv> [--apply]
 */
import dotenv from "dotenv";
dotenv.config();

import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";

import { prisma } from "@/db/postgres";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};
const apply = process.argv.includes("--apply");
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

const read = (path: string) => parse(readFileSync(path, "utf8"), { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];

async function run() {
  const annonceursPath = arg("annonceurs");
  const diffuseursPath = arg("diffuseurs");
  if (!annonceursPath || !diffuseursPath) throw new Error("--annonceurs et --diffuseurs requis");

  const users = await prisma.user.findMany({ where: { deletedAt: null, role: "admin" }, select: { id: true, firstname: true, lastname: true } });
  const resolveUser = (raw: string) => {
    const n = norm(raw.split(",")[0]); // plusieurs chargés : on prend le premier
    if (!n) return null;
    // nom complet exact, sinon prénom seul (ex. "Clothilde") si unique
    const full = users.filter((u) => norm(`${u.firstname} ${u.lastname ?? ""}`) === n);
    if (full.length === 1) return full[0];
    const first = n.split(" ")[0];
    const byFirst = users.filter((u) => norm(u.firstname) === first);
    return byFirst.length === 1 ? byFirst[0] : null;
  };

  const plan = new Map<string, { name: string; chargeRaw?: string; tracking?: boolean }>();
  const conflicts: string[] = [];

  for (const [path, trackingCol] of [
    [annonceursPath, "Tracking des candidatures déployé"],
    [diffuseursPath, null],
  ] as const) {
    for (const row of read(path)) {
      const id = row["Identifiant"];
      const charge = row["Chargé de déploiement responsable"] ?? "";
      const tracking = trackingCol ? row[trackingCol] : "";
      if (!charge && !tracking) continue;
      const entry = plan.get(id) ?? { name: row["Nom"] };
      if (charge) {
        if (entry.chargeRaw && !norm(entry.chargeRaw).startsWith(norm(charge)) && !norm(charge).startsWith(norm(entry.chargeRaw))) conflicts.push(`${row["Nom"]}: "${entry.chargeRaw}" vs "${charge}"`);
        else entry.chargeRaw = charge;
      }
      if (tracking) entry.tracking = norm(tracking) === "oui";
      plan.set(id, entry);
    }
  }

  const publishers = await prisma.publisher.findMany({ where: { id: { in: [...plan.keys()] } }, select: { id: true, deploymentUserId: true, expectedApplications: true } });
  const byId = new Map(publishers.map((p) => [p.id, p]));

  const missing: string[] = [];
  const unresolved: string[] = [];
  let updates = 0;
  let unchanged = 0;

  for (const [id, e] of plan) {
    const pub = byId.get(id);
    if (!pub) {
      missing.push(`${e.name} (${id})`);
      continue;
    }
    const data: { deploymentUserId?: string; expectedApplications?: boolean } = {};
    if (e.chargeRaw) {
      const user = resolveUser(e.chargeRaw);
      if (!user) unresolved.push(`${e.name}: "${e.chargeRaw}"`);
      else if (user.id !== pub.deploymentUserId) data.deploymentUserId = user.id;
    }
    if (e.tracking !== undefined && e.tracking !== pub.expectedApplications) data.expectedApplications = e.tracking;
    if (!Object.keys(data).length) {
      unchanged++;
      continue;
    }
    updates++;
    if (apply) await prisma.publisher.update({ where: { id }, data });
  }

  console.log(`Mode: ${apply ? "APPLY" : "DRY-RUN"}`);
  console.log(`Utilisateurs admin: ${users.map((u) => `${u.firstname} ${u.lastname ?? ""}`.trim()).join(", ")}`);
  console.log(`Lignes avec données: ${plan.size} | à mettre à jour: ${updates} | déjà à jour: ${unchanged}`);
  console.log(`Publishers introuvables (${missing.length}):\n  ${missing.join("\n  ")}`);
  console.log(`Chargé non résolu (${unresolved.length}):\n  ${unresolved.join("\n  ")}`);
  console.log(`Conflits entre CSV (${conflicts.length}):\n  ${conflicts.join("\n  ")}`);
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
