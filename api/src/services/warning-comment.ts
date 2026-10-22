import { Prisma } from "@/db/core";
import { warningCommentRepository } from "@/repositories/warning-comment";
import type { WarningCommentRecord } from "@/types/warning";

const include = { author: { select: { id: true, firstname: true, lastname: true, photo: true, deletedAt: true } } } satisfies Prisma.WarningCommentInclude;
type WithAuthor = Prisma.WarningCommentGetPayload<{ include: typeof include }>;

// Un utilisateur supprimé (soft delete, `deletedAt`) n'expose plus son identité.
const toRecord = (c: WithAuthor): WarningCommentRecord => ({
  id: c.id,
  warningId: c.warningId,
  body: c.body,
  author: c.author && !c.author.deletedAt ? { id: c.author.id, firstname: c.author.firstname, lastname: c.author.lastname, photo: c.author.photo } : null,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

export const warningCommentService = {
  async findComments(warningId: string): Promise<WarningCommentRecord[]> {
    const comments = (await warningCommentRepository.findMany({ where: { warningId }, orderBy: { createdAt: "asc" }, include })) as WithAuthor[];
    return comments.map(toRecord);
  },

  async findComment(id: string): Promise<(WarningCommentRecord & { authorId: string | null }) | null> {
    const c = (await warningCommentRepository.findUnique({ where: { id }, include })) as WithAuthor | null;
    return c ? { ...toRecord(c), authorId: c.authorId } : null;
  },

  async createComment(input: { warningId: string; authorId: string; body: string }): Promise<WarningCommentRecord> {
    return toRecord((await warningCommentRepository.create({ data: input, include })) as WithAuthor);
  },

  async updateComment(id: string, body: string): Promise<WarningCommentRecord> {
    return toRecord((await warningCommentRepository.update({ where: { id }, data: { body }, include })) as WithAuthor);
  },
};
