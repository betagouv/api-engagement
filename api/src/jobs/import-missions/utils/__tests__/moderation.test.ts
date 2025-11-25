import { beforeEach, describe, expect, it } from "vitest";
import { COUNTRIES } from "../../../../constants/countries";
import { DOMAINS } from "../../../../constants/domains";
import { Mission } from "../../../../types";
import { getModeration } from "../moderation";

describe("getModeration", () => {
  let mission: Partial<Mission>;

  beforeEach(() => {
    mission = {
      title: "Une mission valide",
      clientId: "test-client",
      description: "Une description valide.",
      applicationUrl: "http://example.com",
      country: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
      remote: "no",
      places: 5,
      domain: DOMAINS[Math.floor(Math.random() * DOMAINS.length)],
      organizationName: "Organisation Valide",
    };
  });

  it("should set statusCode to ACCEPTED for a valid mission", () => {
    getModeration(mission as Mission);
    expect(mission.statusCode).toBe("ACCEPTED");
    expect(mission.statusComment).toBe("");
  });

  it("should set status to REFUSED for missing title", () => {
    mission.title = "";
    getModeration(mission as Mission);
    expect(mission.statusCode).toBe("REFUSED");
    expect(mission.statusComment).toBe("Titre manquant");
  });

  it("should set status to REFUSED for title with encoding issue", () => {
    mission.title = "Titre avec un probl&#232;me";
    getModeration(mission as Mission);
    expect(mission.statusCode).toBe("REFUSED");
    expect(mission.statusComment).toBe("Problème d'encodage dans le titre");
  });

  it("should set status to REFUSED for a single-word title", () => {
    mission.title = "Titre";
    getModeration(mission as Mission);
    expect(mission.statusCode).toBe("REFUSED");
    expect(mission.statusComment).toBe("Le titre est trop court (1 seul mot)");
  });

  it("should set status to REFUSED for missing clientId", () => {
    delete mission.clientId;
    getModeration(mission as Mission);
    expect(mission.statusCode).toBe("REFUSED");
    expect(mission.statusComment).toBe("ClientId manquant");
  });

  it("should set status to REFUSED for missing description", () => {
    mission.description = "";
    getModeration(mission as Mission);
    expect(mission.statusCode).toBe("REFUSED");
    expect(mission.statusComment).toBe("Description manquante");
  });

  it("should set status to REFUSED for description with encoding issue", () => {
    mission.description = "Description avec un probl&#232;me";
    getModeration(mission as Mission);
    expect(mission.statusCode).toBe("REFUSED");
    expect(mission.statusComment).toBe("Problème d'encodage dans la description");
  });

  it("should truncate description and set status to REFUSED if it's too long", () => {
    mission.description = "a".repeat(20001);
    getModeration(mission as Mission);
    expect(mission.description?.length).toBe(20000);
    expect(mission.statusCode).toBe("REFUSED");
    expect(mission.statusComment).toBe("La description est trop longue (plus de 20000 caractères)");
  });

  it("should set status to REFUSED for missing applicationUrl", () => {
    mission.applicationUrl = "";
    getModeration(mission as Mission);
    expect(mission.statusCode).toBe("REFUSED");
    expect(mission.statusComment).toBe("URL de candidature manquant");
  });

  it("should set status to REFUSED for invalid country", () => {
    mission.country = "Pays Invalide";
    getModeration(mission as Mission);
    expect(mission.statusCode).toBe("REFUSED");
    expect(mission.statusComment).toBe('Pays non valide : "Pays Invalide"');
  });

  it("should set status to REFUSED for invalid remote value", () => {
    (mission as any).remote = "maybe";
    getModeration(mission as Mission);
    expect(mission.statusCode).toBe("REFUSED");
    expect(mission.statusComment).toBe("Valeur remote non valide (no, possible ou full)");
  });

  it("should set status to REFUSED for invalid places", () => {
    mission.places = 0;
    getModeration(mission as Mission);
    expect(mission.statusCode).toBe("REFUSED");
    expect(mission.statusComment).toBe("Nombre de places invalide (doit être supérieur à 0)");
  });

  it("should set status to REFUSED for invalid domain", () => {
    mission.domain = "Domaine Invalide";
    getModeration(mission as Mission);
    expect(mission.statusCode).toBe("REFUSED");
    expect(mission.statusComment).toBe('Domaine non valide : "Domaine Invalide"');
  });

  it("should set status to REFUSED for organizationName with encoding issue", () => {
    mission.organizationName = "Organisation avec un probl&#232;me";
    getModeration(mission as Mission);
    expect(mission.statusCode).toBe("REFUSED");
    expect(mission.statusComment).toBe("Problème d'encodage dans le nom de l'organisation");
  });

  it("should prioritize the first validation error", () => {
    mission.title = ""; // First error
    mission.description = ""; // Second error
    getModeration(mission as Mission);
    expect(mission.statusComment).toBe("Titre manquant");
  });

  it("should refuse mission when compensation amount is negative", () => {
    mission.compensationAmount = -10;
    getModeration(mission as Mission);
    expect(mission.statusComment).toBe("Montant de la compensation invalide (nombre positif attendu)");
  });

  it("should refuse mission when compensation unit is invalid", () => {
    mission.compensationUnit = "invalid" as any;
    getModeration(mission as Mission);
    expect(mission.statusComment).toBe("Unité de compensation invalide (hour, day, month, year)");
  });
});
