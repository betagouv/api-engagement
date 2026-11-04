import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  computeAge,
  DEMARCHES_SIMPLIFIEES_BASE_URL,
  detectCandidateFields,
  DossierChamp,
  extractCandidateAttributes,
  extractDemarcheSlug,
  resolveCandidateFields,
} from "@/services/demarches-simplifiees/utils";

describe("extractDemarcheSlug", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("returns the slug for a demarche hosted on the configured instance", () => {
    expect(extractDemarcheSlug(`${DEMARCHES_SIMPLIFIEES_BASE_URL}/commencer/ma-demarche`)).toBe("ma-demarche");
    expect(extractDemarcheSlug(`${DEMARCHES_SIMPLIFIEES_BASE_URL}/commencer/ma-demarche?utm_source=test`)).toBe("ma-demarche");
    expect(extractDemarcheSlug(`${DEMARCHES_SIMPLIFIEES_BASE_URL}/commencer/ma-demarche#section`)).toBe("ma-demarche");
  });

  it("returns the slug for a demarche on the legacy domain of the DINUM instance", () => {
    expect(extractDemarcheSlug("https://www.demarches-simplifiees.fr/commencer/ma-demarche")).toBe("ma-demarche");
  });

  it("returns null for a /commencer/ path hosted on another instance", () => {
    expect(extractDemarcheSlug("https://evil.example.com/commencer/ma-demarche")).toBeNull();
  });

  it("returns null when the path is not a demarche", () => {
    expect(extractDemarcheSlug(`${DEMARCHES_SIMPLIFIEES_BASE_URL}/commencer`)).toBeNull();
    expect(extractDemarcheSlug(`${DEMARCHES_SIMPLIFIEES_BASE_URL}/autre/commencer/ma-demarche`)).toBeNull();
    expect(extractDemarcheSlug(`${DEMARCHES_SIMPLIFIEES_BASE_URL}/dossiers/12345`)).toBeNull();
  });

  it("returns null for empty and invalid urls", () => {
    expect(extractDemarcheSlug(null)).toBeNull();
    expect(extractDemarcheSlug(undefined)).toBeNull();
    expect(extractDemarcheSlug("")).toBeNull();
    expect(extractDemarcheSlug("pas-une-url")).toBeNull();
  });
});

describe("detectCandidateFields", () => {
  it("detects fields by DN champ type", () => {
    const descriptors = [
      { __typename: "TextChampDescriptor", label: "Nom" },
      { __typename: "DateChampDescriptor", label: "Date de votre arrivée" },
      { __typename: "DateChampDescriptor", label: "Votre date", birthdate: true },
      { __typename: "PaysChampDescriptor", label: "Nationalité" },
      { __typename: "CommuneChampDescriptor", label: "Commune de résidence" },
    ];
    expect(detectCandidateFields(descriptors)).toEqual({
      BIRTH_DATE: "Votre date",
      COUNTRY: "Nationalité",
      POSTAL_CODE: "Commune de résidence",
    });
  });

  it("falls back on label keywords", () => {
    const descriptors = [
      { __typename: "TextChampDescriptor", label: "Lieu de naissance" },
      { __typename: "TextChampDescriptor", label: "Date de naissance" },
      { __typename: "TextChampDescriptor", label: "Pays de résidence" },
      { __typename: "AddressChampDescriptor", label: "Adresse" },
      { __typename: "TextChampDescriptor", label: "Code postal" },
    ];
    expect(detectCandidateFields(descriptors)).toEqual({
      BIRTH_DATE: "Date de naissance",
      COUNTRY: "Pays de résidence",
      POSTAL_CODE: "Code postal",
    });
  });

  it("ignores birth place and birth name champs", () => {
    const descriptors = [
      { __typename: "TextChampDescriptor", label: "Nom de naissance du candidat" },
      { __typename: "DateChampDescriptor", label: "Date de naissance" },
      { __typename: "CommuneChampDescriptor", label: "Lieu de naissance" },
      { __typename: "PaysChampDescriptor", label: "Pays de naissance" },
      { __typename: "CommuneChampDescriptor", label: "Ville de résidence" },
    ];
    expect(detectCandidateFields(descriptors)).toEqual({
      BIRTH_DATE: "Date de naissance",
      COUNTRY: "Pays de naissance",
      POSTAL_CODE: "Ville de résidence",
    });
  });

  it("falls back on an age champ when there is no birth date", () => {
    const descriptors = [
      { __typename: "DropDownListChampDescriptor", label: "Votre engagement" },
      { __typename: "IntegerNumberChampDescriptor", label: "Âge" },
    ];
    expect(detectCandidateFields(descriptors).BIRTH_DATE).toBe("Âge");
  });

  it("returns null when nothing matches", () => {
    expect(detectCandidateFields([{ __typename: "TextChampDescriptor", label: "Motivation" }])).toEqual({
      BIRTH_DATE: null,
      COUNTRY: null,
      POSTAL_CODE: null,
    });
  });
});

