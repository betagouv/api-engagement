import { Prisma } from "../db/core";
import { emailRepository } from "../repositories/email";
import type { EmailCreateInput, EmailFindParams, EmailRecord, EmailUpdatePatch } from "../types/email";

export const emailService = {
  async findEmails(params: EmailFindParams = {}): Promise<EmailRecord[]> {
    const findParams: Prisma.EmailFindManyArgs = {
      where: {
        status: params.status,
        ...(params.toEmail ? { toEmails: { has: params.toEmail } } : {}),
        ...(params.includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: { createdAt: Prisma.SortOrder.desc },
    };
    return await emailRepository.find(findParams);
  },

  async createEmail(input: EmailCreateInput): Promise<EmailRecord> {
    let toEmails: string[] | undefined = undefined;
    if ("to" in input) {
      if (input.to === null) {
        toEmails = [];
      } else if (Array.isArray(input.to)) {
        toEmails = (input.to as Array<any>).map((x) => x?.email).filter(Boolean);
      }
    }

    const data = {
      messageId: input.messageId ?? undefined,
      inReplyTo: input.inReplyTo ?? undefined,
      fromName: input.fromName ?? undefined,
      fromEmail: input.fromEmail ?? undefined,
      to: input.to ?? undefined,
      toEmails: toEmails ?? [],
      subject: input.subject ?? undefined,
      sentAt: input.sentAt ?? undefined,
      rawTextBody: input.rawTextBody ?? undefined,
      rawHtmlBody: input.rawHtmlBody ?? undefined,
      mdTextBody: input.mdTextBody ?? undefined,
      attachments: input.attachments ?? undefined,
      raw: input.raw ?? undefined,
      status: input.status ?? "PENDING",
      reportUrl: input.reportUrl ?? undefined,
      fileObjectName: input.fileObjectName ?? undefined,
      dateFrom: input.dateFrom ?? undefined,
      dateTo: input.dateTo ?? undefined,
      createdCount: input.createdCount ?? undefined,
      failed: input.failed ?? undefined,
    };

    return await emailRepository.create(data);
  },

  async updateEmail(id: string, patch: EmailUpdatePatch): Promise<EmailRecord> {
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

    return await emailRepository.update(id, data);
  },
};
