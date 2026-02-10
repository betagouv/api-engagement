import { describe, expect, it, vi } from "vitest";
import { PUBLISHER_IDS } from "../../../config";
import { PilotyMandatoryData } from "../../../services/piloty/types";
import { MissionType } from "../../../types";
import { MissionRecord } from "../../../types/mission";
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
    const baseMission: Partial<MissionRecord> = {
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
          geoPoint: null,
          location: {
            lat: 45.764,
            lon: 4.835,
          },
        },
      ],
      domain: "education",
      title: "Super Mission de Test",
      type: MissionType.BENEVOLAT,
      organizationName: "Association de Test",
      descriptionHtml: "<p>Une description 素晴らしい HTML.</p>",
      applicationUrl: "https://example.com/apply",
      publisherId: "some_publisher_id",
      remote: "no",
      deletedAt: null,
      statusCode: "ACCEPTED",
    };

    it("should correctly transform a mission for Benevolat", () => {
      const mission: MissionRecord = {
        ...baseMission,
      } as MissionRecord;

      const results = missionToPilotyJobs(mission, mockCompanyId, mockMandatoryData);
      const result = results[0].payload;

      expect(result.media_public_id).toBe(MEDIA_PUBLIC_ID);
      expect(result.company_public_id).toBe(mockCompanyId);
      expect(result.name).toBe(mission.title);
      expect(result.contract_id).toBe(mockMandatoryData.contracts.benevolat);
      expect(result.job_category_id).toBe(mockMandatoryData.jobCategories.education);
      expect(result.localisation).toBe("Lyon, Rhône, France");
      expect(result.description_job).toBe(
        [
          "<p><b>Type de mission : </b><b>Association de Test</b> vous propose une mission de bénévolat</p>",
          "<p><b>Domaine d'activité : </b>📚 Éducation pour tous</p>",
          "<p>Une description 素晴らしい HTML.</p>",
        ].join("\n")
      );
      expect(result.application_method).toBe("external_apply");
      expect(result.application_url).toBe(`https://api-engagement.beta.gouv.fr/r/${mission._id}/${PUBLISHER_IDS.LETUDIANT}`);
      expect(result.state).toBe("published");
      expect(result.remote_policy_id).toBeUndefined();
      expect(result.position_level).toBe("employee");
    });

    it("should correctly transform a volontariat mission", () => {
      const mission: MissionRecord = {
        ...baseMission,
        type: MissionType.VOLONTARIAT,
      } as MissionRecord;

      const results = missionToPilotyJobs(mission, mockCompanyId, mockMandatoryData);
      const result = results[0].payload;
      expect(result.contract_id).toBe(mockMandatoryData.contracts.volontariat);
      expect(result.name).toBe(`Volontariat - ${mission.title}`);
      expect(result.description_job).toBe(
        [
          "<p><b>Type de mission : </b><b>Association de Test</b> vous propose une mission de volontariat</p>",
          "<p><b>Domaine d'activité : </b>📚 Éducation pour tous</p>",
          "<p>Une description 素晴らしい HTML.</p>",
        ].join("\n")
      );
    });

    it("should set localisation to 'organization City' for full remote missions", () => {
      const mission: MissionRecord = {
        ...baseMission,
        remote: "full",
        organizationCity: "Lyon",
      } as MissionRecord;

      const results = missionToPilotyJobs(mission, mockCompanyId, mockMandatoryData);
      const result = results[0].payload;
      expect(result.localisation).toBe("Lyon, France");
    });

    it("should set localisation to 'France' for full remote missions with no address and no organization city", () => {
      const mission: MissionRecord = {
        ...baseMission,
        addresses: [],
        remote: "full",
        organizationCity: "",
      } as MissionRecord;

      const results = missionToPilotyJobs(mission, mockCompanyId, mockMandatoryData);
      const result = results[0].payload;
      expect(result.localisation).toBe("France");
    });

    it("should consider remote job if no address", () => {
      const mission: MissionRecord = {
        ...baseMission,
        addresses: [],
      } as MissionRecord;
      const results = missionToPilotyJobs(mission, mockCompanyId, mockMandatoryData);
      const result = results[0].payload;
      expect(result.remote_policy_id).toBe(mockMandatoryData.remotePolicies.full);
    });

    it("should return an array of jobs for each address", () => {
      const mission: MissionRecord = {
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
      } as MissionRecord;
      const results = missionToPilotyJobs(mission, mockCompanyId, mockMandatoryData);
      expect(results).toHaveLength(2);
    });

    it("should merge jobs when addresses are in the same city", () => {
      const mission: MissionRecord = {
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
            city: "Lyon",
            postalCode: "69000",
            street: "456 rue de test",
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
      } as MissionRecord;
      const results = missionToPilotyJobs(mission, mockCompanyId, mockMandatoryData);
      expect(results).toHaveLength(1);
      expect(results[0].payload.localisation).toBe("Lyon, Rhône, France");
    });

    it("should set state to 'archived' for not accepted mission", () => {
      const mission: MissionRecord = {
        ...baseMission,
        statusCode: "REFUSED",
      } as MissionRecord;
      const results = missionToPilotyJobs(mission, mockCompanyId, mockMandatoryData);
      expect(results[0].payload.state).toBe("archived");
    });

    it("should set state to 'archived' for each job if mission is deleted", () => {
      const mission: MissionRecord = {
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
        deletedAt: new Date(),
      } as MissionRecord;
      const results = missionToPilotyJobs(mission, mockCompanyId, mockMandatoryData);
      expect(results.every((job) => job.payload.state === "archived")).toBe(true);
    });

    it("should use 'autre' job category if mission domain is null or not in mandatoryData", () => {
      const missionNullDomain: MissionRecord = {
        ...baseMission,
        domain: "autre",
      } as MissionRecord;
      let result = missionToPilotyJobs(missionNullDomain, mockCompanyId, mockMandatoryData);
      expect(result[0].payload.job_category_id).toBe(mockMandatoryData.jobCategories.autre);

      const missionUnknownDomain: MissionRecord = {
        ...baseMission,
        domain: "domaine-inexistant", // This domain is not in mockMandatoryData.jobCategories
      } as MissionRecord;
      result = missionToPilotyJobs(missionUnknownDomain, mockCompanyId, mockMandatoryData);
      expect(result[0].payload.job_category_id).toBe(mockMandatoryData.jobCategories.autre);
    });

    it("should decode HTML entities in description_job", () => {
      const mission: MissionRecord = {
        ...baseMission,
        descriptionHtml: "Description with &lt;p&gt;html&lt;/p&gt; tags.",
      } as MissionRecord;

      const results = missionToPilotyJobs(mission, mockCompanyId, mockMandatoryData);
      const result = results[0].payload;

      expect(result.description_job).toBe(
        [
          "<p><b>Type de mission : </b><b>Association de Test</b> vous propose une mission de bénévolat</p>",
          "<p><b>Domaine d'activité : </b>📚 Éducation pour tous</p>",
          "Description with <p>html</p> tags.",
        ].join("\n")
      );
    });

    /**
     * Tests for missionToPilotyCompany function
     */
    describe("missionToPilotyCompany", () => {
      const baseMission: Partial<MissionRecord> = {
        organizationName: "Nom de l'association",
        organizationDescription: "Une description détaillée de l'organisation.",
        organizationLogo: "https://example.com/logo.png",
      };

      it("should correctly transform a mission to a Piloty company payload with organizationName", async () => {
        const mission: MissionRecord = {
          ...baseMission,
        } as MissionRecord;

        const result = await missionToPilotyCompany(mission);

        expect(result.media_public_id).toBe(MEDIA_PUBLIC_ID);
        expect(result.name).toBe(mission.organizationName);
        expect(result.description).toBe(mission.organizationDescription);
        expect(result.logo_url).toBe(mission.organizationLogo);
      });
    });
  });
});
