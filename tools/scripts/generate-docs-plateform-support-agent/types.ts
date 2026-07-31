export type DocumentConfig = {
  path: string;
  title: string;
  objective: string;
  sources: string[];
};

export type SourcesConfig = {
  version: number;
  exclude: string[];
  documents: DocumentConfig[];
};

export type CollectedDocument = DocumentConfig & {
  files: string[];
};

export type GenerationResult = {
  changedDocuments: string[];
  changedSources: string[];
  sourceCommit: string;
};
