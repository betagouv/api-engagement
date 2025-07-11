import { describe, expect, it, vi } from "vitest";
import { PUBLISHER_IDS } from "../../../config";
import { PilotyMandatoryData } from "../../../services/piloty/types";
import { Mission, MissionType } from "../../../types";
import { MEDIA_PUBLIC_ID } from "../config";
import { missionToPilotyCompany, missionToPilotyJob } from "../transformers";

vi.mock("../../../utils/mission", () => ({
  getMissionTrackedApplicationUrl: vi.fn((mission, publisherId) => `https://api-engagement.beta.gouv.fr/r/${mission._id}/${publisherId}`),
}));

const mockCompanyId = "test-company-public-id";

const mockMandatoryData: PilotyMandatoryData = {
  contracts: {
    benevolat: "piloty_contract_benevolat_id",
    volontariat: "piloty_contract_volontariat_id",
  },
  jobCategories: {
    "animation-sportive": "piloty_jobcat_animation_sportive_id",
    autre: "piloty_jobcat_autre_id",
    "culture-loisirs": "piloty_jobcat_culture_loisirs_id",
    education: "piloty_jobcat_education_id",
    environnement: "piloty_jobcat_environnement_id",
    "hotellerie-restauration": "piloty_jobcat_hotellerie_restauration_id",
    "prevention-securite": "piloty_jobcat_prevention_securite_id",
    sante: "piloty_jobcat_sante_id",
    "solidarite-insertion": "piloty_jobcat_solidarite_insertion_id",
    "information-communication": "piloty_jobcat_information_communication_id",
  },
  remotePolicies: {
    full: "piloty_remote_full_id",
  },
};

describe("L'Etudiant Transformers", () => {
  /**
   * Tests for missionToPilotyJob function
   */
  describe("missionToPilotyJob", () => {
    const baseMission: Partial<Mission> = {
      title: "Super Mission de Test",
      type: MissionType.BENEVOLAT,
      descriptionHtml: "<p>Une description 素晴らしい HTML.</p>",
      applicationUrl: "https://example.com/apply",
      organizationDescription: "Description de l'organisation.",
    };

    it("should correctly transform a mission for Benevolat", () => {
      const mission: Mission = {
        ...baseMission,
        publisherId: "some_other_publisher_id",
        domain: "sante",
        remote: "no",
        city: "Lyon",
        deletedAt: null,
      } as Mission;

      const result = missionToPilotyJob(mission, mockCompanyId, mockMandatoryData);

      expect(result.media_public_id).toBe(MEDIA_PUBLIC_ID);
      expect(result.company_public_id).toBe(mockCompanyId);
      expect(result.name).toBe(mission.title);
      expect(result.contract_id).toBe(mockMandatoryData.contracts.benevolat);
      expect(result.job_category_id).toBe(mockMandatoryData.jobCategories.sante);
      expect(result.localisation).toBe(mission.city);
      expect(result.description_job).toBe("<p>Une description 素晴らしい HTML.</p>");
      expect(result.application_method).toBe("external_apply");
      expect(result.application_url).toBe(`https://api-engagement.beta.gouv.fr/r/${mission._id}/${PUBLISHER_IDS.LETUDIANT}`);
      expect(result.state).toBe("published");
      expect(result.remote_policy_id).toBeUndefined();
      expect(result.position_level).toBe("employee");
      expect(result.description_company).toBe(mission.organizationDescription);
    });

    it("should correctly transform a volontariat mission", () => {
      const mission: Mission = {
        ...baseMission,
        type: MissionType.VOLONTARIAT,
        domain: "education",
        remote: "full",
        city: "Marseille",
        deletedAt: null,
      } as Mission;

      const result = missionToPilotyJob(mission, mockCompanyId, mockMandatoryData);
      expect(result.contract_id).toBe(mockMandatoryData.contracts.volontariat);
    });

    it("should set localisation to 'A distance' for full remote missions and set remote_policy_id", () => {
      const mission: Mission = {
        ...baseMission,
        domain: "culture-loisirs",
        remote: "full",
        city: "Paris", // City should be ignored for localisation
        deletedAt: null,
      } as Mission;

      const result = missionToPilotyJob(mission, mockCompanyId, mockMandatoryData);
      expect(result.localisation).toBe("A distance");
      expect(result.remote_policy_id).toBe(mockMandatoryData.remotePolicies.full);
    });

    it("should set localisation to city if remote is not full and city is provided", () => {
      const mission: Mission = {
        ...baseMission,
        publisherId: "any_id",
        domain: "environnement",
        remote: "no",
        city: "Bordeaux",
        deletedAt: null,
      } as Mission;
      const result = missionToPilotyJob(mission, mockCompanyId, mockMandatoryData);
      expect(result.localisation).toBe("Bordeaux");
      expect(result.remote_policy_id).toBeUndefined();
    });

    it("should set state to 'archived' if mission is deleted", () => {
      const mission: Mission = {
        ...baseMission,
        publisherId: "any_id",
        domain: "autre",
        remote: "no",
        city: "Lille",
        deletedAt: new Date(),
      } as Mission;
      const result = missionToPilotyJob(mission, mockCompanyId, mockMandatoryData);
      expect(result.state).toBe("archived");
    });

    it("should use 'autre' job category if mission domain is null or not in mandatoryData", () => {
      const missionNullDomain: Mission = {
        ...baseMission,
        publisherId: "any_id",
        domain: "autre",
        remote: "no",
        city: "Strasbourg",
        deletedAt: null,
      } as Mission;
      let result = missionToPilotyJob(missionNullDomain, mockCompanyId, mockMandatoryData);
      expect(result.job_category_id).toBe(mockMandatoryData.jobCategories.autre);

      const missionUnknownDomain: Mission = {
        ...baseMission,
        publisherId: "any_id",
        domain: "domaine-inexistant", // This domain is not in mockMandatoryData.jobCategories
        remote: "no",
        city: "Strasbourg",
        deletedAt: null,
      } as Mission;
      result = missionToPilotyJob(missionUnknownDomain, mockCompanyId, mockMandatoryData);
      expect(result.job_category_id).toBe(mockMandatoryData.jobCategories.autre);
    });

    it("should decode HTML entities in description_job", () => {
      const mission: Mission = {
        ...baseMission,
        publisherId: "any_id",
        domain: "sante",
        remote: "no",
        city: "Lyon",
        deletedAt: null,
        descriptionHtml: "Description with &lt;p&gt;html&lt;/p&gt; tags.",
      } as Mission;

      const result = missionToPilotyJob(mission, mockCompanyId, mockMandatoryData);

      expect(result.description_job).toBe("Description with <p>html</p> tags.");
    });

    /**
     * Tests for missionToPilotyCompany function
     */
    describe("missionToPilotyCompany", () => {
      const baseMission: Partial<Mission> = {
        organizationDescription: "Une description détaillée de l'organisation.",
        organizationLogo: "https://example.com/logo.png",
        organizationUrl: "https://example.com/org", // This is not used in the current transformer due to comments
      };

      it("should correctly transform a mission to a Piloty company payload with organizationName", async () => {
        const mission: Mission = {
          ...baseMission,
          organizationName: "Nom de l'Organisation Principal",
          associationName: "Nom de l'Association Secondaire",
        } as Mission;

        const result = await missionToPilotyCompany(mission);

        expect(result.media_public_id).toBe(MEDIA_PUBLIC_ID);
        expect(result.name).toBe(mission.organizationName);
        expect(result.description).toBe(mission.organizationDescription);
        expect(result.logo_url).toBe(mission.organizationLogo);
      });
    });
  });
});
