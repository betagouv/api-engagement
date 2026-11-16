import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/s3", () => ({ default: {}, putObject: vi.fn(), OBJECT_ACL: {} }));

import { annonceurs, jva, reserve, serviceCivique, spv } from "@/jobs/linkedin/dispositifs";
import { missionToLinkedinJobs } from "@/jobs/linkedin/transformers";
import { sanitizeHtml } from "@/jobs/linkedin/utils";
import { MissionRecord } from "@/types/mission";

const address = (city: string, extra = {}) => ({ city, postalCode: "75001", country: "FR", departmentName: "Paris", ...extra });

const mission = (overrides: Partial<MissionRecord> = {}) =>
  ({
    id: "11111111-1111-1111-1111-111111111111",
    title: "Aider les enfants",
    description: "d".repeat(150),
    descriptionHtml: `<p>${"d".repeat(150)}</p>`,
    organizationName: "Mon asso",
    domain: "education",
    remote: "no",
    createdAt: new Date("2025-01-05T10:00:00Z"),
    postedAt: null,
    endAt: null,
    requirements: [],
    audience: [],
    addresses: [address("Paris")],
    ...overrides,
  }) as unknown as MissionRecord;

describe("missionToLinkedinJobs", () => {
  it("génère un job par adresse, id d'origine conservé pour la première", () => {
    const jobs = missionToLinkedinJobs(mission({ addresses: [address("Paris"), address("Lyon", { postalCode: "69001" })] }), jva);
    expect(jobs.map((j) => j.partnerJobId)).toEqual(["11111111-1111-1111-1111-111111111111", "11111111-1111-1111-1111-111111111111-1"]);
    expect(jobs.every((j) => j.partnerJobId.length <= 40)).toBe(true);
    expect(jobs.map((j) => j.location)).toEqual(["Paris, France", "Lyon, France"]);
  });

  it("attribue les identifiants indépendamment de l'ordre des adresses", () => {
    const lyon = address("Lyon", { postalCode: "69001" });
    const paris = address("Paris");
    const byId = (addresses: object[]) => Object.fromEntries(missionToLinkedinJobs(mission({ addresses }), jva).map((j) => [j.partnerJobId, j.location]));
    expect(byId([lyon, paris])).toEqual(byId([paris, lyon]));
  });

  it("dédoublonne les adresses sans plafond", () => {
    const addresses = Array.from({ length: 30 }, (_, i) => address(`Ville${i}`, { postalCode: String(i) }));
    expect(missionToLinkedinJobs(mission({ addresses: [...addresses, addresses[0]] }), jva)).toHaveLength(30);
  });

  it("titres par dispositif, sans doubler le préfixe Service Civique", () => {
    expect(missionToLinkedinJobs(mission(), jva)[0].title).toBe("Mission de bénévolat : Aider les enfants");
    expect(missionToLinkedinJobs(mission({ title: "Service Civique - Aider" }), serviceCivique)[0].title).toBe("Service Civique : Aider");
    expect(missionToLinkedinJobs(mission(), reserve)[0].title).toBe("Réserviste : Aider les enfants - Sécurité, Défense, Résilience nationale");
    expect(missionToLinkedinJobs(mission(), spv)[0].title).toMatch(/^Sapeur-Pompier volontaire Paris - Secourisme/);
  });

  it("type d'emploi et page entreprise par dispositif", () => {
    const sc = missionToLinkedinJobs(mission(), serviceCivique)[0];
    expect(sc.jobtype).toBe("INTERNSHIP");
    expect(sc.companyId).toBe("146194199");
    expect(missionToLinkedinJobs(mission(), spv)[0].jobtype).toBe("CONTRACT");
    const jvaJob = missionToLinkedinJobs(mission(), jva)[0];
    expect(jvaJob.jobtype).toBe("VOLUNTEER");
    expect(jvaJob.companyId).toBe("11100845");
  });

  it("JVA : page de l'organisation si elle existe, sinon page JVA", () => {
    expect(missionToLinkedinJobs(mission({ organizationName: "AFEV" }), jva)[0]).toMatchObject({ company: "AFEV", companyId: "10329919" });
    expect(missionToLinkedinJobs(mission({ organizationName: "Inconnue" }), jva)[0]).toMatchObject({ company: "jeveuxaider.gouv.fr", companyId: "11100845" });
  });

  it("autre annonceur : sa page si elle existe, sinon JVA", () => {
    expect(missionToLinkedinJobs(mission({ organizationName: "benevolt" }), annonceurs)[0].companyId).toBe("11022359");
    expect(missionToLinkedinJobs(mission(), annonceurs)[0].companyId).toBe("11100845");
  });

  it("exclut les missions incomplètes ou sans lieu, accepte le full remote en France", () => {
    expect(missionToLinkedinJobs(mission({ organizationName: null }), jva)).toEqual([]);
    expect(missionToLinkedinJobs(mission({ addresses: [] }), jva)).toEqual([]);
    const remote = missionToLinkedinJobs(mission({ addresses: [], remote: "full" }), jva);
    expect(remote[0].location).toBe("France");
    expect(remote[0].workplaceTypes).toBe("Remote");
  });

  it("le minimum de 100 caractères porte sur la mission, pas sur l'intro", () => {
    expect(missionToLinkedinJobs(mission({ description: "court", descriptionHtml: "<p>court</p>" }), reserve)).toEqual([]);
  });

  it("listDate en MM/DD/YYYY depuis postedAt sinon createdAt", () => {
    expect(missionToLinkedinJobs(mission(), jva)[0].listDate).toBe("01/05/2025");
    expect(missionToLinkedinJobs(mission({ postedAt: new Date("2025-03-09T10:00:00Z") }), jva)[0].listDate).toBe("03/09/2025");
  });

  it("mappe le salaire quand l'info existe", () => {
    expect(missionToLinkedinJobs(mission(), jva)[0].salaries).toBeUndefined();
    const s = missionToLinkedinJobs(mission({ compensationAmount: 600, compensationUnit: "month" }), serviceCivique)[0].salaries;
    expect(s?.salary).toMatchObject({ lowEnd: { amount: 600 }, highEnd: { amount: 600 }, period: "MONTHLY" });
  });
});

describe("sanitizeHtml", () => {
  it("ne garde que les balises autorisées et convertit ol en ul", () => {
    expect(sanitizeHtml('<div class="x"><a href="y">lien</a> <ol><li>a</li></ol><script>x()</script></div>')).toBe("<p>lien <ul><li>a</li></ul></p>");
  });
  it("neutralise les balises imbriquées et le contenu script", () => {
    const out = sanitizeHtml("<p>a</p><scr<script>ipt>alert(1)</scr</script>ipt><script>evil()</script><p>b</p>");
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toContain("evil");
    expect(out).toContain("<p>a</p>");
  });
  it("convertit le texte brut en paragraphes", () => {
    expect(sanitizeHtml("a\nb\n\nc")).toBe("<p>a<br>b</p>\n<p>c</p>");
  });
});
