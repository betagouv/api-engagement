import { ENV } from "@/config";
import { Request } from "express";
import { isbot } from "isbot";
import hash from "object-hash";

export const identify = (req: Request) => {
  const userAgent = req.get("user-agent");

  if (isbot(userAgent) && ENV !== "development") {
    return null;
  }

  const ip = req.ip;
  const referer = req.get("referer") || "not_defined";
  const user = hash([ip, referer, userAgent]);
  return { user, userAgent, referer: referer.includes("?") ? referer.split("?")[0] : referer };
};
