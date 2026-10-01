import { describe, expect, it } from "vitest";
import { hashString, isValidEmail, serializeForInlineScript } from "../string";

describe("hashString", () => {
  it("retourne toujours le même hash pour la même chaîne", () => {
    expect(hashString("mission-123")).toBe(hashString("mission-123"));
  });

  it("retourne des hashes distincts pour des chaînes différentes", () => {
    expect(hashString("mission-a")).not.toBe(hashString("mission-b"));
  });
});

describe("serializeForInlineScript", () => {
  it("sérialise une valeur simple comme JSON.stringify", () => {
    expect(serializeForInlineScript("c4a9ce23692082d70af2b16d")).toBe('"c4a9ce23692082d70af2b16d"');
  });

  it("encode '<' en \\u003c pour neutraliser un breakout </script>", () => {
    const result = serializeForInlineScript("abc</script><!--");
    expect(result).not.toContain("<");
    expect(result).toBe('"abc\\u003c/script>\\u003c!--"');
  });
});

describe("isValidEmail", () => {
  it("accepte une adresse au format nom@domaine.extension", () => {
    expect(isValidEmail("nom@email.fr")).toBe(true);
    expect(isValidEmail("prenom.nom+tag@sous.domaine.gouv.fr")).toBe(true);
  });

  it("refuse une adresse sans @, sans domaine ou sans extension", () => {
    expect(isValidEmail("nom.email.fr")).toBe(false);
    expect(isValidEmail("nom@")).toBe(false);
    expect(isValidEmail("nom@email")).toBe(false);
    expect(isValidEmail("nom@email.f")).toBe(false);
    expect(isValidEmail("nom @email.fr")).toBe(false);
  });
});
