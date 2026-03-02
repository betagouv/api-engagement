import { createHash } from "crypto";

import { MissionAddress } from "@/types/mission";

/**
 * Compute a deterministic MD5 hash for a mission address based on its content.
 * Used to upsert addresses while preserving their UUIDs across re-imports.
 */
export const computeAddressHash = (address: Pick<MissionAddress, "street" | "city" | "postalCode" | "country" | "location">): string => {
  const parts = [address.street ?? "", address.city ?? "", address.postalCode ?? "", address.country ?? "", address.location?.lat?.toString() ?? "", address.location?.lon?.toString() ?? ""];
  return createHash("md5").update(parts.join("|")).digest("hex");
};
