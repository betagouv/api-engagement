import { PublisherDemarcheSimplifiee } from "@/db/core";
import { publisherDemarcheSimplifieesRepository } from "@/repositories/publisher-demarche-simplifiees";
import { PublisherDemarcheSimplifieeInput, PublisherDemarcheSimplifieeRecord } from "@/types/publisher";
import { normalizeCollection, normalizeOptionalString } from "@/utils";

export const toDemarcheSimplifieeRecord = (demarche: PublisherDemarcheSimplifiee): PublisherDemarcheSimplifieeRecord => ({
  id: demarche.id,
  number: demarche.number,
  name: demarche.name ?? null,
  url: demarche.url ?? null,
  annotationKey: demarche.annotationKey ?? null,
});

// Garde les démarches ayant un numéro valide et dédoublonne par numéro (contrainte unique (publisherId, number)).
export const normalizeDemarches = (demarches?: PublisherDemarcheSimplifieeInput[] | null) =>
  normalizeCollection(
    demarches,
    (demarche) => {
      if (!demarche.number) {
        return null;
      }
      return {
        number: demarche.number,
        name: normalizeOptionalString(demarche.name) ?? null,
        url: normalizeOptionalString(demarche.url) ?? null,
        annotationKey: normalizeOptionalString(demarche.annotationKey) ?? null,
      };
    },
    {
      key: (demarche) => String(demarche.number),
    }
  );

export const publisherDemarcheSimplifieesService = {
  // Démarches Démarches Simplifiées d'un publisher (utilisé à la redirection pour retrouver l'annotation par URL).
  findByPublisher: async (publisherId: string): Promise<PublisherDemarcheSimplifieeRecord[]> => {
    const demarches = await publisherDemarcheSimplifieesRepository.findMany({ where: { publisherId } });
    return demarches.map(toDemarcheSimplifieeRecord);
  },

  // Toutes les démarches Démarches Simplifiées configurées (utilisé par le job d'import des candidatures).
  findAll: async (): Promise<PublisherDemarcheSimplifieeRecord[]> => {
    const demarches = await publisherDemarcheSimplifieesRepository.findMany();
    return demarches.map(toDemarcheSimplifieeRecord);
  },

  // Démarches groupées par publisher (utilisé pour enrichir plusieurs publishers en une seule requête).
  findByPublisherIds: async (publisherIds: string[]): Promise<Map<string, PublisherDemarcheSimplifieeRecord[]>> => {
    if (!publisherIds.length) {
      return new Map();
    }
    const demarches = await publisherDemarcheSimplifieesRepository.findMany({ where: { publisherId: { in: publisherIds } } });

    const byPublisherId = new Map<string, PublisherDemarcheSimplifieeRecord[]>();
    for (const demarche of demarches) {
      const records = byPublisherId.get(demarche.publisherId) ?? [];
      records.push(toDemarcheSimplifieeRecord(demarche));
      byPublisherId.set(demarche.publisherId, records);
    }
    return byPublisherId;
  },
};
