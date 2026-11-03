import { describe, expect, it } from "vitest";

import { decrypt, encrypt } from "@/utils/encryption";

describe("encryption", () => {
  it("decrypts what it encrypts", () => {
    expect(decrypt(encrypt("mon-token"))).toBe("mon-token");
  });

  it("never stores the value in clear and uses a random iv", () => {
    const first = encrypt("mon-token");
    expect(first).not.toContain("mon-token");
    expect(encrypt("mon-token")).not.toBe(first);
  });

  it("rejects a tampered value", () => {
    const [iv, authTag] = encrypt("mon-token").split(".");
    expect(() => decrypt([iv, authTag, Buffer.from("autre-token").toString("base64")].join("."))).toThrow();
  });
});
