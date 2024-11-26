import { Request } from "express";
import geoip from "geoip-lite";
import { isbot } from "isbot";
import hash from "object-hash";
import { ENV } from "./config";
import { EsQuery } from "./types";

export const slugify = (value: string) => {
  const a = "àáäâãåăæçèéëêǵḧìíïîḿńǹñòóöôœṕŕßśșțùúüûǘẃẍÿź·/_,:;";
  const b = "aaaaaaaaceeeeghiiiimnnnoooooprssstuuuuuwxyz------";
  const p = new RegExp(a.split("").join("|"), "g");
  return value
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(p, (c) => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, "-and-") // Replace & with 'and'
    .replace(/[^\w\-]+/g, "") // Remove all non-word characters
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
};

export const geoFromIp = async (req: Request) => {
  const ip = req.headers["x-forwarded-for"] || req.ip;
  if (!ip || ip === "::1" || ip === "127.0.0.1") return;
  const geo = geoip.lookup(Array.isArray(ip) ? ip[0] : ip);
  if (!geo) return;
  return { city: geo.city, country: geo.country, region: geo.region, ll: geo.ll };
};

export const buildTerm = (field: string, value: string) => ({ term: { [`${field}.keyword`]: value } });
export const buildMatchPrefix = (field: string, value: string) => {
  if (value.trim().split(" ").length > 1) return { match_phrase_prefix: { [field]: { query: value.trim(), analyzer: "french", max_expansions: 3 } } };
  return { match_bool_prefix: { [field]: { query: value.trim(), analyzer: "french", max_expansions: 3 } } };
};

export const buildQuery = (rules: { field: string; operator: string; value: string; combinator: "and" | "or" }[]) => {
  const q = { bool: { must: [], must_not: [], should: [], filter: [] } } as EsQuery;
  rules.forEach((r: { field: string; operator: string; value: string; combinator: string }, i: number) => {
    if (!r.field || !r.operator || (!r.value && r.operator !== "exists" && r.operator !== "does_not_exist")) return;
    if (i === 0 && rules.length > 1) r.combinator = rules[1].combinator;

    if (r.combinator === "and") {
      if (r.operator === "is") q.bool.must.push(buildTerm(r.field, r.value));
      else if (r.operator === "is_not") q.bool.must_not.push(buildTerm(r.field, r.value));
      else if (r.operator === "contains") q.bool.must.push(buildMatchPrefix(r.field, r.value));
      else if (r.operator === "does_not_contain") q.bool.must_not.push(buildMatchPrefix(r.field, r.value));
      else if (r.operator === "is_greater_than") q.bool.must.push({ range: { [r.field]: { gt: r.value } } });
      else if (r.operator === "is_less_than") q.bool.must.push({ range: { [r.field]: { lt: r.value } } });
      else if (r.operator === "exists") q.bool.must.push({ exists: { field: r.field } });
      else if (r.operator === "does_not_exist") q.bool.must_not.push({ exists: { field: r.field } });
      else if (r.operator === "starts_with") q.bool.must.push(buildMatchPrefix(r.field, r.value));
    } else if (r.combinator === "or") {
      if (r.operator === "is") q.bool.should.push(buildTerm(r.field, r.value));
      else if (r.operator === "is_not") q.bool.should.push({ bool: { must_not: buildTerm(r.field, r.value) } });
      else if (r.operator === "contains") q.bool.should.push(buildMatchPrefix(r.field, r.value));
      else if (r.operator === "does_not_contain") q.bool.should.push({ bool: { must_not: buildMatchPrefix(r.field, r.value) } });
      else if (r.operator === "is_greater_than") q.bool.should.push({ range: { [r.field]: { gt: r.value } } });
      else if (r.operator === "is_less_than") q.bool.should.push({ range: { [r.field]: { lt: r.value } } });
      else if (r.operator === "exists") q.bool.should.push({ exists: { field: r.field } });
      else if (r.operator === "does_not_exist") q.bool.should.push({ bool: { must_not: { exists: { field: r.field } } } });
      else if (r.operator === "starts_with") q.bool.should.push(buildMatchPrefix(r.field, r.value));
    }
  });

  if (q.bool.should.length > 1) q.bool.minimum_should_match = 1;
  return q;
};

