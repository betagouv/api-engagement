export type DocumentConfig = {
  path: string;
  title: string;
  objective: string;
  // Globs optionnels (préfixe `.../**` ou chemin exact) délimitant la surface de code du chapitre.
  // Union avec les citations : capte les fichiers neufs/renommés que les citations ne voient pas.
  scope?: string[];
  // Consignes de profondeur spécifiques au chapitre, ajoutées à l'invite (ex. détailler une formule).
  instructions?: string;
};

export type SourcesConfig = {
  version: number;
  include: string[];
  exclude: string[];
};

export type CollectedDocument = DocumentConfig & {
  citations: string[];
  files: string[];
};

export type GenerationResult = {
  changedDocuments: string[];
  changedSources: string[];
  sourceCommit: string;
};
