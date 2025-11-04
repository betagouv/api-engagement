type Json = any;

export type EmailStatus = "PENDING" | "PROCESSED" | "DUPLICATE" | "FAILED";

export interface EmailRecord {
  id: string;
  messageId: string | null;
  inReplyTo: string | null;
  fromName: string | null;
  fromEmail: string | null;
  to: Json | null;
  toEmails: string[];
  subject: string | null;
  sentAt: Date | null;
  rawTextBody: string | null;
  rawHtmlBody: string | null;
  mdTextBody: string | null;
  attachments: Json | null;
  raw: Json | null;
  status: EmailStatus;
  reportUrl: string | null;
  fileObjectName: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  createdCount: number | null;
  failed: Json | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailFindParams {
  status?: EmailStatus;
  toEmail?: string;
  dateFrom?: Date;
  dateTo?: Date;
  includeDeleted?: boolean;
}

export type EmailCreateInput = {
  messageId?: string | null;
  inReplyTo?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  to?: Json | null;
  subject?: string | null;
  sentAt?: Date | null;
  rawTextBody?: string | null;
  rawHtmlBody?: string | null;
  mdTextBody?: string | null;
  attachments?: Json | null;
  raw?: Json | null;
  status?: EmailStatus;
  reportUrl?: string | null;
  fileObjectName?: string | null;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  createdCount?: number | null;
  failed?: Json | null;
};

export type EmailUpdatePatch = Partial<EmailCreateInput> & {
  deletedAt?: Date | null;
};
