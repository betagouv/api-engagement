import { describe, expect, it } from "vitest";
import { AddressItem, Mission } from "../../types";
import { getMissionChanges } from "../mission";

describe("getMissionChanges", () => {
  const createBaseMission = (): Mission =>
    ({
      publisherId: "test-publisher",
      publisherName: "Test Publisher",
      publisherUrl: "https://test.com",
      publisherLogo: "logo.png",
      lastSyncAt: new Date("2023-01-01"),
      applicationUrl: "https://apply.com",
      statusCode: "ACCEPTED",
      statusComment: "",
      clientId: "client123",
      title: "Test Mission",
      description: "Test description",
      descriptionHtml: "<p>Test description</p>",
      tags: ["tag1", "tag2"],
      audience: ["adults"],
      softSkills: ["communication"],
      requirements: ["requirement1"],
      romeSkills: ["skill1"],
      organizationClientId: "org123",
      organizationUrl: "https://org.com",
      organizationName: "Test Org",
      organizationRNA: "W123456789",
      organizationSiren: "123456789",
      organizationSiret: "12345678901234",
      organizationType: "Association",
      organizationLogo: "org-logo.png",
      organizationDescription: "Test org description",
      organizationFullAddress: "123 Test St",
      organizationDepartment: "75",
      organizationPostCode: "75001",
      organizationCity: "Paris",
      organizationStatusJuridique: "Association",
      organizationBeneficiaries: ["beneficiary1"],
      organizationActions: ["action1"],
      organizationReseaux: ["network1"],
      organizationId: "org-id-123",
      organizationNameVerified: "Test Org Verified",
      organizationRNAVerified: "W123456789",
      organizationSirenVerified: "123456789",
      organizationSiretVerified: "12345678901234",
      organizationAddressVerified: "123 Test St",
      organizationCityVerified: "Paris",
      organizationPostalCodeVerified: "75001",
      organizationDepartmentCodeVerified: "75",
      organizationDepartmentNameVerified: "Paris",
      organizationRegionVerified: "Île-de-France",
      organisationIsRUP: false,
      organizationVerificationStatus: "VERIFIED",
      associationId: "assoc123",
      associationName: "Test Association",
      associationSiret: "12345678901234",
      associationSiren: "123456789",
      associationRNA: "W123456789",
      associationSources: ["source1"],
      associationReseaux: ["network1"],
      associationLogo: "assoc-logo.png",
      associationAddress: "123 Assoc St",
      associationCity: "Paris",
      associationPostalCode: "75001",
      associationDepartmentCode: "75",
      associationDepartmentName: "Paris",
      associationRegion: "Île-de-France",
      reducedMobilityAccessible: "yes",
      closeToTransport: "yes",
      openToMinors: "no",
      schedule: "Flexible",
      postedAt: new Date("2023-01-01"),
      startAt: new Date("2023-02-01"),
      priority: "HIGH",
      metadata: "test metadata",
      endAt: new Date("2023-03-01"),
      duration: 30,
      address: "123 Test St",
      postalCode: "75001",
      departmentName: "Paris",
      departmentCode: "75",
      city: "Paris",
      region: "Île-de-France",
      country: "France",
      geolocStatus: "ENRICHED_BY_API",
      rnaStatus: "ENRICHED",
      places: 5,
      placesStatus: "GIVEN_BY_PARTNER",
      domain: "education",
      domainOriginal: "education",
      domainLogo: "domain-logo.png",
      type: "volunteering",
      activity: "teaching",
      location: {
        lat: 48.8566,
        lon: 2.3522,
      },
      addresses: [
        {
          street: "123 Test St",
          postalCode: "75001",
          departmentName: "Paris",
          departmentCode: "75",
          city: "Paris",
          region: "Île-de-France",
          country: "France",
          location: {
            lat: 48.8566,
            lon: 2.3522,
          },
          geolocStatus: "ENRICHED_BY_API",
        } as AddressItem,
        {
          street: "456 Different St",
          postalCode: "69000",
          departmentName: "Rhône",
          departmentCode: "69",
          city: "Lyon",
          region: "Auvergne-Rhône-Alpes",
          country: "France",
          location: {
            lat: 45.764043,
            lon: 4.835659,
          },
          geolocStatus: "ENRICHED_BY_API",
        } as AddressItem,
      ],
      snu: false,
      snuPlaces: 0,
      remote: "no",
      deleted: false,
    }) as Mission;

  it("should return null when missions are identical", () => {
    const mission1 = createBaseMission();
    const mission2 = createBaseMission();

    const changes = getMissionChanges(mission1, mission2);

    expect(changes).toBeNull();
  });

  it("should detect string field changes", () => {
    const mission1 = createBaseMission();
    const mission2 = { ...createBaseMission(), title: "Updated Title" };

    const changes = getMissionChanges(mission1, mission2);

    expect(changes).toEqual({
      title: {
        previous: "Test Mission",
        current: "Updated Title",
      },
    });
  });

  it("should detect multiple string field changes", () => {
    const mission1 = createBaseMission();
    const mission2 = {
      ...createBaseMission(),
      title: "Updated Title",
      description: "Updated description",
    };

    const changes = getMissionChanges(mission1, mission2);

    expect(changes).toEqual({
      title: {
        previous: "Test Mission",
        current: "Updated Title",
      },
      description: {
        previous: "Test description",
        current: "Updated description",
      },
    });
  });

  it("should detect date field changes", () => {
    const mission1 = createBaseMission();
    const mission2 = {
      ...createBaseMission(),
      startAt: new Date("2023-03-01"),
    };

    const changes = getMissionChanges(mission1, mission2);

    expect(changes).toEqual({
      startAt: {
        previous: new Date("2023-02-01"),
        current: new Date("2023-03-01"),
      },
    });
  });

  it("should detect array field changes", () => {
    const mission1 = createBaseMission();
    const mission2 = {
      ...createBaseMission(),
      tags: ["tag1", "tag3"],
    };

    const changes = getMissionChanges(mission1, mission2);

    expect(changes).toEqual({
      tags: {
        previous: ["tag1", "tag2"],
        current: ["tag1", "tag3"],
      },
    });
  });

  it("should detect when arrays have same elements but different order", () => {
    const mission1 = createBaseMission();
    const mission2 = {
      ...createBaseMission(),
      tags: ["tag2", "tag1"], // Same elements, different order
    };

    const changes = getMissionChanges(mission1, mission2);

    expect(changes).toBeNull(); // Should be null because arrays are equivalent when sorted
  });

  it("should detect address changes when length differs", () => {
    const mission1 = createBaseMission();
    const mission2 = {
      ...createBaseMission(),
      addresses: [
        ...mission1.addresses,
        {
          street: "456 Another St",
          postalCode: "75002",
          departmentName: "Paris",
          departmentCode: "75",
          city: "Paris",
          region: "Île-de-France",
          country: "France",
          location: {
            lat: 48.8566,
            lon: 2.3522,
          },
          geolocStatus: "ENRICHED_BY_API",
        } as AddressItem,
      ],
    };

    const changes = getMissionChanges(mission1, mission2);

    expect(changes).toEqual({
      addresses: {
        previous: mission1.addresses,
        current: mission2.addresses,
      },
    });
  });

  it("should detect address content changes", () => {
    const mission1 = createBaseMission();
    const mission2 = {
      ...createBaseMission(),
      addresses: [
        {
          ...mission1.addresses[0],
          street: "456 Different St",
        },
      ],
    };

    const changes = getMissionChanges(mission1, mission2);

    expect(changes).toEqual({
      addresses: {
        previous: mission1.addresses,
        current: mission2.addresses,
      },
    });
  });

  it("should not detect address content changes when order is different", () => {
    const mission1 = createBaseMission();
    const mission2 = {
      ...createBaseMission(),
      addresses: [mission1.addresses[1], mission1.addresses[0]],
    };

    const changes = getMissionChanges(mission1, mission2);

    expect(changes).toBeNull();
  });

  it("should handle undefined and null values", () => {
    const mission1 = createBaseMission();
    const mission2 = {
      ...createBaseMission(),
      endAt: null,
      metadata: "",
    };

    const changes = getMissionChanges(mission1, mission2);

    expect(changes).toEqual({
      endAt: {
        previous: new Date("2023-03-01"),
        current: null,
      },
      metadata: {
        previous: "test metadata",
        current: "",
      },
    });
  });

  it("should handle date strings and Date objects equivalently", () => {
    const mission1 = createBaseMission();
    const mission2 = {
      ...createBaseMission(),
      startAt: "2023-02-01" as any, // Same date as string
    };

    const changes = getMissionChanges(mission1, mission2);

    expect(changes).toBeNull(); // Should be null because dates are equivalent
  });
});