export const diacriticSensitiveRegex = (string: string = "") => {
  return string
    .replace(/a/g, "[a,á,à,ä,â]")
    .replace(/A/g, "[A,a,á,à,ä,â]")
    .replace(/e/g, "[e,é,ë,è]")
    .replace(/E/g, "[E,e,é,ë,è]")
    .replace(/i/g, "[i,í,ï,ì]")
    .replace(/I/g, "[I,i,í,ï,ì]")
    .replace(/o/g, "[o,ó,ö,ò]")
    .replace(/O/g, "[O,o,ó,ö,ò]")
    .replace(/u/g, "[u,ü,ú,ù]")
    .replace(/U/g, "[U,u,ü,ú,ù]");
};

export const buildQueryMongo = (rules: { field: string; operator: string; value: string; combinator: "and" | "or" }[]) => {
  const q = { $and: [], $or: [] } as { [key: string]: any };
  rules.forEach((r: { field: string; operator: string; value: string; combinator: string }, i: number) => {
    if (!r.field || !r.operator || (!r.value && r.operator !== "exists" && r.operator !== "does_not_exist")) return;
    if (i === 0 && rules.length > 1) r.combinator = rules[1].combinator;

    if (r.combinator === "and") {
      if (r.operator === "is") q.$and.push({ [r.field]: r.value });
      else if (r.operator === "is_not") q.$and.push({ [r.field]: { $ne: r.value } });
      else if (r.operator === "contains") q.$and.push({ [r.field]: { $regex: diacriticSensitiveRegex(r.value), $options: "i" } });
      else if (r.operator === "does_not_contain") q.$and.push({ [r.field]: { $not: { $regex: diacriticSensitiveRegex(r.value), $options: "i" } } });
      else if (r.operator === "is_greater_than") q.$and.push({ [r.field]: { $gt: r.value } });
      else if (r.operator === "is_less_than") q.$and.push({ [r.field]: { $lt: r.value } });
      else if (r.operator === "exists") q.$and.push({ [r.field]: { $exists: true } });
      else if (r.operator === "does_not_exist") q.$and.push({ [r.field]: { $exists: false } });
      else if (r.operator === "starts_with") q.$and.push({ [r.field]: { $regex: `^${diacriticSensitiveRegex(r.value)}`, $options: "i" } });
    } else if (r.combinator === "or") {
      if (r.operator === "is") q.$or.push({ [r.field]: r.value });
      else if (r.operator === "is_not") q.$or.push({ [r.field]: { $ne: r.value } });
      else if (r.operator === "contains") q.$or.push({ [r.field]: { $regex: diacriticSensitiveRegex(r.value), $options: "i" } });
      else if (r.operator === "does_not_contain") q.$or.push({ [r.field]: { $not: { $regex: diacriticSensitiveRegex(r.value), $options: "i" } } });
      else if (r.operator === "is_greater_than") q.$or.push({ [r.field]: { $gt: r.value } });
      else if (r.operator === "is_less_than") q.$or.push({ [r.field]: { $lt: r.value } });
      else if (r.operator === "exists") q.$or.push({ [r.field]: { $exists: true } });
      else if (r.operator === "does_not_exist") q.$or.push({ [r.field]: { $exists: false } });
      else if (r.operator === "starts_with") q.$or.push({ [r.field]: { $regex: `^${diacriticSensitiveRegex(r.value)}`, $options: "i" } });
    }
  });

  return q;
};

export const EARTH_RADIUS = 6371; // Radius of the Earth in kilometers

export const getDistanceKm = (value: string) => {
  const distance = parseInt(value);
  if (value.endsWith("km") || !value.endsWith("m")) return distance;
  return distance ? distance / 1000 : 50;
};

export const degreesToRadians = (degrees: number) => degrees * (Math.PI / 180);
export const getDistanceFromLatLonInKm = (lat1?: number, lon1?: number, lat2?: number, lon2?: number) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return undefined;
  const r = EARTH_RADIUS; // Radius of the Earth in kilometers
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return r * c; // Distance in kilometers
};

export const identify = (req: Request) => {
  const userAgent = req.get("user-agent");

  if (isbot(userAgent) && ENV !== "development") return null;

  const ip = req.ip;
  const referer = req.header("referer") || "not_defined";
  const user = hash([ip, referer, userAgent]);
  return { user, userAgent, referer: referer.includes("?") ? referer.split("?")[0] : referer };
};
