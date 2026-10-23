import { warningOccurrenceRepository } from "@/repositories/warning-occurrence";
import type { WarningOccurrenceRecord } from "@/types/warning";

// Nombre maximal de réceptions renvoyées (les plus récentes) : une alerte longtemps ouverte peut en cumuler beaucoup.
const HISTORY_LIMIT = 100;

// Les réceptions sont enregistrées par warningService (création / mise à jour d'une alerte avec une `source`).
export const warningOccurrenceService = {
  async findOccurrences(warningId: string): Promise<WarningOccurrenceRecord[]> {
    const occurrences = await warningOccurrenceRepository.findMany({ where: { warningId }, orderBy: { createdAt: "desc" }, take: HISTORY_LIMIT });
    return occurrences.map((o) => ({ id: o.id, warningId: o.warningId, source: o.source, title: o.title, description: o.description, createdAt: o.createdAt }));
  },
};
