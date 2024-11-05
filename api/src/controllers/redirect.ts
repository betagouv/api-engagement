import cors from "cors";
import { Request, Response, Router } from "express";
import { isbot } from "isbot";
import hash from "object-hash";
import zod from "zod";

import { HydratedDocument } from "mongoose";
import { ENV, JVA_URL, SC_ID, STATS_INDEX } from "../config";
import esClient from "../db/elastic";
import { INVALID_PARAMS, INVALID_QUERY, NOT_FOUND, SERVER_ERROR, captureException, captureMessage } from "../error";
import CampaignModel from "../models/campaign";
import MissionModel from "../models/mission";
import PublisherModel from "../models/publisher";
import WidgetModel from "../models/widget";
import { Mission, Stats } from "../types";
import { slugify } from "../utils";

const router = Router();

const identify = (req: Request) => {
  const userAgent = req.get("user-agent");
  if (isbot(userAgent) && ENV !== "development") return;

  const ip = req.ip;
  const referer = req.header("referer") || "not_defined";
  const user = hash([ip, referer, userAgent]);
  return { user, referer: referer.includes("?") ? referer.split("?")[0] : referer };
};

router.get("/apply", cors({ origin: "*" }), async (req: Request, res: Response) => {
  try {
    const identity = identify(req);
    if (!identity) return res.status(204).send();

    const query = zod
      .object({
        url: zod.string().optional(),
        view: zod.string().optional(),
        publisher: zod.string().optional(),
        mission: zod.string().optional(),
      })
      .safeParse(req.query);

    if (!query.success) {
      captureException(`[Apply] Invalid query`, JSON.stringify(query.error, null, 2));
      return res.status(204).send();
    }

    let click = null as Stats | null;
    let mission = null as HydratedDocument<Mission> | null;
    if (query.data.view) {
      try {
        const response = await esClient.get({ index: STATS_INDEX, id: query.data.view });
        const { body: fake } = await esClient.search({
          index: STATS_INDEX,
          body: {
            query: {
              bool: {
                must: [{ term: { "type.keyword": "apply" } }, { term: { "clickId.keyword": query.data.view } }, { range: { createdAt: { gte: "now-5m/m", lte: "now/m" } } }],
              },
            },
          },
        });

        if (fake.hits.total.value) return;
        click = { ...response.body._source, _id: response.body._id } as Stats;
      } catch (_) {
        captureMessage(`[Apply] Click not found`, `click ${query.data.view}`);
      }
    }
    if (!click) return;

    if (query.data.mission) {
      mission = await MissionModel.findOne({ clientId: query.data.mission, publisherId: query.data.publisher || click.toPublisherId });
      if (!mission) captureMessage(`[Apply] Mission not found`, `mission ${query.data.mission}`);
    }

    const obj1 = {
      referer: identity.referer,
      user: identity.user,
      host: req.get("host") || "",
      origin: req.get("origin") || "",
      type: "apply",
      createdAt: new Date(),
      missionClientId: query.data.mission || "",
    } as Stats;

    if (mission) {
      obj1.missionId = mission._id.toString();
      obj1.missionClientId = mission.clientId;
      obj1.missionDomain = mission.domain;
      obj1.missionTitle = mission.title;
      obj1.missionPostalCode = mission.postalCode;
      obj1.missionDepartmentName = mission.departmentName;
      obj1.missionOrganizationName = mission.organizationName;
      obj1.missionOrganizationId = mission.organizationId;
      obj1.toPublisherId = mission.publisherId;
      obj1.toPublisherName = mission.publisherName;
    }
    if (click) {
      obj1.clickId = click._id;
      obj1.source = click.source || "publisher";
      obj1.sourceName = click.sourceName || "";
      obj1.sourceId = click.sourceId || "";
      obj1.fromPublisherId = click.fromPublisherId || "";
      obj1.fromPublisherName = click.fromPublisherName || "";
    }

    if (click && !mission) {
      obj1.missionId = click.missionId;
      obj1.missionClientId = click.missionClientId;
      obj1.missionDomain = click.missionDomain;
      obj1.missionTitle = click.missionTitle;
      obj1.missionPostalCode = click.missionPostalCode;
      obj1.missionDepartmentName = click.missionDepartmentName;
      obj1.missionOrganizationName = click.missionOrganizationName;
      obj1.missionOrganizationId = click.missionOrganizationId;
      obj1.toPublisherId = click.toPublisherId;
      obj1.toPublisherName = click.toPublisherName;
    }

    const response = await esClient.index({ index: STATS_INDEX, body: obj1 });
    return res.status(200).send({ ok: true, id: response.body._id });
  } catch (error) {
    captureException(error);
  }
});

