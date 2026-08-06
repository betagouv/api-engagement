export type DocumentConfig = {
  path: string;
  title: string;
  objective: string;
  sources: string[];
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
