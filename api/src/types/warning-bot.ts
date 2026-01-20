export interface WarningBotRecord {
  id: string;
  hash: string;
  userAgent: string;
  printCount: number;
  clickCount: number;
  applyCount: number;
  accountCount: number;
  publisherId: string;
  publisherName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type WarningBotCreateInput = {
  hash: string;
  userAgent: string;
  printCount?: number;
  clickCount?: number;
  applyCount?: number;
  accountCount?: number;
  publisherId: string;
};

export type WarningBotUpdatePatch = Partial<WarningBotCreateInput>;