router.get("/account", cors({ origin: "*" }), async (req: Request, res: Response) => {
  try {
    const identity = identify(req);
    if (!identity) return res.status(204).send();

    const query = zod
      .object({
        url: zod.string().optional(),
        view: zod.string().optional(),
        publisher: zod.string().optional(),
        mission: zod.string().optional(),
      })
      .safeParse(req.query);

    if (!query.success) {
      captureException(`[Account] Invalid query`, JSON.stringify(query.error, null, 2));
      return res.status(204).send();
    }

    let click = null as Stats | null;
    let mission = null as HydratedDocument<Mission> | null;

    if (query.data.view) {
      try {
        const response = await esClient.get({ index: STATS_INDEX, id: query.data.view });
        const { body: fake } = await esClient.search({
          index: STATS_INDEX,
          body: {
            query: {
              bool: {
                must: [{ term: { "type.keyword": "account" } }, { term: { "clickId.keyword": query.data.view } }, { range: { createdAt: { gte: "now-5m/m", lte: "now/m" } } }],
              },
            },
          },
        });

        if (fake.hits.total.value) return;
        click = { ...response.body._source, _id: response.body._id } as Stats;
      } catch (_) {
        captureMessage(`[Account] Click not found`, `click ${query.data.view}`);
      }
    }
    if (!click) return;

    if (query.data.mission) {
      mission = await MissionModel.findOne({ clientId: query.data.mission, publisherId: query.data.publisher || click.toPublisherId });
      if (!mission) captureMessage(`[Account] Mission not found`, `mission ${query.data.mission}`);
    }

    const obj1 = {
      referer: identity.referer,
      user: identity.user,
      host: req.get("host") || "",
      origin: req.get("origin") || "",
      type: "account",
      createdAt: new Date(),
      missionClientId: query.data.mission || "",
    } as Stats;

    if (mission) {
      obj1.missionId = mission._id.toString();
      obj1.missionClientId = mission.clientId;
      obj1.missionDomain = mission.domain;
      obj1.missionTitle = mission.title;
      obj1.missionPostalCode = mission.postalCode;
      obj1.missionDepartmentName = mission.departmentName;
      obj1.missionOrganizationName = mission.organizationName;
      obj1.missionOrganizationId = mission.organizationId;
      obj1.toPublisherId = mission.publisherId;
      obj1.toPublisherName = mission.publisherName;
    }
    if (click) {
      obj1.clickId = click._id;
      obj1.source = click.source || "publisher";
      obj1.sourceName = click.sourceName || "";
      obj1.sourceId = click.sourceId || "";
      obj1.fromPublisherId = click.fromPublisherId || "";
      obj1.fromPublisherName = click.fromPublisherName || "";
    }

    if (click && !mission) {
      obj1.missionId = click.missionId;
      obj1.missionClientId = click.missionClientId;
      obj1.missionDomain = click.missionDomain;
      obj1.missionTitle = click.missionTitle;
      obj1.missionPostalCode = click.missionPostalCode;
      obj1.missionDepartmentName = click.missionDepartmentName;
      obj1.missionOrganizationName = click.missionOrganizationName;
      obj1.missionOrganizationId = click.missionOrganizationId;
      obj1.toPublisherId = click.toPublisherId;
      obj1.toPublisherName = click.toPublisherName;
    }

    const response = await esClient.index({ index: STATS_INDEX, body: obj1 });
    return res.status(200).send({ ok: true, id: response.body._id });
  } catch (error: any) {
    captureException(error);
  }
});

