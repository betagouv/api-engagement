import { warningOccurrenceRepository } from "@/repositories/warning-occurrence";
import type { WarningOccurrenceRecord } from "@/types/warning";

// Nombre maximal de réceptions renvoyées (les plus récentes) : une alerte longtemps ouverte peut en cumuler beaucoup.
const HISTORY_LIMIT = 100;

const toRecord = (o: WarningOccurrenceRecord): WarningOccurrenceRecord => ({
  id: o.id,
  warningId: o.warningId,
  title: o.title,
  description: o.description,
  createdAt: o.createdAt,
});

export const warningOccurrenceService = {
  async recordOccurrence(warningId: string, input: { title?: string | null; description?: string | null }): Promise<void> {
    await warningOccurrenceRepository.create({ data: { warningId, title: input.title ?? null, description: input.description ?? null } });
  },

  async findOccurrences(warningId: string): Promise<WarningOccurrenceRecord[]> {
    const occurrences = await warningOccurrenceRepository.findMany({ where: { warningId }, orderBy: { createdAt: "desc" }, take: HISTORY_LIMIT });
    return occurrences.map(toRecord);
  },
};
