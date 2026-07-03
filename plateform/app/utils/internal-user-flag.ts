export type InternalUserFlagAction = "enable" | "disable" | "none";

export const INTERNAL_USER_FLAG_STORAGE_KEY = "api-engagement.internal_user";

export function getInternalUserFlagAction(search: string | URLSearchParams): InternalUserFlagAction {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;

  switch (params.get("internal")) {
    case "1":
      return "enable";
    case "0":
      return "disable";
    default:
      return "none";
  }
}

export function persistInternalUserFlagAction(action: InternalUserFlagAction, storage: Pick<Storage, "getItem" | "removeItem" | "setItem">): void {
  if (action === "enable") {
    storage.setItem(INTERNAL_USER_FLAG_STORAGE_KEY, "1");
    return;
  }

  if (action === "disable") {
    storage.removeItem(INTERNAL_USER_FLAG_STORAGE_KEY);
  }
}

export function isInternalUserFlagEnabled(search: string | URLSearchParams, storage: Pick<Storage, "getItem">): boolean {
  const action = getInternalUserFlagAction(search);
  if (action === "enable") return true;
  if (action === "disable") return false;

  return storage.getItem(INTERNAL_USER_FLAG_STORAGE_KEY) === "1";
}