router.get("/campaign/:id", cors({ origin: "*" }), async (req, res) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .required()
      .safeParse(req.params);

    if (!params.success) {
      captureMessage(`[Redirection Campaign] Invalid params`, JSON.stringify(params.error, null, 2));
      return res.redirect(302, JVA_URL);
    }
    // Fix to save badly copy pasted id
    if (params.data.id.length > 24) params.data.id = params.data.id.slice(0, 24);

    if (params.data.id.match(/[^0-9a-fA-F]/) || params.data.id.length !== 24) {
      captureMessage(`[Redirection Campaign] Invalid id`, `campaign id ${params.data.id}`);
      return res.redirect(302, JVA_URL);
    }

    const campaign = await CampaignModel.findById(params.data.id);
    if (!campaign) {
      captureMessage(`[Redirection Campaign] Campaign not found`, `campaign id ${params.data.id}`);
      return res.redirect(302, JVA_URL);
    }
    if (!campaign.url) {
      captureException(`[Redirection Campaign] Campaign url not found`, `campaign id ${params.data.id}`);
      return res.redirect(302, JVA_URL);
    }

    const identity = identify(req);
    if (!identity) return res.redirect(302, campaign.url);

    const obj1 = {
      type: "click",
      user: identity?.user,
      referer: identity?.referer,
      host: req.get("host") || "",
      origin: req.get("origin") || "",
      source: "campaign",
      sourceName: campaign.name || "",
      sourceId: campaign._id.toString() || "",
      createdAt: new Date(),
      toPublisherId: campaign.toPublisherId,
      toPublisherName: campaign.toPublisherName,
      fromPublisherId: campaign.fromPublisherId,
      fromPublisherName: campaign.fromPublisherName,
    } as Stats;
    const click = await esClient.index({ index: STATS_INDEX, body: obj1 });
    console.log("click", click.body._id);

    const url = new URL(campaign.url);

    if (!url.search) {
      if (campaign.toPublisherId === SC_ID) {
        url.searchParams.set("mtm_source", "api_engagement");
        url.searchParams.set("mtm_medium", "campaign");
        url.searchParams.set("mtm_campaign", slugify(campaign.name));
      } else {
        url.searchParams.set("utm_source", "api_engagement");
        url.searchParams.set("utm_medium", "campaign");
        url.searchParams.set("utm_campaign", slugify(campaign.name));
      }
    }
    url.searchParams.set("apiengagement_id", click.body._id);

    res.redirect(302, url.href);
  } catch (error) {
    captureException(error);
    return res.redirect(302, JVA_URL);
  }
});

// Temporary fix for missing missions
const MISSION_NOT_FOUND = {
  "650c884e161246d96b53be2e": "6703bbb473fbd982c10127e7",
  "63922907f6c879268f834d8b": "6703bbb573fbd982c1012b26",
  "651c0605c2543ccde2ebe526": "6703bbb473fbd982c10126a5",
  "6526e65a2805290904c6f5a6": "6703bbb473fbd982c10128e1",
  "63d3c010311743b0e0d2cfb8": "6703bbb473fbd982c1012628",
  "633d5f02c5e3d005ebd9c27b": "6703bb4273fbd982c1011811",
  " 606d20efeea0d9070b9ab67f": "6703bbb573fbd982c1012b7a",
  "b30a0fd8-2a29-471c-8667-a0def87352ca": "",
  "6509e557480f32a674f90d9b": "6703bad373fbd982c100f8cd",
  "65034dcd6d92368ab3e62b2e": "6703bad173fbd982c100ec8b",
  "650b36ce161246d96b4dec94": "6703bb3c73fbd982c101003a",
  "645699282e85e7d7b1a8b805": "6703bb4273fbd982c1011a59",
  "64092877f563558c4ff64a5b": "6703bb4173fbd982c10113f7",
  "63add8a958b361a136463939": "6703bb4173fbd982c1011308",
  "64092877f563558c4ff64be6": "6703bb4173fbd982c10113f6",
  "6215b7b5ffecb707a0fb2a0d": "6703bb4173fbd982c10113f2",
  "62283732285e0d07a06a1c2b": "6703bb4173fbd982c101139c",
  "63e2408e50f05c74605803f0": "6703bb3f73fbd982c1010d44",
  "640a21e45c6aa53a9169a6ec": "6703bb4173fbd982c1011403",
} as { [key: string]: string };

