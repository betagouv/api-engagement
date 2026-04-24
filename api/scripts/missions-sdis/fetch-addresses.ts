/**
 * Récupère les centres de secours français via l'API Overpass (OpenStreetMap),
 * puis valide et enrichit les adresses via l'API BAN (api-adresse.data.gouv.fr).
 * Seuls les points géolocalisés en France sont conservés.
 *
 * Usage :
 *   npx ts-node -r tsconfig-paths/register scripts/missions-sdis/fetch-addresses.ts
 *
 * Sortie : scripts/missions-sdis/addresses.csv
 */

import { createWriteStream } from "fs";
import { join } from "path";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const BAN_REVERSE_URL = "https://api-adresse.data.gouv.fr/reverse/csv/";

// Bounding boxes larges — le filtrage pays est délégué à la BAN
const QUERY = `[out:json][timeout:120];
(
  node["amenity"="fire_station"](41.0,-5.5,51.5,10.0);
  way["amenity"="fire_station"](41.0,-5.5,51.5,10.0);
  node["amenity"="fire_station"](-21.5,55.1,-20.7,55.9);
  node["amenity"="fire_station"](14.3,-61.3,14.9,-60.8);
  node["amenity"="fire_station"](2.0,-54.7,5.9,-51.6);
  node["amenity"="fire_station"](-13.1,44.9,-12.6,45.4);
);
out center tags;`;

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements: OverpassElement[];
};

type Station = {
  id: number;
  name: string;
  lat: number;
  lon: number;
};

type CsvRow = {
  dept: string;
  name: string;
  street: string;
  postalCode: string;
  city: string;
  lat: string;
  lon: string;
};

function deptFromPostalCode(postalCode: string): string | null {
  if (!postalCode || postalCode.length < 5) return null;

  if (postalCode.startsWith("971")) return "971";
  if (postalCode.startsWith("972")) return "972";
  if (postalCode.startsWith("973")) return "973";
  if (postalCode.startsWith("974")) return "974";
  if (postalCode.startsWith("976")) return "976";

  if (postalCode.startsWith("20")) {
    const num = parseInt(postalCode, 10);
    return num <= 20190 ? "2A" : "2B";
  }

  return postalCode.slice(0, 2).padStart(2, "0");
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsvLine(row: CsvRow): string {
  return [row.dept, row.name, row.street, row.postalCode, row.city, row.lat, row.lon].map(escapeCsv).join(",");
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Envoie un batch de stations à l'API BAN reverse et retourne les lignes CSV enrichies
async function reverseBatch(stations: Station[]): Promise<CsvRow[]> {
  const csvInput = ["id,latitude,longitude", ...stations.map((s) => `${s.id},${s.lat},${s.lon}`)].join("\n");

  const form = new FormData();
  form.append("data", new Blob([csvInput], { type: "text/csv" }), "points.csv");

  const res = await fetch(BAN_REVERSE_URL, { method: "POST", body: form });
  if (!res.ok) throw new Error(`BAN reverse error: HTTP ${res.status}`);

  const text = await res.text();
  const lines = text.trim().split("\n");
  const header = lines[0].split(",");

  const col = (name: string) => header.indexOf(name);
  const idIdx = col("id");
  const postcodeIdx = col("result_postcode");
  const cityIdx = col("result_city");
  const streetIdx = col("result_name");
  const statusIdx = col("result_status");

  const stationMap = new Map(stations.map((s) => [String(s.id), s]));
  const rows: CsvRow[] = [];

  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const status = cols[statusIdx] ?? "";
    if (status !== "ok") continue;

    const id = cols[idIdx];
    const postalCode = cols[postcodeIdx]?.trim() ?? "";
    const city = cols[cityIdx]?.trim() ?? "";
    const dept = deptFromPostalCode(postalCode);

    if (!dept || !postalCode || !city) continue;

    const station = stationMap.get(id);
    if (!station) continue;

    rows.push({
      dept,
      name: station.name,
      street: cols[streetIdx]?.trim() ?? "",
      postalCode,
      city,
      lat: station.lat.toFixed(6),
      lon: station.lon.toFixed(6),
    });
  }

  return rows;
}

async function run() {
  console.log("🌍  Requête Overpass en cours…");

  const url = `${OVERPASS_URL}?data=${encodeURIComponent(QUERY)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "api-engagement-bot/1.0 (https://api-engagement.beta.gouv.fr)",
    },
  });

  if (!response.ok) {
    console.error(`❌ Erreur Overpass HTTP ${response.status}`);
    process.exit(1);
  }

  const data = (await response.json()) as OverpassResponse;
  console.log(`📦  ${data.elements.length} éléments reçus depuis Overpass`);

  const stations: Station[] = [];
  for (const el of data.elements) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat === undefined || lon === undefined) continue;
    stations.push({ id: el.id, name: el.tags?.["name"]?.trim() ?? "", lat, lon });
  }

  console.log(`📍  ${stations.length} stations avec coordonnées → géocodage inverse BAN…`);

  const BATCH_SIZE = 500;
  const rows: CsvRow[] = [];

  for (let i = 0; i < stations.length; i += BATCH_SIZE) {
    const batch = stations.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const total = Math.ceil(stations.length / BATCH_SIZE);
    process.stdout.write(`   Batch ${batchNum}/${total}…`);
    const batchRows = await reverseBatch(batch);
    rows.push(...batchRows);
    process.stdout.write(` ${batchRows.length} adresses françaises\n`);
  }

  rows.sort((a, b) => a.dept.localeCompare(b.dept) || a.city.localeCompare(b.city));

  const outputPath = join(__dirname, "addresses.csv");
  const stream = createWriteStream(outputPath, { encoding: "utf-8" });
  stream.write("dept,name,street,postalCode,city,lat,lon\n");
  for (const row of rows) {
    stream.write(toCsvLine(row) + "\n");
  }
  stream.end();

  await new Promise((resolve) => stream.on("finish", resolve));

  console.log(`\n✅ ${rows.length} adresses françaises écrites dans ${outputPath}`);
  console.log(`⏭️  ${stations.length - rows.length} stations hors France ignorées`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
