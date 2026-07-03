import { describe, expect, it } from "vitest";
import { getInternalUserFlagAction } from "../internal-user-flag";

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