const findMissionTemp = async (missionId: string) => {
  if (MISSION_NOT_FOUND[missionId.toString()]) {
    const mission = await MissionModel.findById(MISSION_NOT_FOUND[missionId.toString()]);
    if (mission) return mission;
  }

  if (!missionId.match(/[^0-9a-fA-F]/) && missionId.length === 24) {
    const mission = await MissionModel.findById(missionId);
    if (mission) return mission;
  }

  const mission = await MissionModel.findOne({ _old_ids: { $in: [missionId] } });
  if (mission) {
    captureMessage("[Temp] Mission found with _old_ids", `mission ${missionId}`);
    return mission;
  }

  const response2 = await esClient.search({ index: STATS_INDEX, body: { query: { term: { "missionId.keyword": missionId } }, size: 1 } });
  if (response2.body.hits.total.value > 0) {
    const stats = { _id: response2.body.hits.hits[0]._id, ...response2.body.hits.hits[0]._source } as Stats;
    const mission = await MissionModel.findOne({ clientId: stats.missionClientId?.toString(), publisherId: stats.toPublisherId });
    if (mission) {
      captureMessage("[Temp] Mission found with click", `mission ${missionId}`);
      return mission;
    }
  }
  return null;
};

router.get("/widget/:id", cors({ origin: "*" }), async (req: Request, res: Response) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .required()
      .safeParse(req.params);

    const query = zod
      .object({
        widgetId: zod.string().optional(),
        requestId: zod.string().optional(),
      })
      .safeParse(req.query);

    if (!params.success) {
      captureMessage(`[Redirection Widget] Invalid params`, JSON.stringify(params.error, null, 2));
      return res.redirect(302, JVA_URL);
    }

    const identity = identify(req);

    const mission = await findMissionTemp(params.data.id);
    if (!mission && !identity) return res.redirect(302, JVA_URL);
    if (!mission) {
      captureMessage(`[Redirection Widget] Mission not found`, `mission ${params.data.id}, widget ${query.data?.widgetId}`);
      return res.redirect(302, JVA_URL);
    }
    if (!identity) return res.redirect(302, mission.applicationUrl);

    if (!query.success || !query.data.widgetId || query.data.widgetId.length !== 24) {
      captureMessage(`[Redirection Widget] Invalid query`, JSON.stringify(query.error, null, 2));
      return res.redirect(302, mission.applicationUrl);
    }

    const widget = await WidgetModel.findById(query.data.widgetId);
    if (!widget) {
      captureMessage(`[Redirection Widget] Widget not found`, `Widget ${query.data.widgetId}, mission ${params.data.id}`);
      return res.redirect(302, mission.applicationUrl);
    }

    const obj1 = {
      type: "click",
      user: identity?.user,
      referer: identity?.referer,
      host: req.get("host") || "",
      origin: req.get("origin") || "",
      requestId: query.data.requestId,
      source: "widget",
      sourceName: widget.name || "",
      sourceId: widget._id.toString() || "",
      createdAt: new Date(),
      missionId: mission._id.toString(),
      missionClientId: mission.clientId || "",
      missionDomain: mission.domain || "",
      missionTitle: mission.title || "",
      missionPostalCode: mission.postalCode || "",
      missionDepartmentName: mission.departmentName || "",
      missionOrganizationName: mission.organizationName || "",
      missionOrganizationId: mission.organizationId || "",

      toPublisherId: mission.publisherId,
      toPublisherName: mission.publisherName,
      fromPublisherId: widget.fromPublisherId,
      fromPublisherName: widget.fromPublisherName,
    } as Stats;
    const click = await esClient.index({ index: STATS_INDEX, body: obj1 });
    console.log("click", click.body._id);

    if (mission.applicationUrl.indexOf("http://") === -1 && mission.applicationUrl.indexOf("https://") === -1) {
      mission.applicationUrl = "https://" + mission.applicationUrl;
    }

    const url = new URL(mission.applicationUrl || JVA_URL);
    url.searchParams.set("apiengagement_id", click.body._id);

    // Service ask for mtm
    if (mission.publisherId === SC_ID) {
      url.searchParams.set("mtm_source", "api_engagement");
      url.searchParams.set("mtm_medium", "widget");
      url.searchParams.set("mtm_campaign", slugify(widget.name));
    } else {
      url.searchParams.set("utm_source", "api_engagement");
      url.searchParams.set("utm_medium", "widget");
      url.searchParams.set("utm_campaign", slugify(widget.name));
    }

    res.redirect(302, url.href);
  } catch (error: any) {
    captureException(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, message: error.message });
  }
});

