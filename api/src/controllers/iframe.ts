import cors from "cors";
import { NextFunction, Request, Response, Router } from "express";
import zod from "zod";

import { ENV, JVA_ID } from "../config";
import { captureMessage, INVALID_PARAMS, INVALID_QUERY, NOT_FOUND } from "../error";
import MissionModel from "../models/mission";
import RequestWidget from "../models/request-widget";
import WidgetModel from "../models/widget";
import { Mission, Widget } from "../types";
import { buildQueryMongo, EARTH_RADIUS, getDistanceKm, isValidObjectId } from "../utils";

const router = Router();

router.get("/widget", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = zod
      .object({
        id: zod.string().optional(),
        name: zod.string().optional(),
      })
      .safeParse(req.query);

    if (!query.success) return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });

    if (!query.data.id && !query.data.name) return res.status(400).send({ ok: false, code: INVALID_QUERY, message: "Missing id or name" });

    if (query.data.id) {
      if (query.data.id && query.data.id.length > 24) query.data.id = query.data.id.slice(0, 24);
      if (!isValidObjectId(query.data.id)) return res.status(400).send({ ok: false, code: INVALID_QUERY, message: "Invalid id" });

      const widget = await WidgetModel.findById(query.data.id);
      if (!widget) return res.status(404).send({ ok: false, code: NOT_FOUND });
      return res.status(200).send({ ok: true, data: widget });
    } else {
      const widget = await WidgetModel.findOne({ name: query.data.name });
      if (!widget) return res.status(404).send({ ok: false, code: NOT_FOUND });
      return res.status(200).send({ ok: true, data: widget });
    }
  } catch (error) {
    next(error);
  }
});

const AGGS_KEYS = {
  remote: "remote",
  domain: "domain",
  organization: "organizationName",
  department: "departmentName",
  schedule: "schedule",
  action: "organizationActions",
  beneficiary: "organizationBeneficiaries",
  minor: "openToMinors",
  country: "country",
  accessibility: ["reducedMobilityAccessible", "closeToTransport"],
} as { [key: string]: string | string[] };

