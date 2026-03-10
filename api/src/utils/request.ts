import { Request } from "express";
import geoip from "geoip-lite";
import { isbot } from "isbot";
import hash from "object-hash";
import { ENV } from "@/config";

export const geoFromIp = async (req: Request) => {
  const ip = req.headers["x-forwarded-for"] || req.ip;
  if (!ip || ip === "::1" || ip === "127.0.0.1") {
    return;
  }
  const geo = geoip.lookup(Array.isArray(ip) ? ip[0] : ip);
  if (!geo) {
    return;
  }
  return { city: geo.city, country: geo.country, region: geo.region, ll: geo.ll };
};

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