router.get("/seo/:id", cors({ origin: "*" }), async (req: Request, res: Response) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .required()
      .safeParse(req.params);

    if (!params.success) {
      captureMessage(`[Redirection Seo] Invalid params`, JSON.stringify(params.error, null, 2));
      return res.redirect(302, JVA_URL);
    }

    const identity = identify(req);
    const mission = await findMissionTemp(params.data.id);
    if (!mission && !identity) return res.redirect(302, JVA_URL);
    if (!mission) {
      captureMessage(`[Redirection Seo] Mission not found`, `mission ${params.data.id}`);
      return res.redirect(302, JVA_URL);
    }
    if (!identity) return res.redirect(302, mission.applicationUrl);

    const obj = {
      type: "click",
      host: req.get("host") || "",
      origin: req.get("origin") || "",
      referer: identity.referer,
      user: identity.user,
      createdAt: new Date(),
      source: "seo",

      missionId: mission._id.toString(),
      missionClientId: mission.clientId || "",
      missionDomain: mission.domain || "",
      missionTitle: mission.title || "",
      missionPostalCode: mission.postalCode || "",
      missionDepartmentName: mission.departmentName || "",
      missionOrganizationName: mission.organizationName || "",
      missionOrganizationId: mission.organizationId || "",

      toPublisherId: mission.publisherId,
      toPublisherName: mission.publisherName,

      fromPublisherId: "63da29db7d356a87a4e35d4a",
      fromPublisherName: "API Engagement",
    } as Stats;

    const click = await esClient.index({ index: STATS_INDEX, body: obj });
    console.log("click", click.body._id);

    const url = new URL(mission.applicationUrl || JVA_URL);

    url.searchParams.set("apiengagement_id", click.body._id);
    url.searchParams.set("utm_source", "api_engagement");
    url.searchParams.set("utm_medium", "google");
    url.searchParams.set("utm_campaign", "seo");
    res.redirect(302, url.href);
  } catch (error: any) {
    captureException(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, message: error.message });
  }
});

router.get("/notrack/:id", cors({ origin: "*" }), async (req, res, next) => {
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .required()
      .safeParse(req.params);

    if (!params.success) {
      captureMessage(`[Redirection No Track] Invalid params`, JSON.stringify(params.error, null, 2));
      return res.redirect(302, JVA_URL);
    }

    const identity = identify(req);

    const mission = await findMissionTemp(params.data.id);
    if (!mission && !identity) return res.redirect(302, JVA_URL);
    if (!mission) {
      captureMessage(`[Redirection No Track] Mission not found`, `mission ${params.data.id}`);
      return res.redirect(302, JVA_URL);
    }

    const url = new URL(mission.applicationUrl || JVA_URL);
    res.redirect(302, url.href);
  } catch (error: any) {
    captureException(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, message: error.message });
  }
});

