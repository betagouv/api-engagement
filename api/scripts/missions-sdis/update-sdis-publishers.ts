/**
 * Met à jour les publishers SDIS :
 *   - Upload du logo vers Scaleway (publishers/{id}/{filename})
 *   - Mise à jour du site web (champ `url`) depuis data.ts
 *   - Création de la clé API si absente
 *
 * À exécuter avant create-spv-missions.ts pour que chaque publisher
 * ait une API key valide avant la création des missions.
 *
 * Usage :
 *   npx ts-node -r tsconfig-paths/register scripts/missions-sdis/update-sdis-publishers.ts [--dry-run]
 *
 * Note : les variables Scaleway (SCW_ACCESS_KEY, SCW_SECRET_KEY, SCW_HOST,
 * BUCKET_NAME, REGION) doivent être présentes dans .env sauf en mode --dry-run.
 */

import dotenv from "dotenv";

dotenv.config();

import { randomUUID } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { prisma } from "@/db/postgres";
import { SDIS_DATA } from "./data";
import { findPublisherForDept } from "./publisher";

// Correspondance dept → fichier logo dans ./logos/
// Dérivé de la colonne "Logo" du CSV de déploiement.
// Note : dept 46 référence SDIS_47.jpg (erreur de nommage dans le CSV d'origine).
const LOGO_FILES: Record<string, string> = {
  "01": "SDIS_01.jpg",
  "02": "SDIS_02.png",
  "03": "SDIS_03.svg",
  "04": "SDIS_04.jpg",
  "05": "SDIS_05.jpg",
  "06": "SDIS_06.png",
  "07": "SDIS_07.png",
  "08": "SDIS_08.svg",
  "09": "SDIS_09.jpeg",
  "10": "SDIS_10.jpg",
  "11": "SDIS_11.png",
  "12": "SDIS_12.png",
  "13": "SDIS_13.webp",
  "14": "SDIS_14.png",
  "16": "SDIS_16.png",
  "17": "SDIS_17.png",
  "18": "SDIS_18.png",
  "19": "SDIS_19.png",
  "2A": "SDIS_20_SIS2A.png",
  "2B": "SDIS_20_SIS2B.jpg",
  "21": "SDIS_21.png",
  "22": "SDIS_22.png",
  "23": "SDIS_23.png",
  "24": "SDIS_24.png",
  "25": "SDIS_25.webp",
  "26": "SDIS_26.png",
  "27": "SDIS_27.jpg",
  "28": "SDIS_28.png",
  "29": "SDIS_29.jpeg",
  "30": "SDIS_30.jpg",
  "31": "SDIS_31.jpg",
  "32": "SDIS_32.png",
  "33": "SDIS_33.webp",
  "34": "SDIS_34.png",
  "35": "SDIS_35.svg",
  "36": "SDIS_36.png",
  "37": "SDIS_37.jpg",
  "38": "SDIS_38.jpeg",
  "39": "SDIS_39.jpg",
  "40": "SDIS_40.png",
  "41": "SDIS_41.jpg",
  "42": "SDIS_42.svg",
  "43": "SDIS_43.png",
  "44": "SDIS_44.png",
  "45": "SDIS_45.png",
  "46": "SDIS_47.jpg",
  "47": "SDIS_47.png",
  "48": "SDIS_48.jpg",
  "49": "SDIS_49.png",
  "50": "SDIS_50.jpg",
  "51": "SDIS_51.png",
  "52": "SDIS_52.png",
  "53": "SDIS_53.png",
  "54": "SDIS_54.png",
  "55": "SDIS_55.png",
  "57": "SDIS_57.png",
  "58": "SDIS_58.png",
  "59": "SDIS_59.svg",
  "60": "SDIS_60.png",
  "61": "SDIS_61.png",
  "62": "SDIS_62.jpg",
  "63": "SDIS_63.jpeg",
  "64": "SDIS_64.jpg",
  "65": "SDIS_65.png",
  "66": "SDIS_66.png",
  "67": "SDIS_67.jpg",
  "68": "SDIS_68.png",
  "69": "SDIS_69.png",
  "70": "SDIS_70.jpeg",
  "71": "SDIS_71.png",
  "72": "SDIS_72.jpeg",
  "73": "SDIS_73.png",
  "74": "SDIS_74.jpg",
  "76": "SDIS_76.jpg",
  "77": "SDIS_77.jpeg",
  "78": "SDIS_78.png",
  "79": "SDIS_79.png",
  "80": "sdis_80.jpeg",
  "81": "SDIS_81.png",
  "82": "SDIS_82.webp",
  "83": "SDIS_83.png",
  "84": "SDIS_84.jpg",
  "85": "SDIS_85.png",
  "86": "SDIS_86.png",
  "87": "SDIS_87.jpg",
  "88": "SDIS_88.png",
  "89": "SDIS_89.jpg",
  "91": "SDIS_91.png",
  "95": "SDIS_95.jpg",
  "971": "SDIS_971.png",
  "972": "SDIS_972.png",
  "973": "SDIS_973.jpg",
  "974": "SDIS_974.jpg",
  "976": "SDIS_976.jpeg",
};