router.get("/:id/search", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string().regex(/^[0-9a-fA-F]{24}$/),
      })
      .safeParse(req.params);

    const query = zod
      .object({
        accessibility: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        action: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        beneficiary: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        city: zod.string().optional(), // Not used, only for stats
        country: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        department: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        domain: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        duration: zod.coerce.number().int().min(0).optional(),
        from: zod.coerce.number().int().min(0).default(0),
        lat: zod.coerce.number().min(-90).max(90).optional(),
        location: zod.string().optional(),
        lon: zod.coerce.number().min(-180).max(180).optional(),
        minor: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        organization: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        remote: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        schedule: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        search: zod.string().optional(),
        size: zod.coerce.number().int().min(0).default(25),
        start: zod.coerce.date().optional(),
      })
      .passthrough()
      .safeParse(req.query);

    if (!params.success) {
      captureMessage(`[Iframe Widget] Invalid params`, JSON.stringify(params.error, null, 2));
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }
    if (!query.success) {
      captureMessage(`[Iframe Widget] Invalid query`, JSON.stringify(query.error, null, 2));
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    const widget = await WidgetModel.findById(params.data.id);
    if (!widget) {
      captureMessage(`[Iframe Widget] Widget not found`, JSON.stringify(params.data, null, 2));
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const where = {
      ...buildQueryMongo(widget.rules),
      statusCode: "ACCEPTED",
      deleted: false,
    } as { [key: string]: any };

    if (widget.jvaModeration) {
      const $or = [] as { [key: string]: any }[];
      if (widget.publishers.includes(JVA_ID)) $or.push({ publisherId: JVA_ID });
      widget.publishers.filter((p) => p !== JVA_ID).forEach((p) => $or.push({ publisherId: p, [`moderation_${JVA_ID}_status`]: "ACCEPTED" }));
      if ($or.length) where.$and.push({ $or });
    } else {
      const $or = [] as { [key: string]: any }[];
      widget.publishers.forEach((p) => $or.push({ publisherId: p }));
      if ($or.length) where.$and.push({ $or });
    }

    const whereLocation = buildLocationQuery(widget, query.data.lon, query.data.lat, query.data.remote);
    if (whereLocation["addresses.geoPoint"]) where["addresses.geoPoint"] = whereLocation["addresses.geoPoint"];
    if (whereLocation.$and) where.$and.push(whereLocation.$and);
    if (whereLocation.remote) where.remote = whereLocation.remote;

    if (query.data.domain) where.domain = Array.isArray(query.data.domain) ? { $in: query.data.domain } : query.data.domain;

    if (query.data.department) {
      if (Array.isArray(query.data.department) && query.data.department.includes("none")) {
        where.departmentName = { $in: [...query.data.department, "", null] };
      } else if (Array.isArray(query.data.department)) {
        where.departmentName = { $in: query.data.department };
      } else if (query.data.department === "none") {
        where.departmentName = { $in: ["", null] };
      } else {
        where.departmentName = query.data.department;
      }
    }

    if (query.data.organization) where.organizationName = Array.isArray(query.data.organization) ? { $in: query.data.organization } : query.data.organization;
    if (query.data.schedule) where.schedule = Array.isArray(query.data.schedule) ? { $in: query.data.schedule } : query.data.schedule;
    if (query.data.action) where.organizationActions = Array.isArray(query.data.action) ? { $in: query.data.action } : query.data.action;
    if (query.data.beneficiary) where.organizationBeneficiaries = Array.isArray(query.data.beneficiary) ? { $in: query.data.beneficiary } : query.data.beneficiary;

    if (query.data.country) {
      if (query.data.country === "FR" || (Array.isArray(query.data.country) && query.data.country.includes("FR") && !query.data.country.includes("NOT_FR"))) where.country = "FR";
      else if (query.data.country === "NOT_FR" || (Array.isArray(query.data.country) && query.data.country.includes("NOT_FR") && !query.data.country.includes("FR")))
        where.country = { $ne: "FR" };
    }

    if (query.data.start) where.startAt = { $gte: new Date(query.data.start).toISOString() };
    if (query.data.duration) where.duration = { $lte: query.data.duration };

    if (query.data.minor && query.data.minor.includes("yes") && !query.data.minor.includes("no")) where.openToMinors = "yes";
    else if (query.data.minor && query.data.minor.includes("no") && !query.data.minor.includes("yes")) where.openToMinors = "no";

    if (query.data.accessibility) {
      if (query.data.accessibility.includes("reducedMobilityAccessible")) where.reducedMobilityAccessible = "yes";
      if (query.data.accessibility.includes("closeToTransport")) where.closeToTransport = "yes";
    }

    if (!where.$and.length) delete where.$and;
    if (!where.$or.length) delete where.$or;

    const missions = await MissionModel.find(where)
      .sort({ remote: -1 })
      .limit(query.data.size)
      .skip(query.data.from)
      .select({
        _id: 1,
        title: 1,
        [`moderation_${JVA_ID}_title`]: 1,
        domain: 1,
        domainLogo: 1,
        organizationName: 1,
        remote: 1,
        city: 1,
        country: 1,
        postalCode: 1,
        places: 1,
        tags: 1,
        addresses: 1,
      })
      .lean();

    if (where["addresses.geoPoint"]) where["addresses.geoPoint"] = nearSphereToGeoWithin(where["addresses.geoPoint"].$nearSphere);

    const total = await MissionModel.countDocuments(where);

    const data = missions.map((e: Mission) => ({
      _id: e._id,
      title: e[`moderation_${JVA_ID}_title`] && widget.jvaModeration ? e[`moderation_${JVA_ID}_title`] : e.title,
      domain: e.domain,
      domainLogo: e.domainLogo,
      organizationName: e.organizationName,
      remote: e.remote,
      city: e.city,
      country: e.country,
      postalCode: e.postalCode,
      places: e.places,
      tags: e.tags,
      addresses: e.addresses,
    }));

    if (ENV !== "production") return res.status(200).send({ ok: true, data, total });
    const request = await RequestWidget.create({
      query: {
        ...query.data,
        distance: where["addresses.geoPoint"] ? "50km" : undefined,
        jvaModeration: widget.jvaModeration,
      },
      widgetId: params.data.id,
      total,
      missions: missions.map((h) => h._id.toString()),
    });
    return res.status(200).send({ ok: true, data, total, request: request._id });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/aggs", cors({ origin: "*" }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = zod
      .object({
        id: zod.string().regex(/^[0-9a-fA-F]{24}$/),
      })
      .safeParse(req.params);

    const query = zod
      .object({
        aggs: zod.array(zod.string()).default(["domain", "organization", "department", "schedule", "remote", "action", "beneficiary", "country", "minor", "accessibility"]),
        domain: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        organization: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        department: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        schedule: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        remote: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        action: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        beneficiary: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        country: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        minor: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        accessibility: zod.union([zod.string(), zod.array(zod.string())]).optional(),
        duration: zod.coerce.number().int().min(0).optional(),
        start: zod.coerce.date().optional(),
        search: zod.string().optional(),
        lat: zod.coerce.number().min(-90).max(90).optional(),
        lon: zod.coerce.number().min(-180).max(180).optional(),
        location: zod.string().optional(),
        size: zod.coerce.number().int().min(0).default(25),
        from: zod.coerce.number().int().min(0).default(0),
      })
      .passthrough()
      .safeParse(req.query);

    if (!params.success) {
      captureMessage(`[Iframe Widget] Invalid params`, JSON.stringify(params.error, null, 2));
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }
    if (!query.success) {
      captureMessage(`[Iframe Widget] Invalid query`, JSON.stringify(query.error, null, 2));
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    const widget = await WidgetModel.findById(params.data.id);
    if (!widget) {
      captureMessage(`[Iframe Widget] Widget not found`, JSON.stringify(params.data, null, 2));
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    // Filter over all facets
    const where = {
      ...buildQueryMongo(widget.rules),
      statusCode: "ACCEPTED",
      deleted: false,
    } as { [key: string]: any };

    if (query.data.start) where.startAt = { $gte: new Date(query.data.start).toISOString() };
    if (query.data.duration) where.duration = { $lte: query.data.duration };

    // Publisher
    if (widget.jvaModeration) {
      const $or = [] as { [key: string]: any }[];
      if (widget.publishers.includes(JVA_ID)) $or.push({ publisherId: JVA_ID });
      widget.publishers.filter((p) => p !== JVA_ID).forEach((p) => $or.push({ publisherId: p, [`moderation_${JVA_ID}_status`]: "ACCEPTED" }));
      if ($or.length) where.$and.push({ $or });
    } else {
      const $or = [] as { [key: string]: any }[];
      widget.publishers.forEach((p) => $or.push({ publisherId: p }));
      if ($or.length) where.$and.push({ $or });
    }

    // If location is set in widget, show only missions in this location
    const whereLocation = buildLocationAggs(widget, query.data.lon, query.data.lat);
    if (whereLocation["addresses.geoPoint"]) where["addresses.geoPoint"] = whereLocation["addresses.geoPoint"];
    if (whereLocation.$and) where.$and.push(whereLocation.$and);

    if (!where.$and.length) delete where.$and;
    if (!where.$or.length) delete where.$or;

    const $facet = {} as { [key: string]: any };
    query.data.aggs.forEach((key) => {
      const fieldKey = AGGS_KEYS[key];
      const filters = {} as { [key: string]: any };
      if (key !== "remote" && query.data.remote) filters.remote = buildRemoteQuery(query.data.remote);
      if (key !== "domain" && query.data.domain) filters.domain = buildQuery(query.data.domain);
      if (key !== "organization" && query.data.organization) filters.organizationName = buildQuery(query.data.organization);
      if (key !== "department" && query.data.department) filters.departmentName = buildDepartmentQuery(query.data.department);
      if (key !== "schedule" && query.data.schedule) filters.schedule = buildQuery(query.data.schedule);
      if (key !== "action" && query.data.action) filters.organizationActions = buildQuery(query.data.action);
      if (key !== "beneficiary" && query.data.beneficiary) filters.organizationBeneficiaries = buildQuery(query.data.beneficiary);
      if (key !== "country" && query.data.country) filters.country = buildCountryQuery(query.data.country);
      if (key !== "minor" && query.data.minor) filters.openToMinors = buildYesNoQuery(query.data.minor);
      if (key !== "accessibility" && query.data.accessibility) filters.reducedMobilityAccessible = buildAccessibilityQuery(query.data.accessibility);

      if (key === "accessibility") {
        $facet[key] = [
          { $match: filters },
          {
            $group: {
              _id: null,
              reducedMobilityAccessible: { $sum: { $cond: [{ $eq: ["$reducedMobilityAccessible", "yes"] }, 1, 0] } },
              closeToTransport: { $sum: { $cond: [{ $eq: ["$closeToTransport", "yes"] }, 1, 0] } },
            },
          },
        ];
      } else if (key === "beneficiary" || key === "action") {
        $facet[key] = [{ $match: filters }, { $unwind: `$${fieldKey}` }, { $group: { _id: `$${fieldKey}`, count: { $sum: 1 } } }, { $sort: { count: -1 } }];
      } else {
        $facet[key] = [{ $match: filters }, { $group: { _id: `$${fieldKey}`, count: { $sum: 1 } } }, { $sort: { count: -1 } }];
      }
    });

    const facets = await MissionModel.aggregate([{ $match: where }, { $facet }]);

    const data = {} as { [key: string]: any };

    query.data.aggs.forEach((key) => {
      const fieldKey = AGGS_KEYS[key];
      if (Array.isArray(fieldKey)) {
        data[key] = [];
        fieldKey.forEach((k) => data[key].push({ key: k, doc_count: facets[0][key].length ? facets[0][key][0][k] || 0 : 0 }));
      } else {
        data[key] = facets[0][key].map((e: { _id: string; count: number }) => ({ key: e._id, doc_count: e.count }));
      }
    });

    return res.status(200).send({ ok: true, data });
  } catch (error) {
    next(error);
  }
});

const buildLocationQuery = (widget: Widget, lon: number | undefined, lat: number | undefined, remote: string | string[] | undefined) => {
  const where = {} as { [key: string]: any };
  if (widget.location && widget.location.lat && widget.location.lon) {
    const distance = getDistanceKm(widget.distance && widget.distance !== "Aucun" ? widget.distance : "50km");
    where["addresses.geoPoint"] = {
      $nearSphere: {
        $geometry: { type: "Point", coordinates: [widget.location.lon, widget.location.lat] },
        $maxDistance: distance * 1000,
      },
    };
  } else if (lat && lon) {
    const distance = getDistanceKm("50km");
    if (remote && remote.includes("no") && !remote.includes("yes")) {
      where.remote = "no";
      where["addresses.geoPoint"] = {
        $nearSphere: {
          $geometry: { type: "Point", coordinates: [lon, lat] },
          $maxDistance: distance * 1000,
        },
      };
    } else if (remote && remote.includes("yes") && !remote.includes("no")) {
      where.remote = "full";
    } else {
      where.$and = { $or: [{ "addresses.geoPoint": { $geoWithin: { $centerSphere: [[lon, lat], distance / EARTH_RADIUS] } } }, { remote: "full" }] };
    }
  } else {
    if (remote && remote.includes("yes") && !remote.includes("no")) {
      where.$and = { $or: [{ remote: "full" }, { remote: "possible" }] };
    }
    if (remote && remote.includes("no") && !remote.includes("yes")) {
      where.remote = "no";
    }
  }
  return where;
};

const buildLocationAggs = (widget: Widget, lon: number | undefined, lat: number | undefined) => {
  const where = {} as { [key: string]: any };

  if (widget.location && widget.location.lat && widget.location.lon) {
    const distance = getDistanceKm(widget.distance && widget.distance !== "Aucun" ? widget.distance : "50km");
    where["addresses.geoPoint"] = {
      $geoWithin: {
        $centerSphere: [[widget.location.lat, widget.location.lon], distance / EARTH_RADIUS],
      },
    };
  } else if (lat && lon) {
    const distance = getDistanceKm("50km");
    where.$and = { $or: [{ "addresses.geoPoint": { $geoWithin: { $centerSphere: [[lon, lat], distance / EARTH_RADIUS] } } }, { remote: "full" }] };
  }
  return where;
};

// Convert $nearSphere to $geoWithin (doesn't work with countDocuments)
const nearSphereToGeoWithin = (nearSphere: any) => {
  if (!nearSphere) return;
  const distanceKm = nearSphere.$maxDistance / 1000;
  const geoWithin = { $geoWithin: { $centerSphere: [[nearSphere.$geometry.coordinates[0], nearSphere.$geometry.coordinates[1]], distanceKm / EARTH_RADIUS] } };
  return geoWithin;
};

const buildRemoteQuery = (value: string | string[]) => {
  if (value.includes("yes") && !value.includes("no")) return { $in: ["full", "possible"] };
  if (value.includes("no") && !value.includes("yes")) return "no";
};

const buildYesNoQuery = (value: string | string[]) => {
  if (value.includes("yes") && !value.includes("no")) return "yes";
  if (value.includes("no") && !value.includes("yes")) return "no";
};

const buildAccessibilityQuery = (value: string | string[]) => {
  if (value.includes("reducedMobilityAccessible")) return "yes";
  if (value.includes("closeToTransport")) return "yes";
};

const buildDepartmentQuery = (value: string | string[]) => {
  if (value === "none") return { $in: ["", null] };
  if (Array.isArray(value)) return { $in: value };
  return value;
};

const buildCountryQuery = (value: string | string[]) => {
  if (value === "FR" || (Array.isArray(value) && value.includes("FR") && !value.includes("NOT_FR"))) return "FR";
  if (value === "NOT_FR" || (Array.isArray(value) && value.includes("NOT_FR") && !value.includes("FR"))) return { $ne: "FR" };
  return value;
};

const buildQuery = (value: string | string[]) => {
  if (Array.isArray(value)) return { $in: value };
  return value;
};

export default router;