router.get("/:missionId/:publisherId", cors({ origin: "*" }), async function trackClick(req, res, next) {
  try {
    const params = zod
      .object({
        missionId: zod.string(),
        publisherId: zod.string().regex(/^[0-9a-fA-F]{24}$/),
      })
      .safeParse(req.params);

    if (!params.success) {
      captureMessage(`[Redirection Publisher] Invalid params`, JSON.stringify(params.error, null, 2));
      return res.redirect(302, "https://www.service-civique.gouv.fr/"); // While issue
    }
    const identity = identify(req);

    const mission = await findMissionTemp(params.data.missionId);
    if (!mission && !identity) return res.redirect(302, "https://www.service-civique.gouv.fr/");
    if (!mission) {
      captureMessage(`[Redirection Publisher] Mission not found`, `mission ${params.data.missionId}, publisher ${params.data.publisherId}`);
      return res.redirect(302, "https://www.service-civique.gouv.fr/"); // While issue
    }
    if (!identity) return res.redirect(302, mission.applicationUrl);

    const fromPublisher = await PublisherModel.findById(params.data.publisherId);

    const obj = {
      type: "click",
      host: req.get("host") || "",
      origin: req.get("origin") || "",
      referer: identity.referer,
      user: identity.user,
      source: "publisher",
      sourceId: fromPublisher?._id || "",
      sourceName: fromPublisher?.name || "",
      createdAt: new Date(),
      missionId: mission._id.toString(),
      missionClientId: mission.clientId || "",
      missionDomain: mission.domain || "",
      missionTitle: mission.title || "",
      missionPostalCode: mission.postalCode || "",
      missionDepartmentName: mission.departmentName || "",
      missionOrganizationName: mission.organizationName || "",
      missionOrganizationId: mission.organizationId || "",

      toPublisherId: mission.publisherId,
      toPublisherName: mission.publisherName,

      fromPublisherId: fromPublisher && fromPublisher._id.toString(),
      fromPublisherName: fromPublisher && fromPublisher.name,
    } as Stats;

    const click = await esClient.index({ index: STATS_INDEX, body: obj });
    console.log("click", click.body._id);
    if (mission.applicationUrl.indexOf("http://") === -1 && mission.applicationUrl.indexOf("https://") === -1) {
      mission.applicationUrl = "https://" + mission.applicationUrl;
    }

    const url = new URL(mission.applicationUrl || JVA_URL);
    url.searchParams.set("apiengagement_id", click.body._id);

    // Service ask for mtm
    if (mission.publisherId === "5f99dbe75eb1ad767733b206") {
      url.searchParams.set("mtm_source", "api_engagement");
      url.searchParams.set("mtm_medium", "api");
      url.searchParams.set("mtm_campaign", slugify(fromPublisher?.name || "unknown"));
    } else {
      url.searchParams.set("utm_source", "api_engagement");
      url.searchParams.set("utm_medium", "api");
      url.searchParams.set("utm_campaign", slugify(fromPublisher?.name || "unknown"));
    }

    res.redirect(302, url.href);
  } catch (error: any) {
    captureException(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, message: error.message });
  }
});

