import { describe, expect, it, vi } from "vitest";
import { JVA_LOGO_URL, PUBLISHER_IDS } from "../../../config";
import { PilotyMandatoryData } from "../../../services/piloty/types";
import { Mission, MissionType } from "../../../types";
import { MEDIA_PUBLIC_ID } from "../config";
import { missionToPilotyCompany, missionToPilotyJobs } from "../transformers";

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
   * Tests for missionToPilotyJobs function
   */
  describe("missionToPilotyJobs", () => {
    const baseMission: Partial<Mission> = {
      addresses: [
        {
          city: "Lyon",
          postalCode: "69000",
          street: "123 rue de test",
          country: "France",
          departmentName: "Rhône",
          departmentCode: "69",
          region: "Auvergne-Rhône-Alpes",
          geolocStatus: "ENRICHED_BY_PUBLISHER",
          location: {
            lat: 45.764,
            lon: 4.835,
          },
        },
      ],
      domain: "education",
      title: "Super Mission de Test",
      type: MissionType.BENEVOLAT,
      descriptionHtml: "<p>Une description 素晴らしい HTML.</p>",
      applicationUrl: "https://example.com/apply",
      publisherId: "some_publisher_id",
      remote: "no",
      deletedAt: null,
    };

    it("should correctly transform a mission for Benevolat", () => {
      const mission: Mission = {
        ...baseMission,
      } as Mission;

      const results = missionToPilotyJobs(mission, mockCompanyId, mockMandatoryData);
      const result = results[0];

      expect(result.media_public_id).toBe(MEDIA_PUBLIC_ID);
      expect(result.company_public_id).toBe(mockCompanyId);
      expect(result.name).toBe(mission.title);
      expect(result.contract_id).toBe(mockMandatoryData.contracts.benevolat);
      expect(result.job_category_id).toBe(mockMandatoryData.jobCategories.education);
      expect(result.localisation).toBe("Lyon");
      expect(result.description_job).toBe("<p>Une description 素晴らしい HTML.</p>");
      expect(result.application_method).toBe("external_apply");
      expect(result.application_url).toBe(`https://api-engagement.beta.gouv.fr/r/${mission._id}/${PUBLISHER_IDS.LETUDIANT}`);
      expect(result.state).toBe("published");
      expect(result.remote_policy_id).toBeUndefined();
      expect(result.position_level).toBe("employee");
    });

    it("should correctly transform a volontariat mission", () => {
      const mission: Mission = {
        ...baseMission,
        type: MissionType.VOLONTARIAT,
      } as Mission;

      const results = missionToPilotyJobs(mission, mockCompanyId, mockMandatoryData);
      const result = results[0];
      expect(result.contract_id).toBe(mockMandatoryData.contracts.volontariat);
    });

    it("should set localisation to 'A distance' for full remote missions and set remote_policy_id", () => {
      const mission: Mission = {
        ...baseMission,
        remote: "full",
      } as Mission;

      const results = missionToPilotyJobs(mission, mockCompanyId, mockMandatoryData);
      const result = results[0];
      expect(result.localisation).toBe("A distance");
      expect(result.remote_policy_id).toBe(mockMandatoryData.remotePolicies.full);
    });

    it("should return an empty array if no address is provided", () => {
      const mission: Mission = {
        ...baseMission,
        addresses: [],
      } as Mission;
      const results = missionToPilotyJobs(mission, mockCompanyId, mockMandatoryData);
      expect(results).toHaveLength(0);
    });

    it("should return an array of jobs for each address", () => {
      const mission: Mission = {
        ...baseMission,
        addresses: [
          {
            city: "Lyon",
            postalCode: "69000",
            street: "123 rue de test",
            country: "France",
            departmentName: "Rhône",
            departmentCode: "69",
            region: "Auvergne-Rhône-Alpes",
            geolocStatus: "ENRICHED_BY_PUBLISHER",
            location: {
              lat: 45.764,
              lon: 4.835,
            },
          },
          {
            city: "Marseille",
            postalCode: "13000",
            street: "456 rue de test",
            country: "France",
            departmentName: "Bouches-du-Rhône",
            departmentCode: "13",
            region: "Provence-Alpes-Côte d'Azur",
            geolocStatus: "ENRICHED_BY_PUBLISHER",
            location: {
              lat: 43.296,
              lon: 5.369,
            },
          },
        ],
      } as Mission;
      const results = missionToPilotyJobs(mission, mockCompanyId, mockMandatoryData);
      expect(results).toHaveLength(2);
    });

    it("should set state to 'archived' if mission is deleted", () => {
      const mission: Mission = {
        ...baseMission,
        deletedAt: new Date(),
      } as Mission;
      const results = missionToPilotyJobs(mission, mockCompanyId, mockMandatoryData);
      const result = results[0];
      expect(result.state).toBe("archived");
    });

    it("should use 'autre' job category if mission domain is null or not in mandatoryData", () => {
      const missionNullDomain: Mission = {
        ...baseMission,
        domain: "autre",
      } as Mission;
      let result = missionToPilotyJobs(missionNullDomain, mockCompanyId, mockMandatoryData);
      expect(result[0].job_category_id).toBe(mockMandatoryData.jobCategories.autre);

      const missionUnknownDomain: Mission = {
        ...baseMission,
        domain: "domaine-inexistant", // This domain is not in mockMandatoryData.jobCategories
      } as Mission;
      result = missionToPilotyJobs(missionUnknownDomain, mockCompanyId, mockMandatoryData);
      expect(result[0].job_category_id).toBe(mockMandatoryData.jobCategories.autre);
    });

    it("should decode HTML entities in description_job", () => {
      const mission: Mission = {
        ...baseMission,
        descriptionHtml: "Description with &lt;p&gt;html&lt;/p&gt; tags.",
      } as Mission;

      const results = missionToPilotyJobs(mission, mockCompanyId, mockMandatoryData);
      const result = results[0];

      expect(result.description_job).toBe("Description with <p>html</p> tags.");
    });

    /**
     * Tests for missionToPilotyCompany function
     */
    describe("missionToPilotyCompany", () => {
      const baseMission: Partial<Mission> = {
        organizationName: "Nom de l'association",
        organizationDescription: "Une description détaillée de l'organisation.",
        organizationLogo: "https://example.com/logo.png",
      };

      it("should correctly transform a mission to a Piloty company payload with organizationName", async () => {
        const mission: Mission = {
          ...baseMission,
        } as Mission;

        const result = await missionToPilotyCompany(mission);

        expect(result.media_public_id).toBe(MEDIA_PUBLIC_ID);
        expect(result.name).toBe(mission.organizationName);
        expect(result.description).toBe(mission.organizationDescription);
        expect(result.logo_url).toBe(mission.organizationLogo);
      });

      it("should use JVA logo if no organizationLogo is provided", async () => {
        const mission: Mission = {
          ...baseMission,
          organizationLogo: "",
        } as Mission;

        const result = await missionToPilotyCompany(mission);

        expect(result.logo_url).toBe(JVA_LOGO_URL);
      });
    });
  });
});
