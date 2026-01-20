import { describe, expect, it, vi } from "vitest";
import { JVA_LOGO_URL } from "../../../config";

// Mock S3 service before import to avoid credentials error on launch
vi.mock("../../../services/s3", () => ({
  putObject: vi.fn(),
  OBJECT_ACL: {
    PUBLIC_READ: "public-read",
  },
}));

// Mock missionToTalentJob
vi.mock("../transformers", () => ({
  missionToTalentJob: vi.fn(),
}));

import { TalentJob } from "../types";
import { generateXML, getActivityCategory, getImageUrl, storeXML } from "../utils";

describe("getActivityCategory", () => {
  it("should return the correct category for known activities", () => {
    expect(getActivityCategory("art")).toBe("Arts");
    expect(getActivityCategory("informatique")).toBe("IT");
    expect(getActivityCategory("sante-soins")).toBe("Healthcare");
    expect(getActivityCategory("bricolage")).toBe("Construction");
    expect(getActivityCategory("alphabetisation")).toBe("Education");
    expect(getActivityCategory("conseil")).toBe("Consulting");
    expect(getActivityCategory("logistique")).toBe("Logistics");
    expect(getActivityCategory("juridique")).toBe("Legal");
    expect(getActivityCategory("recrutement")).toBe("Human Resources");
    expect(getActivityCategory("comptabilite-finance")).toBe("Accounting");
    expect(getActivityCategory("secourisme")).toBe("Healthcare");
    expect(getActivityCategory("taches-administratives")).toBe("Administration");
    expect(getActivityCategory("mission-internationale")).toBe("Travel");
    expect(getActivityCategory("animation")).toBe("Education");
    expect(getActivityCategory("communication")).toBe("Marketing");
    expect(getActivityCategory("aide-psychologique")).toBe("Healthcare");
    expect(getActivityCategory("activites-manuelles")).toBe("Skilled Labor");
    expect(getActivityCategory("visites")).toBe("Social Care");
    expect(getActivityCategory("distribution")).toBe("Logistics");
    expect(getActivityCategory("soutien-scolaire")).toBe("Education");
    expect(getActivityCategory("gestion-recherche-des-partenariats")).toBe("Sales");
    expect(getActivityCategory("responsabilites-associatives")).toBe("Administration");
    expect(getActivityCategory("enseignement-formation")).toBe("Training");
    expect(getActivityCategory("gestion-de-projets")).toBe("Administration");
    expect(getActivityCategory("lutte-contre-isolement")).toBe("Social Care");
    expect(getActivityCategory("ramassage-dechets")).toBe("Services");
    expect(getActivityCategory("sensibilisation")).toBe("Services");
    expect(getActivityCategory("soins-animaux")).toBe("Agriculture");
  });

  it("should return undefined for unknown or unmapped activities", () => {
    expect(getActivityCategory("collecte")).toBeUndefined();
    expect(getActivityCategory("jardinage")).toBeUndefined();
    expect(getActivityCategory("encadrement-d-equipes")).toBeUndefined();
    expect(getActivityCategory("documentation-traduction")).toBeUndefined();
    expect(getActivityCategory("ecoute-permanence")).toBeUndefined();
    expect(getActivityCategory("accueil-de-public")).toBeUndefined();
    expect(getActivityCategory("mentorat-parrainage")).toBeUndefined();
    expect(getActivityCategory("sport")).toBeUndefined();
    expect(getActivityCategory("autre")).toBeUndefined();
    expect(getActivityCategory("unknown-activity")).toBeUndefined();
  });
});

describe("getImageUrl", () => {
  it("should return the original image URL if it ends with .png", () => {
    const pngUrl = "https://example.com/logo.png";
    expect(getImageUrl(pngUrl)).toBe(pngUrl);
  });

  it("should return JVA_LOGO_URL if image doesn't end with .png", () => {
    expect(getImageUrl("https://example.com/logo.jpg")).toBe(JVA_LOGO_URL);
    expect(getImageUrl("https://example.com/logo.gif")).toBe(JVA_LOGO_URL);
    expect(getImageUrl("https://example.com/logo")).toBe(JVA_LOGO_URL);
  });

  it("should return JVA_LOGO_URL if no image is provided", () => {
    expect(getImageUrl()).toBe(JVA_LOGO_URL);
    expect(getImageUrl(undefined)).toBe(JVA_LOGO_URL);
  });
});

describe("generateXML", () => {
  it("should generate valid XML structure with CDATA wrapping", () => {
    const mockJobs: TalentJob[] = [
      {
        referencenumber: "123",
        title: "Test Job",
        description: "Job description",
        company: "Test Company",
        city: "Paris",
        state: "Île-de-France",
        country: "FR",
        dateposted: "2025-01-01T00:00:00.000Z",
        url: "https://example.com/job/123",
        jobtype: "part-time",
        category: "IT",
      },
    ];

    const xml = generateXML(mockJobs);

    expect(xml).toContain("<source>");
    expect(xml).toContain("<publisher>api-engagement</publisher>");
    expect(xml).toContain("<publisherurl>https://api-engagement.beta.gouv.fr/</publisherurl>");
    expect(xml).toContain("<job>");
    expect(xml).toContain("<![CDATA[123]]>");
    expect(xml).toContain("<![CDATA[Test Job]]>");
    expect(xml).toContain("<![CDATA[Job description]]>");
    expect(xml).toContain("<![CDATA[Test Company]]>");
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
    const mockPutObject = vi.mocked(await import("../../../services/s3")).putObject;
    vi.setSystemTime(new Date("2025-01-15"));

    const xml = "<source><publisher>test</publisher></source>";
    const result = await storeXML(xml);

    expect(mockPutObject).toHaveBeenCalledTimes(2);
    expect(mockPutObject).toHaveBeenCalledWith("xml/talent-2025-01-15.xml", xml, {
      ContentType: "application/xml",
      ACL: "public-read",
    });
    expect(mockPutObject).toHaveBeenCalledWith("xml/talent.xml", xml, {
      ContentType: "application/xml",
      ACL: "public-read",
    });

    expect(result).toContain("talent-2025-01-15.xml");
  });
});