router.get("/impression/campaign/:campaignId", cors({ origin: "*" }), async (req, res) => {
  try {
    const identity = identify(req);
    if (!identity) return res.status(204).send();

    const params = zod
      .object({
        campaignId: zod.string().regex(/^[0-9a-fA-F]{24}$/),
      })
      .safeParse(req.params);

    if (!params.success) {
      captureMessage(`[Impression Campaign] Invalid params`, JSON.stringify(params.error, null, 2));
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const campaign = await CampaignModel.findById(params.data.campaignId);
    if (!campaign) {
      captureException(`[Impression Campaign] Campaign not found`, `campaign ${params.data.campaignId}`);
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const fromPublisher = await PublisherModel.findById(campaign.fromPublisherId);
    if (!fromPublisher) {
      captureException(`[Impression Campaign] Publisher not found`, `publisher ${campaign.fromPublisherId}`);
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const obj = {
      type: "print",
      host: req.get("host") || "",
      origin: req.get("origin") || "",
      referer: identity.referer,
      user: identity.user,
      createdAt: new Date(),
      tag: "link",

      toPublisherId: campaign.toPublisherId,
      toPublisherName: campaign.toPublisherName,

      fromPublisherId: fromPublisher._id.toString(),
      fromPublisherName: fromPublisher.name,

      source: "campaign",
      sourceId: campaign._id.toString(),
      sourceName: campaign.name,
    } as Stats;

    const print = await esClient.index({ index: STATS_INDEX, body: obj });
    console.log("print", print.body._id);
    res.status(200).send({ ok: true, data: { ...obj, _id: print.body._id } });
  } catch (error) {
    captureException(error);
  }
});

router.get("/impression/:missionId/:publisherId", cors({ origin: "*" }), async (req, res) => {
  try {
    const identity = identify(req);
    if (!identity) return res.status(204).send();

    const params = zod
      .object({
        missionId: zod.string(),
        publisherId: zod.string().regex(/^[0-9a-fA-F]{24}$/),
      })
      .safeParse(req.params);

    const query = zod
      .object({
        tracker: zod.string().optional(),
        sourceId: zod
          .string()
          .regex(/^[0-9a-fA-F]{24}$/)
          .optional(),
        requestId: zod
          .string()
          .regex(/^[0-9a-fA-F]{24}$/)
          .optional(),
      })
      .safeParse(req.query);

    if (!params.success) {
      captureMessage(`[Impression Widget] Invalid params`, JSON.stringify(params.error, null, 2));
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }
    if (!query.success) {
      captureMessage(`[Impression Widget] Invalid query`, JSON.stringify(query.error, null, 2));
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    const mission = await findMissionTemp(params.data.missionId);
    if (!mission) {
      captureMessage(`[Impression Widget] Mission not found`, `mission ${params.data.missionId}, publisher ${params.data.publisherId}`);
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const fromPublisher = await PublisherModel.findById(params.data.publisherId);
    if (!fromPublisher) {
      captureException(`[Impression Widget] Publisher not found`, `publisher ${params.data.publisherId}`);
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const source = query.data.sourceId ? await WidgetModel.findById(query.data.sourceId) : null;
    if (!source && query.data.sourceId) captureMessage(`[Impression] Source not found`, `source ${query.data.sourceId}`);

    const obj = {
      type: "print",
      requestId: query.data.requestId,
      host: req.get("host") || "",
      origin: req.get("origin") || "",
      referer: identity.referer,
      user: identity.user,
      createdAt: new Date(),
      tag: query.data.tracker,
      source: query.data.sourceId ? "widget" : "jstag",
      sourceId: query.data.sourceId,
      sourceName: source && source.name,

      missionId: mission._id.toString(),
      missionClientId: mission.clientId || "",
      missionDomain: mission.domain || "",
      missionTitle: mission.title || "",
      missionPostalCode: mission.postalCode || "",
      missionDepartmentName: mission.departmentName || "",
      missionOrganizationName: mission.organizationName || "",
      missionOrganizationId: mission.organizationId || "",

      toPublisherId: mission.publisherId,
      toPublisherName: mission.publisherName,

      fromPublisherId: fromPublisher._id.toString(),
      fromPublisherName: fromPublisher.name,
    } as Stats;

    const print = await esClient.index({ index: STATS_INDEX, body: obj });
    console.log("print", print.body._id);

    res.status(200).send({ ok: true, data: { ...obj, _id: print.body._id } });
  } catch (error: any) {
    captureException(error);
    return res.status(500).send({ ok: false, code: SERVER_ERROR });
  }
});

export default router;