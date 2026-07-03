export type InternalUserFlagAction = "enable" | "disable" | "none";

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
