import { beforeEach, describe, expect, it, vi } from "vitest";

const retrieveMock = vi.fn();
const updateMock = vi.fn();
const createMock = vi.fn();
const collectionsMock = vi.fn((name?: string) => {
  if (name) {
    return {
      retrieve: retrieveMock,
      update: updateMock,
    };
  }
  return {
    create: createMock,
  };
});

const loadSchema = async (taxonomyKeys = ["domaine"]) => {
  vi.resetModules();
  vi.doMock("@/services/typesense/mission-fields", () => ({
    INDEXED_TAXONOMY_KEYS: taxonomyKeys,
  }));
  vi.doMock("@/services/typesense/client", () => ({
    typesenseClient: {
      collections: collectionsMock,
    },
  }));
  return import("@/services/typesense/schema");
};

const field = (name: string, type: string, facet = false, optional = false) => ({ name, type, facet, optional });

const expectedFields = () => [field("id", "string"), field("publisherId", "string", true), field("departmentCodes", "string[]", true), field("domaine", "string[]", true, true)];

const collectionSchema = (fields = expectedFields()) => ({
  name: "missions",
  fields,
  created_at: 1,
  default_sorting_field: "",
  enable_nested_fields: false,
  num_documents: 0,
  num_memory_shards: 0,
  symbols_to_index: [],
  token_separators: [],
});

describe("ensureMissionCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    retrieveMock.mockReset();
    updateMock.mockReset();
    createMock.mockReset();
    collectionsMock.mockClear();
  });

  it("crée la collection lorsqu'elle est absente", async () => {
    retrieveMock.mockRejectedValue({ httpStatus: 404 });
    createMock.mockResolvedValue(collectionSchema());
    const { ensureMissionCollection, MISSION_COLLECTION_SCHEMA } = await loadSchema();

    await ensureMissionCollection();

    expect(createMock).toHaveBeenCalledWith(MISSION_COLLECTION_SCHEMA);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("ajoute uniquement les champs manquants", async () => {
    retrieveMock.mockResolvedValue(collectionSchema(expectedFields().filter((existingField) => existingField.name !== "domaine")));
    updateMock.mockResolvedValue(collectionSchema());
    const { ensureMissionCollection } = await loadSchema();

    await ensureMissionCollection();

    expect(updateMock).toHaveBeenCalledWith({
      fields: [{ name: "domaine", type: "string[]", facet: true, optional: true }],
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("ne fait rien lorsque le schéma est déjà à jour", async () => {
    retrieveMock.mockResolvedValue(collectionSchema());
    const { ensureMissionCollection } = await loadSchema();

    await ensureMissionCollection();

    expect(updateMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("ignore les champs obsolètes présents dans Typesense", async () => {
    retrieveMock.mockResolvedValue(collectionSchema([...expectedFields(), field("old_taxonomy", "string[]", true, true)]));
    const { ensureMissionCollection } = await loadSchema();

    await ensureMissionCollection();

    expect(updateMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("échoue lorsqu'un champ attendu existe avec une configuration incompatible", async () => {
    retrieveMock.mockResolvedValue(collectionSchema([field("id", "string"), field("publisherId", "string", true), field("departmentCodes", "string[]", true), field("domaine", "string")]));
    const { ensureMissionCollection } = await loadSchema();

    await expect(ensureMissionCollection()).rejects.toThrow("Incompatible field 'domaine'");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("tolère une création concurrente de collection", async () => {
    retrieveMock.mockRejectedValueOnce({ httpStatus: 404 }).mockResolvedValueOnce(collectionSchema());
    createMock.mockRejectedValue({ httpStatus: 409 });
    const { ensureMissionCollection } = await loadSchema();

    await ensureMissionCollection();

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(retrieveMock).toHaveBeenCalledTimes(2);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
