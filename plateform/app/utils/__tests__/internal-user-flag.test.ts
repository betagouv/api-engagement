import { describe, expect, it } from "vitest";
import { INTERNAL_USER_FLAG_STORAGE_KEY, getInternalUserFlagAction, isInternalUserFlagEnabled, persistInternalUserFlagAction } from "../internal-user-flag";

describe("getInternalUserFlagAction", () => {
  it("active le flag avec internal=1", () => {
    expect(getInternalUserFlagAction("?internal=1")).toBe("enable");
  });

  it("désactive le flag avec internal=0", () => {
    expect(getInternalUserFlagAction("?internal=0")).toBe("disable");
  });

  it("ne fait rien sans paramètre internal", () => {
    expect(getInternalUserFlagAction("?utm_source=test")).toBe("none");
    expect(getInternalUserFlagAction("")).toBe("none");
  });

  it("ignore les valeurs non supportées", () => {
    expect(getInternalUserFlagAction("?internal=true")).toBe("none");
    expect(getInternalUserFlagAction("?internal=2")).toBe("none");
    expect(getInternalUserFlagAction("?internal=")).toBe("none");
  });

  it("utilise la première valeur quand internal est présent plusieurs fois", () => {
    expect(getInternalUserFlagAction("?internal=1&internal=0")).toBe("enable");
    expect(getInternalUserFlagAction("?internal=0&internal=1")).toBe("disable");
  });

  it("accepte une instance URLSearchParams", () => {
    expect(getInternalUserFlagAction(new URLSearchParams("internal=1"))).toBe("enable");
  });
});

describe("persistInternalUserFlagAction", () => {
  it("persiste le flag quand il est activé", () => {
    const storage = new Map<string, string>();

    persistInternalUserFlagAction(
      "enable",
      {
        getItem: (key) => storage.get(key) ?? null,
        removeItem: (key) => storage.delete(key),
        setItem: (key, value) => storage.set(key, value),
      },
    );

    expect(storage.get(INTERNAL_USER_FLAG_STORAGE_KEY)).toBe("1");
  });

  it("retire le flag quand il est désactivé", () => {
    const storage = new Map<string, string>([[INTERNAL_USER_FLAG_STORAGE_KEY, "1"]]);

    persistInternalUserFlagAction(
      "disable",
      {
        getItem: (key) => storage.get(key) ?? null,
        removeItem: (key) => storage.delete(key),
        setItem: (key, value) => storage.set(key, value),
      },
    );

    expect(storage.has(INTERNAL_USER_FLAG_STORAGE_KEY)).toBe(false);
  });

  it("ne modifie rien sans action", () => {
    const storage = new Map<string, string>([[INTERNAL_USER_FLAG_STORAGE_KEY, "1"]]);

    persistInternalUserFlagAction(
      "none",
      {
        getItem: (key) => storage.get(key) ?? null,
        removeItem: (key) => storage.delete(key),
        setItem: (key, value) => storage.set(key, value),
      },
    );

    expect(storage.get(INTERNAL_USER_FLAG_STORAGE_KEY)).toBe("1");
  });
});

describe("isInternalUserFlagEnabled", () => {
  it("retourne true sur une URL d'activation", () => {
    expect(isInternalUserFlagEnabled("?internal=1", { getItem: () => null })).toBe(true);
  });

  it("retourne false sur une URL de désactivation", () => {
    expect(isInternalUserFlagEnabled("?internal=0", { getItem: () => "1" })).toBe(false);
  });

  it("lit le stockage local sans paramètre internal", () => {
    expect(isInternalUserFlagEnabled("", { getItem: () => "1" })).toBe(true);
    expect(isInternalUserFlagEnabled("", { getItem: () => null })).toBe(false);
  });
});
