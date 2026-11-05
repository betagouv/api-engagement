// Tous les pictogrammes DSFR, indexés comme l'enum `icon` du CMS : nom du fichier, tirets remplacés par des underscores
// (`digital/self-training.svg` → `self_training`). Une nouvelle version du DSFR les rend disponibles sans code ici.
const FILES = import.meta.glob<string>("../../../../node_modules/@gouvfr/dsfr/dist/artwork/pictograms/*/*.svg", { eager: true, query: "?url", import: "default" });

export const PICTOGRAMS: Record<string, string> = Object.fromEntries(
  Object.entries(FILES).map(([file, url]) => [file.split("/").pop()!.replace(".svg", "").replaceAll("-", "_"), url]),
);
