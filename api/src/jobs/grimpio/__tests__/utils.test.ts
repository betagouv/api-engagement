import { describe, expect, it, vi } from "vitest";

// Mock S3 service before import to avoid credentials error on launch
vi.mock("../../../services/s3", () => ({
  putObject: vi.fn(),
  OBJECT_ACL: {
    PUBLIC_READ: "public-read",
  },
}));

// Mock missionToGrimpioJob
vi.mock("../transformers", () => ({
  missionToGrimpioJob: vi.fn(),
}));

import { GrimpioJob } from "@/jobs/grimpio/types";
import { generateXML, storeXML } from "@/jobs/grimpio/utils";

describe("generateXML", () => {
  it("should generate valid XML structure with CDATA wrapping", () => {
    const mockJobs: GrimpioJob[] = [
      {
        title: "Bénévolat - Test Job",
        url: "https://example.com/job/123",
        contractType: "bénévolat",
        enterpriseName: "Test Company",
        description: "Job description",
        enterpriseIndustry: "Association ONG",
        externalId: "123",
        place: {
          latitude: 48.8566,
          longitude: 2.3522,
          city: "Paris",
          country: "FR",
        },
        logo: "https://example.com/logo.png",
        remoteJob: "none",
        annualGrossSalary: "",
        duration: "24h par semaine",
        attachment: "",
        levels: "",
        email: "",
        startingDate: "2025-01-01T00:00:00.000Z",
      },
    ];

    const xml = generateXML(mockJobs);

    expect(xml).toContain("<source>");
    expect(xml).toContain("<publisher>api-engagement</publisher>");
    expect(xml).toContain("<publisherurl>https://api-engagement.beta.gouv.fr/</publisherurl>");
    expect(xml).toContain("<job>");
    expect(xml).toContain("<![CDATA[Bénévolat - Test Job]]>");
    expect(xml).toContain("<![CDATA[Job description]]>");
    expect(xml).toContain("<![CDATA[Test Company]]>");
    expect(xml).toContain("<![CDATA[bénévolat]]>");
    expect(xml).toContain("<![CDATA[Association ONG]]>");
    expect(xml).toContain("<place>");
    expect(xml).toContain("<latitude>48.8566</latitude>");
    expect(xml).toContain("<longitude>2.3522</longitude>");
    expect(xml).toContain("<city>Paris</city>");
    expect(xml).toContain("<country>FR</country>");
  });

  it("should handle empty jobs array", () => {
    const xml = generateXML([]);
    expect(xml).toContain("<source>");
    expect(xml).toContain("<publisher>api-engagement</publisher>");
    expect(xml).not.toContain("<job>");
  });
});

describe("storeXML", () => {
  it("should store XML with correct file names and return URL", async () => {
    const { putObject } = await import("@/services/s3");
    const mockPutObject = vi.mocked(putObject);
    vi.setSystemTime(new Date("2025-01-15"));

    const xml = "<source><publisher>test</publisher></source>";
    const result = await storeXML(xml);

    expect(mockPutObject).toHaveBeenCalledTimes(2);
    expect(mockPutObject).toHaveBeenCalledWith("xml/grimpio-2025-01-15.xml", xml, {
      ContentType: "application/xml",
      ACL: "public-read",
    });
    expect(mockPutObject).toHaveBeenCalledWith("xml/grimpio.xml", xml, {
      ContentType: "application/xml",
      ACL: "public-read",
    });

    expect(result).toContain("grimpio-2025-01-15.xml");
  });
});
