import { describe, expect, it, beforeEach, vi } from "vitest";

import { PublisherCreateInput } from "../../types/publisher";

const randomBytesMock = vi.hoisted(() => vi.fn<Buffer, [number]>());

vi.mock("crypto", async () => {
  const actual = await vi.importActual<typeof import("crypto")>("crypto");
  return {
    ...actual,
    randomBytes: randomBytesMock,
  };
});

const repositoryMock = vi.hoisted(() => ({
  count: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("../../repositories/publisher", () => ({
  publisherRepository: repositoryMock,
}));

import { publisherRepository } from "../../repositories/publisher";
import { publisherService } from "../publisher";

const buildPublisherCreateInput = (overrides: Partial<PublisherCreateInput> = {}): PublisherCreateInput => ({
  name: "  Example Publisher ",
  isAnnonceur: false,
  hasApiRights: false,
  hasWidgetRights: false,
  hasCampaignRights: false,
  sendReport: false,
  sendReportTo: [],
  ...overrides,
});

const baseDate = new Date("2023-01-01T00:00:00.000Z");

const mockRepositoryCreate = () =>
  publisherRepository.create.mockImplementation(async ({ data }) => ({
    id: data.id,
    name: data.name,
    category: data.category,
    url: data.url,
    moderator: data.moderator,
    moderatorLink: data.moderatorLink,
    email: data.email,
    documentation: data.documentation,
    logo: data.logo,
    defaultMissionLogo: data.defaultMissionLogo,
    lead: data.lead,
    feed: data.feed,
    feedUsername: data.feedUsername,
    feedPassword: data.feedPassword,
    apikey: data.apikey,
    description: data.description,
    missionType: data.missionType,
    isAnnonceur: data.isAnnonceur,
    hasApiRights: data.hasApiRights,
    hasWidgetRights: data.hasWidgetRights,
    hasCampaignRights: data.hasCampaignRights,
    sendReport: data.sendReport,
    sendReportTo: data.sendReportTo,
    deletedAt: null,
    createdAt: baseDate,
    updatedAt: baseDate,
    diffuseurs: [],
  }));

describe("publisherService.createPublisher", () => {
  beforeEach(() => {
    Object.values(repositoryMock).forEach((mockFn) => mockFn.mockReset());
    randomBytesMock.mockReset();
  });

  it("assigns a Mongo ObjectId formatted identifier to newly created publishers", async () => {
    const expectedId = "0123456789abcdef01234567";
    randomBytesMock.mockReturnValueOnce(Buffer.from(expectedId, "hex"));
    publisherRepository.findUnique.mockResolvedValueOnce(null);
    mockRepositoryCreate();

    const input = buildPublisherCreateInput();
    const created = await publisherService.createPublisher(input);

    expect(publisherRepository.findUnique).toHaveBeenCalledTimes(1);
    expect(publisherRepository.create).toHaveBeenCalledTimes(1);

    const createArgs = publisherRepository.create.mock.calls[0][0];
    expect(createArgs.data.id).toBe(expectedId);
    expect(createArgs.data.name).toBe("Example Publisher");
    expect(created.id).toBe(expectedId);
    expect(created._id).toBe(expectedId);
    expect(created.name).toBe("Example Publisher");
  });

  it("retries id generation when a conflict is detected", async () => {
    const duplicateId = "aaaaaaaaaaaaaaaaaaaaaaaa";
    const uniqueId = "bbbbbbbbbbbbbbbbbbbbbbbb";
    randomBytesMock.mockReturnValueOnce(Buffer.from(duplicateId, "hex"));
    randomBytesMock.mockReturnValueOnce(Buffer.from(uniqueId, "hex"));

    publisherRepository.findUnique.mockResolvedValueOnce({ id: duplicateId } as unknown as Record<string, unknown>);
    publisherRepository.findUnique.mockResolvedValueOnce(null);
    mockRepositoryCreate();

    const input = buildPublisherCreateInput();
    const created = await publisherService.createPublisher(input);

    expect(publisherRepository.findUnique).toHaveBeenCalledTimes(2);
    expect(publisherRepository.create).toHaveBeenCalledTimes(1);

    const createArgs = publisherRepository.create.mock.calls[0][0];
    expect(createArgs.data.id).toBe(uniqueId);
    expect(created.id).toBe(uniqueId);
  });

  it("throws when unable to generate a unique identifier", async () => {
    const conflictingId = "cccccccccccccccccccccccc";
    randomBytesMock.mockReturnValue(Buffer.from(conflictingId, "hex"));
    publisherRepository.findUnique.mockResolvedValue({ id: conflictingId } as unknown as Record<string, unknown>);

    await expect(publisherService.createPublisher(buildPublisherCreateInput())).rejects.toThrow("Failed to generate a unique publisher identifier");
    expect(publisherRepository.create).not.toHaveBeenCalled();
  });
});
