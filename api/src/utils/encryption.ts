import crypto from "crypto";

import { ENCRYPTION_KEY } from "@/config";

// Chiffrement réversible (AES-256-GCM) des secrets qu'on doit renvoyer à un service tiers (ex. token API d'un partenaire).
// Un hash ne suffit pas : il faut pouvoir relire la valeur. Format stocké : "<iv>.<authTag>.<chiffré>" en base64.
export const encrypt = (value: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64")).join(".");
};

export const decrypt = (value: string): string => {
  const [iv, authTag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
};
