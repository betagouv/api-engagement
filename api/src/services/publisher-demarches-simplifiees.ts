import { DemarcheSimplifieeFieldType } from "@/db/core";
import { publisherRepository } from "@/repositories/publisher";
import { PublisherDemarcheSimplifieeWithFields, publisherDemarcheSimplifieesRepository } from "@/repositories/publisher-demarche-simplifiees";
import { CandidateFields, PublisherDemarcheSimplifieeInput, PublisherDemarcheSimplifieeRecord } from "@/types/publisher";
import { normalizeCollection, normalizeOptionalString } from "@/utils";
import { decrypt, encrypt } from "@/utils/encryption";

// Lignes de champs qualifiés → { BIRTH_DATE: "Date de naissance", POSTAL_CODE: "Code postal" } (types configurés uniquement).
const toCandidateFields = (fields: { type: DemarcheSimplifieeFieldType; label: string }[]): CandidateFields => Object.fromEntries(fields.map((field) => [field.type, field.label]));

export const toDemarcheSimplifieeRecord = (demarche: PublisherDemarcheSimplifieeWithFields): PublisherDemarcheSimplifieeRecord => ({
  id: demarche.id,
  number: demarche.number,
  name: demarche.name ?? null,
  url: demarche.url ?? null,
  annotationKey: demarche.annotationKey ?? null,
  fields: toCandidateFields(demarche.fields),
});

// { BIRTH_DATE: "Date de naissance", COUNTRY: null, ... } → lignes de champs qualifiés à créer (types renseignés uniquement).
const normalizeFields = (fields?: CandidateFields | null) =>
  Object.values(DemarcheSimplifieeFieldType).flatMap((type) => {
    const label = normalizeOptionalString(fields?.[type]);
    return label ? [{ type, label }] : [];
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
        fields: { create: normalizeFields(demarche.fields) },
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

  // Enregistre (chiffré) le token API Démarches Simplifiées d'un publisher. Renvoie false si le publisher n'existe pas.
  saveToken: async (publisherId: string, token: string): Promise<boolean> => {
    const publisher = await publisherRepository.findUnique({ where: { id: publisherId } });
    if (!publisher) {
      return false;
    }
    await publisherRepository.update({ where: { id: publisherId }, data: { demarcheSimplifieeToken: encrypt(token) } });
    return true;
  },

  // Token API Démarches Simplifiées déchiffré d'un publisher, ou null s'il n'en a pas fourni (→ token global).
  findTokenByPublisherId: async (publisherId: string): Promise<string | null> => {
    const publisher = await publisherRepository.findUnique({ where: { id: publisherId } });
    return publisher?.demarcheSimplifieeToken ? decrypt(publisher.demarcheSimplifieeToken) : null;
  },

  // Toutes les démarches configurées, dédoublonnées par numéro, avec le token API du partenaire déchiffré (null → token global).
  // Utilisé par le job d'import des candidatures.
  findAllWithToken: async (): Promise<{ number: number; token: string | null }[]> => {
    const demarches = await publisherDemarcheSimplifieesRepository.findMany();
    const publishers = await publisherRepository.findMany({ where: { id: { in: [...new Set(demarches.map((demarche) => demarche.publisherId))] } } });
    const tokenByPublisherId = new Map(publishers.map((publisher) => [publisher.id, publisher.demarcheSimplifieeToken ? decrypt(publisher.demarcheSimplifieeToken) : null]));

    const tokenByNumber = new Map<number, string | null>();
    for (const demarche of demarches) {
      if (!tokenByNumber.get(demarche.number)) {
        tokenByNumber.set(demarche.number, tokenByPublisherId.get(demarche.publisherId) ?? null);
      }
    }
    return [...tokenByNumber].map(([number, token]) => ({ number, token }));
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