describe("resolveCandidateFields", () => {
  const descriptors = [
    { __typename: "DateChampDescriptor", label: "Date de naissance", birthdate: true },
    { __typename: "TextChampDescriptor", label: "Code postal de résidence" },
    { __typename: "PaysChampDescriptor", label: "Pays" },
  ];

  it("keeps configured fields found on the démarche and detects the others", () => {
    const { fields, missingFields } = resolveCandidateFields({ BIRTH_DATE: "date de naissance", COUNTRY: null, POSTAL_CODE: "Code postal de résidence" }, descriptors);
    expect(fields).toEqual({ BIRTH_DATE: "date de naissance", COUNTRY: "Pays", POSTAL_CODE: "Code postal de résidence" });
    expect(missingFields).toEqual([]);
  });

  it("reports configured fields missing from the démarche and falls back on detection", () => {
    const { fields, missingFields } = resolveCandidateFields({ BIRTH_DATE: "Né(e) le", COUNTRY: null, POSTAL_CODE: null }, descriptors);
    expect(fields.BIRTH_DATE).toBe("Date de naissance");
    expect(missingFields).toEqual(["Né(e) le"]);
  });
});

describe("computeAge", () => {
  it("counts full years at the reference date", () => {
    expect(computeAge(new Date("1990-06-15"), new Date("2026-06-14"))).toBe(35);
    expect(computeAge(new Date("1990-06-15"), new Date("2026-06-15"))).toBe(36);
  });
});

describe("extractCandidateAttributes", () => {
  const fields = { BIRTH_DATE: "Date de naissance", COUNTRY: "Pays", POSTAL_CODE: "Adresse" };
  const referenceDate = new Date("2026-10-27");

  it("builds candidate attributes from typed champs and the demandeur civilité", () => {
    const champs: DossierChamp[] = [
      { __typename: "DateChamp", label: "Date de naissance", stringValue: "15 juin 1990", date: "1990-06-15" },
      { __typename: "PaysChamp", label: "Pays", stringValue: "France", pays: { code: "FR" } },
      { __typename: "AddressChamp", label: "Adresse", stringValue: "1 rue de la Paix 59560 Comines", address: { postalCode: "59560", countryCode: "FR" } },
    ];
    expect(extractCandidateAttributes({ champs, demandeur: { civilite: "M", dateDeNaissance: null } }, fields, referenceDate)).toEqual({
      candidateAge: "36",
      candidateGender: "monsieur",
      candidateCountry: "FR",
      candidatePostalCode: "59560",
    });
  });

  it("falls back on stringValue for text champs", () => {
    const champs: DossierChamp[] = [
      { __typename: "TextChamp", label: "Date de naissance", stringValue: "01/11/2008" },
      { __typename: "TextChamp", label: "Adresse", stringValue: "Bordeaux 33000" },
    ];
    expect(extractCandidateAttributes({ champs, demandeur: { civilite: "Mme" } }, fields, referenceDate)).toEqual({
      candidateAge: "17",
      candidateGender: "madame",
      candidatePostalCode: "33000",
    });
  });

  it("reads the declared age from an age champ", () => {
    const champs: DossierChamp[] = [{ __typename: "IntegerNumberChamp", label: "Âge", stringValue: "23" }];
    expect(extractCandidateAttributes({ champs, demandeur: null }, { ...fields, BIRTH_DATE: "Âge" }, referenceDate)).toEqual({ candidateAge: "23" });
  });

  it("falls back on the demandeur birth date when no champ is found", () => {
    expect(extractCandidateAttributes({ champs: [], demandeur: { civilite: null, dateDeNaissance: "2000-01-01" } }, fields, referenceDate)).toEqual({ candidateAge: "26" });
  });

  it("returns no attribute when nothing is filled", () => {
    const champs: DossierChamp[] = [{ __typename: "DateChamp", label: "Date de naissance", stringValue: null, date: null }];
    expect(extractCandidateAttributes({ champs, demandeur: null }, fields, referenceDate)).toEqual({});
  });
});
