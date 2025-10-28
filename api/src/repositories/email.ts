import { Email, Prisma } from "../db/core";
import { prismaCore } from "../db/postgres";
import type { EmailRecord } from "../types/email";

const toEmailRecord = (e: Email): EmailRecord => ({
  id: e.id,
  messageId: e.messageId,
  inReplyTo: e.inReplyTo,
  fromName: e.fromName,
  fromEmail: e.fromEmail,
  to: e.to as any,
  toEmails: e.toEmails,
  subject: e.subject,
  sentAt: e.sentAt,
  rawTextBody: e.rawTextBody,
  rawHtmlBody: e.rawHtmlBody,
  mdTextBody: e.mdTextBody,
  attachments: e.attachments as any,
  raw: e.raw as any,
  status: e.status,
  reportUrl: e.reportUrl,
  fileObjectName: e.fileObjectName,
  dateFrom: e.dateFrom,
  dateTo: e.dateTo,
  createdCount: e.createdCount,
  failed: e.failed as any,
  deletedAt: e.deletedAt,
  createdAt: e.createdAt,
  updatedAt: e.updatedAt,
});

export const emailRepository = {
  async find(params: Prisma.EmailFindManyArgs = {}): Promise<EmailRecord[]> {
    const rows = await prismaCore.email.findMany(params);
    return rows.map(toEmailRecord);
  },

  async findById(id: string): Promise<EmailRecord | null> {
    const row = await prismaCore.email.findUnique({ where: { id } });
    return row ? toEmailRecord(row) : null;
  },

  async create(data: Prisma.EmailCreateInput): Promise<EmailRecord> {
    const row = await prismaCore.email.create({
      data,
    });
    return toEmailRecord(row);
  },

  async update(id: string, patch: Prisma.EmailUpdateInput): Promise<EmailRecord> {
    const row = await prismaCore.email.update({ where: { id }, data: patch });
    return toEmailRecord(row);
  },
};
