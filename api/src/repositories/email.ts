// src/repos/email.repo.ts
import { prismaCore } from "../db/postgres";

import type { EmailCreateInput, EmailFindParams, EmailRecord, EmailUpdatePatch } from "../types/email";

export const emailRepository = {
  async find(params: EmailFindParams = {}): Promise<EmailRecord[]> {
    return prismaCore.email.findMany({
      where: {
        status: params.status,
        ...(params.toEmail ? { toEmails: { has: params.toEmail } } : {}),
        ...(params.includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: { createdAt: "desc" },
    }) as unknown as EmailRecord[];
  },

  async findOne(params: EmailFindParams): Promise<EmailRecord | null> {
    return prismaCore.email.findFirst({
      where: {
        status: params.status,
        ...(params.toEmail ? { toEmails: { has: params.toEmail } } : {}),
        ...(params.includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: { createdAt: "desc" },
    }) as unknown as EmailRecord | null;
  },

  async findById(id: string): Promise<EmailRecord | null> {
    return prismaCore.email.findUnique({ where: { id } }) as unknown as EmailRecord | null;
  },

  async create(data: EmailCreateInput): Promise<EmailRecord> {
    // dérive toEmails si `to` est un array d’objets
    let toEmails: string[] | undefined = undefined;
    if ("to" in data) {
      if (data.to === null) {
        toEmails = [];
      } else if (Array.isArray(data.to)) {
        toEmails = (data.to as Array<any>).map((x) => x?.email).filter(Boolean);
      }
    }

    const row = await prismaCore.email.create({
      data: {
        messageId: data.messageId ?? undefined,
        inReplyTo: data.inReplyTo ?? undefined,
        fromName: data.fromName ?? undefined,
        fromEmail: data.fromEmail ?? undefined,
        to: data.to ?? undefined,
        toEmails: toEmails ?? [],
        subject: data.subject ?? undefined,
        sentAt: data.sentAt ?? undefined,
        rawTextBody: data.rawTextBody ?? undefined,
        rawHtmlBody: data.rawHtmlBody ?? undefined,
        mdTextBody: data.mdTextBody ?? undefined,
        attachments: data.attachments ?? undefined,
        raw: data.raw ?? undefined,
        status: data.status ?? "PENDING",
        reportUrl: data.reportUrl ?? undefined,
        fileObjectName: data.fileObjectName ?? undefined,
        dateFrom: data.dateFrom ?? undefined,
        dateTo: data.dateTo ?? undefined,
        createdCount: data.createdCount ?? undefined,
        failed: data.failed ?? undefined,
      },
    });

    return row as unknown as EmailRecord;
  },

  async update(id: string, patch: EmailUpdatePatch): Promise<EmailRecord> {
    const data: any = {};

    if ("messageId" in patch) {
      data.messageId = patch.messageId ?? undefined;
    }
    if ("inReplyTo" in patch) {
      data.inReplyTo = patch.inReplyTo ?? undefined;
    }
    if ("fromName" in patch) {
      data.fromName = patch.fromName ?? undefined;
    }
    if ("fromEmail" in patch) {
      data.fromEmail = patch.fromEmail ?? undefined;
    }

    if ("to" in patch) {
      data.to = patch.to ?? undefined;
      if (patch.to === null) {
        data.toEmails = { set: [] };
      } else if (Array.isArray(patch.to)) {
        const emails = (patch.to as Array<any>).map((x) => x?.email).filter(Boolean);
        data.toEmails = { set: emails };
      }
    }

    if ("subject" in patch) {
      data.subject = patch.subject ?? undefined;
    }
    if ("sentAt" in patch) {
      data.sentAt = patch.sentAt ?? undefined;
    }
    if ("rawTextBody" in patch) {
      data.rawTextBody = patch.rawTextBody ?? undefined;
    }
    if ("rawHtmlBody" in patch) {
      data.rawHtmlBody = patch.rawHtmlBody ?? undefined;
    }
    if ("mdTextBody" in patch) {
      data.mdTextBody = patch.mdTextBody ?? undefined;
    }
    if ("attachments" in patch) {
      data.attachments = patch.attachments ?? undefined;
    }
    if ("raw" in patch) {
      data.raw = patch.raw ?? undefined;
    }
    if ("status" in patch) {
      data.status = patch.status ?? "PENDING";
    }
    if ("reportUrl" in patch) {
      data.reportUrl = patch.reportUrl ?? undefined;
    }
    if ("fileObjectName" in patch) {
      data.fileObjectName = patch.fileObjectName ?? undefined;
    }
    if ("dateFrom" in patch) {
      data.dateFrom = patch.dateFrom ?? undefined;
    }
    if ("dateTo" in patch) {
      data.dateTo = patch.dateTo ?? undefined;
    }
    if ("createdCount" in patch) {
      data.createdCount = patch.createdCount ?? undefined;
    }
    if ("failed" in patch) {
      data.failed = patch.failed ?? undefined;
    }
    if ("deletedAt" in patch) {
      data.deletedAt = patch.deletedAt ?? undefined;
    }

    const row = await prismaCore.email.update({ where: { id }, data });
    return row as unknown as EmailRecord;
  },
};