function mimeType(filename: string): string {
  const ext = (filename.split(".").pop() ?? "").toLowerCase();
  const types: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    svg: "image/svg+xml",
    webp: "image/webp",
  };
  return types[ext] ?? "application/octet-stream";
}

async function run() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(`\n🔧  Mise à jour des publishers SDIS${isDryRun ? " [DRY RUN]" : ""}\n`);

  // Import dynamique de s3 pour éviter l'erreur au chargement du module
  // si les variables Scaleway sont absentes (ex. dry-run sans .env complet).
  const s3 = isDryRun ? null : await import("@/services/s3");

  const publishers = await prisma.publisher.findMany({
    where: { isAnnonceur: true, deletedAt: null },
    select: { id: true, name: true, apikey: true },
  });
  console.log(`📋  ${publishers.length} publishers annonceurs trouvés en DB\n`);

  const stats = { updated: 0, skipped: 0, apiKeyCreated: 0, errors: 0 };

  for (const entry of SDIS_DATA) {
    const publisher = findPublisherForDept(publishers, entry.dept);
    if (!publisher) {
      console.warn(`⚠️  [${entry.dept}] Publisher introuvable pour "${entry.organizationName}" — skippé`);
      stats.skipped++;
      continue;
    }

    const logoFilename = LOGO_FILES[entry.dept];
    const logoPath = logoFilename ? join(__dirname, "logos", logoFilename) : null;
    const logoExists = logoPath ? existsSync(logoPath) : false;

    console.log(`🔄 [${entry.dept}] ${publisher.name}`);

    if (isDryRun) {
      console.log(`   url     : ${entry.organizationUrl}`);
      console.log(`   logo    : ${logoFilename ?? "aucun"} ${logoExists ? "✓" : "✗ FICHIER MANQUANT"}`);
      console.log(`   apikey  : ${publisher.apikey ? "présente" : "à créer"}`);
      stats.updated++;
      continue;
    }

    try {
      const data: Record<string, unknown> = { url: entry.organizationUrl };

      if (logoExists && logoFilename && s3) {
        const fileBuffer = readFileSync(logoPath!);
        const objectName = `publishers/${publisher.id}/${logoFilename}`;
        const response = await s3.putObject(objectName, fileBuffer, {
          ACL: s3.OBJECT_ACL.PUBLIC_READ,
          ContentType: mimeType(logoFilename),
        });
        data.logo = response.Location ?? `${s3.BUCKET_URL}/${objectName}`;
        console.log(`   🖼️  Logo uploadé : ${data.logo}`);
      } else if (!logoExists) {
        console.warn(`   ⚠️  Fichier logo introuvable : ${logoFilename ?? "non défini"}`);
      }

      await prisma.publisher.update({ where: { id: publisher.id }, data });

      if (!publisher.apikey) {
        const newApikey = randomUUID();
        await prisma.publisher.update({ where: { id: publisher.id }, data: { apikey: newApikey } });
        stats.apiKeyCreated++;
        console.log(`   🔑 API key créée`);
      }

      console.log(`   ✅ OK`);
      stats.updated++;
    } catch (err) {
      console.error(`   ❌ Erreur :`, err);
      stats.errors++;
    }
  }

  console.log("\n──────────────────────────────────────────");
  console.log(`✅ Mis à jour    : ${stats.updated}`);
  console.log(`🔑 API keys créées : ${stats.apiKeyCreated}`);
  console.log(`⏭️  Skippés      : ${stats.skipped}`);
  console.log(`❌ Erreurs       : ${stats.errors}`);
  console.log("──────────────────────────────────────────\n");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
