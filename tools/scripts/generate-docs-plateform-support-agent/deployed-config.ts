import fs from "node:fs";

// Clés fonctionnelles pertinentes pour la documentation (versions actives, activation de features).
// On ignore volontairement l'infrastructure (hostnames, IP, CPU/mémoire, buckets…).
const FUNCTIONAL_KEY = /(_version$|^enable_)/;

// Extrait de production.tfvars les valeurs déployées qui font autorité sur les défauts du code
// (ex. matching_engine_version = "m4", mission_enrichment_prompt_version = "v5", enable_*).
// Retourne un bloc Markdown à injecter dans les invites, ou une chaîne vide si le fichier manque.
export const loadDeployedConfig = (tfvarsPath: string): string => {
  if (!fs.existsSync(tfvarsPath)) return "";
  const entries: string[] = [];
  for (const line of fs.readFileSync(tfvarsPath, "utf8").split("\n")) {
    // Ancré en début de ligne : ignore les attributs imbriqués (ex. typesense_version dans un bloc).
    const match = line.match(/^([a-z0-9_]+)\s*=\s*"?([^"#]+?)"?\s*(?:#.*)?$/i);
    if (match && FUNCTIONAL_KEY.test(match[1])) entries.push(`- ${match[1]} = ${match[2].trim()}`);
  }
  return entries.join("\n");
};
