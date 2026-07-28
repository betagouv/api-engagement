import dotenv from "dotenv";
dotenv.config();

import { writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Script one-shot : génère le snapshot statique du référentiel des macro-compétences
 * ROME 4.0 (`api/src/constants/rome-macro-competences.ts`) depuis l'API France Travail.
 *
 * Prérequis : un compte francetravail.io avec l'API "ROME 4.0 - Compétences" souscrite,
 * puis les credentials OAuth2 client_credentials fournis via l'environnement :
 *   FT_CLIENT_ID, FT_CLIENT_SECRET
 *
 * Les URLs et le scope sont surchargeables par env (valeurs par défaut = convention
 * France Travail ; à confirmer contre la doc du produit) :
 *   FT_TOKEN_URL   (défaut: endpoint OAuth2 partenaire)
 *   FT_ROME_BASE_URL, FT_ROME_MACRO_PATH, FT_ROME_SCOPE
 *
 * Exécution : `cd api && npx ts-node scripts/generate-rome-macro-competences.ts`
 * (ajouter `--dry-run` pour n'afficher que le nombre d'entrées, sans écrire le fichier).
 *
 * Réf. doc : https://francetravail.io/produits-partages/catalogue/rome-4-0-competences
 */

const DRY_RUN = process.argv.includes("--dry-run");

const CLIENT_ID = process.env.FT_CLIENT_ID;
const CLIENT_SECRET = process.env.FT_CLIENT_SECRET;
const TOKEN_URL = process.env.FT_TOKEN_URL || "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire";
const ROME_BASE_URL = process.env.FT_ROME_BASE_URL || "https://api.francetravail.io/partenaire/rome-competences/v1";
const ROME_MACRO_PATH = process.env.FT_ROME_MACRO_PATH || "/competences/macro-competence";
const ROME_SCOPE = process.env.FT_ROME_SCOPE || "api_rome-competencesv1 nomenclatureRome";

const OUTPUT_PATH = join(__dirname, "..", "src", "constants", "rome-macro-competences.ts");

type MacroCompetence = { code: string; libelle: string };

const readErrorBody = async (response: Response): Promise<string> => {
  const text = await response.text();
  return text.length > 500 ? `${text.slice(0, 500)}…[tronqué]` : text;
};

const getAccessToken = async (): Promise<string> => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("FT_CLIENT_ID / FT_CLIENT_SECRET manquants dans l'environnement");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: ROME_SCOPE,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(
      `OAuth token failed: ${response.status} ${response.statusText || "(no status text)"} (response body redacted)`
    );
  }

  const json = (await response.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error("OAuth token response is missing access_token");
  }
  return json.access_token;
};

const fetchMacroCompetences = async (token: string): Promise<MacroCompetence[]> => {
  const response = await fetch(`${ROME_BASE_URL}${ROME_MACRO_PATH}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Macro-competences fetch failed: ${response.status} ${await readErrorBody(response)}`);
  }

  const json = (await response.json()) as Array<Record<string, unknown>>;
  return json
    .map((item) => ({
      code: String(item.code ?? item.id ?? ""),
      libelle: String(item.libelle ?? item.label ?? ""),
    }))
    .filter((item) => item.code && item.libelle);
};

const renderFile = (entries: MacroCompetence[]): string => {
  const sorted = [...entries].sort((a, b) => a.code.localeCompare(b.code));
  const lines = sorted.map((entry) => `  ${JSON.stringify(entry.code)}: ${JSON.stringify(entry.libelle)},`);
  const generatedAt = new Date().toISOString().slice(0, 10);
  return `/**
 * Référentiel des macro-compétences ROME 4.0 : code → libellé.
 *
 * Fichier GÉNÉRÉ par \`api/scripts/generate-rome-macro-competences.ts\` (snapshot du
 * référentiel France Travail). Ne pas éditer à la main : relancer le script pour
 * rafraîchir (le référentiel ROME 4.0 est stable).
 *
 * Dernière mise à jour : ${generatedAt} (${sorted.length} macro-compétences).
 */
export const ROME_MACRO_COMPETENCES: Record<string, string> = {
${lines.join("\n")}
};
`;
};

const run = async () => {
  const token = await getAccessToken();
  const entries = await fetchMacroCompetences(token);
  console.log(`[RomeMacroCompetences] ${entries.length} macro-compétences récupérées`);

  if (!entries.length) {
    throw new Error("Aucune macro-compétence récupérée : abandon (le fichier n'est pas écrasé)");
  }

  if (DRY_RUN) {
    console.log("[RomeMacroCompetences] Dry run : le fichier n'est pas écrit");
    return;
  }

  writeFileSync(OUTPUT_PATH, renderFile(entries), "utf8");
  console.log(`[RomeMacroCompetences] Écrit dans ${OUTPUT_PATH}`);
};

run()
  .then(() => {
    console.log("[RomeMacroCompetences] Terminé");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[RomeMacroCompetences] Échec", error);
    process.exit(1);
  });
