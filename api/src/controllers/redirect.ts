import cors from "cors";
import { Request, Response, Router } from "express";
import zod from "zod";

import { HydratedDocument } from "mongoose";
import { JVA_URL, PUBLISHER_IDS } from "../config";
import { INVALID_PARAMS, INVALID_QUERY, NOT_FOUND, SERVER_ERROR, captureException, captureMessage } from "../error";
import CampaignModel from "../models/campaign";
import MissionModel from "../models/mission";
import StatsBotModel from "../models/stats-bot";
import WidgetModel from "../models/widget";
import { publisherService } from "../services/publisher";
import { statEventService } from "../services/stat-event";
import { Mission, StatEventRecord } from "../types";
import { identify, slugify } from "../utils";

const router = Router();

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

function fiveMinutesAgo() {
  return new Date(Date.now() - FIVE_MINUTES_IN_MS);
}

router.get("/apply", cors({ origin: "*" }), async (req: Request, res: Response) => {
  try {
    const identity = identify(req);
    if (!identity) {
      return res.status(204).send();
    }

    const query = zod
      .object({
        url: zod.string().optional(),
        view: zod.string().optional(),
        publisher: zod.string().optional(),
        mission: zod.string().optional(),
        customAttributes: zod.string().optional(),
      })
      .safeParse(req.query);

    if (!query.success) {
      captureException(`[Apply] Invalid query`, JSON.stringify(query.error, null, 2));
      return res.status(204).send();
    }

    let click = null as StatEventRecord | null;
    let mission = null as HydratedDocument<Mission> | null;
    let customAttributes: Record<string, unknown> | undefined;

    if (query.data.customAttributes) {
      try {
        const parsed = JSON.parse(query.data.customAttributes);
        if (parsed && typeof parsed === "object") {
          customAttributes = parsed as Record<string, unknown>;
        }
      } catch (error) {
        captureException(`[Apply] Invalid customAttributes`, JSON.stringify(error, null, 2));
        return res.status(204).send();
      }
    }
    if (query.data.view) {
      const clickEvent = await statEventService.findOneStatEventById(query.data.view);
      if (clickEvent) {
        const hasRecentApply = await statEventService.hasStatEventWithRecentClickId({
          type: "apply",
          clickId: query.data.view,
          since: fiveMinutesAgo(),
        });
        if (hasRecentApply) {
          return;
        }
        click = clickEvent;
      } else {
        captureMessage(`[Apply] Click not found`, `click ${query.data.view}`);
      }
    }
    if (!click) {
      return;
    }

    if (query.data.mission) {
      mission = await MissionModel.findOne({
        clientId: query.data.mission,
        publisherId: query.data.publisher || click.toPublisherId,
      });
      if (!mission) {
        captureMessage(`[Apply] Mission not found`, `mission ${query.data.mission}`);
      }
    }

    const statBot = await StatsBotModel.findOne({ user: identity.user });

    const obj = {
      referer: identity.referer,
      userAgent: identity.userAgent,
      user: identity.user,
      host: req.get("host") || "",
      origin: req.get("origin") || "",
      type: "apply",
      createdAt: new Date(),
      missionClientId: query.data.mission || "",
      isBot: statBot ? true : false,
    } as StatEventRecord;

    if (customAttributes) {
      obj.customAttributes = customAttributes;
    }

    if (mission) {
      obj.missionId = mission._id.toString();
      obj.missionClientId = mission.clientId;
      obj.missionDomain = mission.domain;
      obj.missionTitle = mission.title;
      obj.missionPostalCode = mission.postalCode;
      obj.missionDepartmentName = mission.departmentName;
      obj.missionOrganizationName = mission.organizationName;
      obj.missionOrganizationId = mission.organizationId || "";
      obj.missionOrganizationClientId = mission.organizationClientId;
      obj.toPublisherId = mission.publisherId;
      obj.toPublisherName = mission.publisherName;
    }
    if (click) {
      obj.clickUser = click.user;
      obj.clickId = click._id;
      obj.source = click.source || "publisher";
      obj.sourceName = click.sourceName || "";
      obj.sourceId = click.sourceId || "";
      obj.fromPublisherId = click.fromPublisherId || "";
      obj.fromPublisherName = click.fromPublisherName || "";
    }

    if (click && !mission) {
      obj.missionId = click.missionId;
      obj.missionClientId = click.missionClientId;
      obj.missionDomain = click.missionDomain;
      obj.missionTitle = click.missionTitle;
      obj.missionPostalCode = click.missionPostalCode;
      obj.missionDepartmentName = click.missionDepartmentName;
      obj.missionOrganizationName = click.missionOrganizationName;
      obj.missionOrganizationId = click.missionOrganizationId;
      obj.toPublisherId = click.toPublisherId;
      obj.toPublisherName = click.toPublisherName;
    }

    const id = await statEventService.createStatEvent(obj);
    return res.status(200).send({ ok: true, id });
  } catch (error) {
    captureException(error);
  }
});

router.get("/account", cors({ origin: "*" }), async (req: Request, res: Response) => {
  try {
    const identity = identify(req);
    if (!identity) {
      return res.status(204).send();
    }

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

    let click = null as StatEventRecord | null;
    let mission = null as HydratedDocument<Mission> | null;

    if (query.data.view) {
      const clickEvent = await statEventService.findOneStatEventById(query.data.view);
      if (clickEvent) {
        const hasRecentAccount = await statEventService.hasStatEventWithRecentClickId({
          type: "account",
          clickId: query.data.view,
          since: fiveMinutesAgo(),
        });
        if (hasRecentAccount) {
          return;
        }
        click = clickEvent;
      } else {
        captureMessage(`[Account] Click not found`, `click ${query.data.view}`);
      }
    }
    if (!click) {
      return;
    }

    if (query.data.mission) {
      mission = await MissionModel.findOne({
        clientId: query.data.mission,
        publisherId: query.data.publisher || click.toPublisherId,
      });
      if (!mission) {
        captureMessage(`[Account] Mission not found`, `mission ${query.data.mission}`);
      }
    }

    const statBot = await StatsBotModel.findOne({ user: identity.user });

    const obj = {
      referer: identity.referer,
      userAgent: identity.userAgent,
      user: identity.user,
      host: req.get("host") || "",
      origin: req.get("origin") || "",
      type: "account",
      createdAt: new Date(),
      missionClientId: query.data.mission || "",
      isBot: statBot ? true : false,
    } as StatEventRecord;

    if (mission) {
      obj.missionId = mission._id.toString();
      obj.missionClientId = mission.clientId;
      obj.missionDomain = mission.domain;
      obj.missionTitle = mission.title;
      obj.missionPostalCode = mission.postalCode;
      obj.missionDepartmentName = mission.departmentName;
      obj.missionOrganizationName = mission.organizationName;
      obj.missionOrganizationId = mission.organizationId || "";
      obj.missionOrganizationClientId = mission.organizationClientId;
      obj.toPublisherId = mission.publisherId;
      obj.toPublisherName = mission.publisherName;
    }
    if (click) {
      obj.clickUser = click.user;
      obj.clickId = click._id;
      obj.source = click.source || "publisher";
      obj.sourceName = click.sourceName || "";
      obj.sourceId = click.sourceId || "";
      obj.fromPublisherId = click.fromPublisherId || "";
      obj.fromPublisherName = click.fromPublisherName || "";
    }

    if (click && !mission) {
      obj.missionId = click.missionId;
      obj.missionClientId = click.missionClientId;
      obj.missionDomain = click.missionDomain;
      obj.missionTitle = click.missionTitle;
      obj.missionPostalCode = click.missionPostalCode;
      obj.missionDepartmentName = click.missionDepartmentName;
      obj.missionOrganizationName = click.missionOrganizationName;
      obj.missionOrganizationId = click.missionOrganizationId;
      obj.toPublisherId = click.toPublisherId;
      obj.toPublisherName = click.toPublisherName;
    }

    const id = await statEventService.createStatEvent(obj);
    return res.status(200).send({ ok: true, id });
  } catch (error: any) {
    captureException(error);
  }
});

router.get("/campaign/:id", cors({ origin: "*" }), async (req, res) => {
  let href: string | null = null;
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
    if (params.data.id.length > 24) {
      params.data.id = params.data.id.slice(0, 24);
    }

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
    href = campaign.url;

    const identity = identify(req);
    if (!identity) {
      return res.redirect(302, campaign.url);
    }

    const obj = {
      type: "click",
      user: identity.user,
      referer: identity.referer,
      userAgent: identity.userAgent,
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
      isBot: false,
    } as StatEventRecord;

    const clickId = await statEventService.createStatEvent(obj);
    const url = new URL(campaign.url);

    if (!url.search) {
      if (campaign.toPublisherId === PUBLISHER_IDS.SERVICE_CIVIQUE) {
        url.searchParams.set("mtm_source", "api_engagement");
        url.searchParams.set("mtm_medium", "campaign");
        url.searchParams.set("mtm_campaign", slugify(campaign.name));
      } else {
        url.searchParams.set("utm_source", "api_engagement");
        url.searchParams.set("utm_medium", "campaign");
        url.searchParams.set("utm_campaign", slugify(campaign.name));
      }
    }
    url.searchParams.set("apiengagement_id", clickId);

    res.redirect(302, url.href);

    // Update stats just created to add isBot (do it after redirect to avoid delay)
    const statBot = await StatsBotModel.findOne({ user: identity.user });
    if (statBot) {
      await statEventService.updateStatEvent(clickId, { isBot: true });
    }
  } catch (error) {
    captureException(error);
    if (href) {
      return res.redirect(302, href);
    } else {
      return res.redirect(302, JVA_URL);
    }
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
    if (mission) {
      return mission;
    }
  }

  if (!missionId.match(/[^0-9a-fA-F]/) && missionId.length === 24) {
    const mission = await MissionModel.findById(missionId);
    if (mission) {
      return mission;
    }
  }

  const mission = await MissionModel.findOne({ _old_ids: { $in: [missionId] } });
  if (mission) {
    captureMessage("[Temp] Mission found with _old_ids", `mission ${missionId}`);
    return mission;
  }

  return null;
};

router.get("/widget/:id", cors({ origin: "*" }), async (req: Request, res: Response) => {
  let href: string | null = null;
  try {
    const params = zod
      .object({
        id: zod.string(),
      })
      .required()
      .safeParse(req.params);

    const query = zod
      .object({
        widgetId: zod
          .string()
          .regex(/^[0-9a-fA-F]{24}$/)
          .optional(),
        requestId: zod.string().optional(),
      })
      .safeParse(req.query);

    if (!params.success) {
      captureMessage(`[Redirection Widget] Invalid params`, JSON.stringify(params.error, null, 2));
      return res.redirect(302, JVA_URL);
    }

    const identity = identify(req);

    const mission = await findMissionTemp(params.data.id);
    if (!mission && !identity) {
      return res.redirect(302, JVA_URL);
    }
    if (!mission) {
      captureMessage(`[Redirection Widget] Mission not found`, `mission ${params.data.id}, widget ${query.data?.widgetId}`);
      return res.redirect(302, JVA_URL);
    }
    href = mission.applicationUrl;
    if (!identity) {
      return res.redirect(302, mission.applicationUrl);
    }

    if (!query.success || !query.data.widgetId || query.data.widgetId.length !== 24) {
      captureMessage(`[Redirection Widget] Invalid query`, JSON.stringify(query.error, null, 2));
      return res.redirect(302, mission.applicationUrl);
    }

    const widget = await WidgetModel.findById(query.data.widgetId);
    if (!widget) {
      captureMessage(`[Redirection Widget] Widget not found`, `Widget ${query.data.widgetId}, mission ${params.data.id}`);
      return res.redirect(302, mission.applicationUrl);
    }

    const obj = {
      type: "click",
      user: identity.user,
      referer: identity.referer,
      userAgent: identity.userAgent,
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
      missionOrganizationClientId: mission.organizationClientId || "",
      toPublisherId: mission.publisherId,
      toPublisherName: mission.publisherName,
      fromPublisherId: widget.fromPublisherId,
      fromPublisherName: widget.fromPublisherName,
      isBot: false,
    } as StatEventRecord;
    const clickId = await statEventService.createStatEvent(obj);

    if (mission.applicationUrl.indexOf("http://") === -1 && mission.applicationUrl.indexOf("https://") === -1) {
      mission.applicationUrl = "https://" + mission.applicationUrl;
    }

    const url = new URL(mission.applicationUrl || JVA_URL);
    url.searchParams.set("apiengagement_id", clickId);

    // Service ask for mtm
    if (mission.publisherId === PUBLISHER_IDS.SERVICE_CIVIQUE) {
      url.searchParams.set("mtm_source", "api_engagement");
      url.searchParams.set("mtm_medium", "widget");
      url.searchParams.set("mtm_campaign", slugify(widget.name));
    } else {
      url.searchParams.set("utm_source", "api_engagement");
      url.searchParams.set("utm_medium", "widget");
      url.searchParams.set("utm_campaign", slugify(widget.name));
    }

    res.redirect(302, url.href);

    // Update stats just created to add isBot (do it after redirect to avoid delay)
    const statBot = await StatsBotModel.findOne({ user: identity.user });
    if (statBot) {
      await statEventService.updateStatEvent(clickId, { isBot: true });
    }
  } catch (error: any) {
    captureException(error);
    if (href) {
      res.redirect(302, href);
    } else {
      res.status(500).send({ ok: false, code: SERVER_ERROR, message: error.message });
    }
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
    if (!mission && !identity) {
      return res.redirect(302, JVA_URL);
    }
    if (!mission) {
      captureMessage(`[Redirection Seo] Mission not found`, `mission ${params.data.id}`);
      return res.redirect(302, JVA_URL);
    }
    if (!identity) {
      return res.redirect(302, mission.applicationUrl);
    }

    const obj = {
      type: "click",
      host: req.get("host") || "",
      origin: req.get("origin") || "",
      referer: identity.referer,
      userAgent: identity.userAgent,
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
      missionOrganizationClientId: mission.organizationClientId || "",

      toPublisherId: mission.publisherId,
      toPublisherName: mission.publisherName,

      fromPublisherId: PUBLISHER_IDS.API_ENGAGEMENT,
      fromPublisherName: "API Engagement",
      isBot: false,
    } as StatEventRecord;

    const clickId = await statEventService.createStatEvent(obj);
    const url = new URL(mission.applicationUrl || JVA_URL);

    url.searchParams.set("apiengagement_id", clickId);
    url.searchParams.set("utm_source", "api_engagement");
    url.searchParams.set("utm_medium", "google");
    url.searchParams.set("utm_campaign", "seo");
    res.redirect(302, url.href);

    // Update stats just created to add isBot (do it after redirect to avoid delay)
    const statBot = await StatsBotModel.findOne({ user: identity.user });
    if (statBot) {
      await statEventService.updateStatEvent(clickId, { isBot: true });
    }
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
    if (!mission && !identity) {
      return res.redirect(302, JVA_URL);
    }
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

router.get("/:statsId/confirm-human", cors({ origin: "*" }), async (req, res) => {
  try {
    const params = zod.object({ statsId: zod.string() }).safeParse(req.params);

    if (!params.success) {
      captureMessage(`[Update Stats] Invalid params`, JSON.stringify(params.error, null, 2));
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }
    await statEventService.updateStatEvent(params.data.statsId, { isHuman: true });

    return res.status(200).send({ ok: true });
  } catch (error: any) {
    if (error.statusCode === 404 || error.code === "P2025") {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }
    // If another concurrent update already set the flag, treat as success
    if (error.statusCode === 409 || error?.meta?.statusCode === 409) {
      return res.status(200).send({ ok: true, alreadyUpdated: true });
    }
    captureException(error);
    return res.status(500).send({ ok: false, code: SERVER_ERROR });
  }
});

router.get("/:missionId/:publisherId", cors({ origin: "*" }), async function trackClick(req, res, next) {
  let href: string | null = null;
  try {
    const params = zod
      .object({
        missionId: zod.string(),
        publisherId: zod.string(),
      })
      .safeParse(req.params);

    const query = zod
      .object({
        tags: zod.string().optional(),
      })
      .safeParse(req.query);

    if (!params.success) {
      captureMessage(`[Redirection Publisher] Invalid params`, JSON.stringify(params.error, null, 2));
      return res.redirect(302, "https://www.service-civique.gouv.fr/"); // While issue
    }

    const identity = identify(req);

    const mission = await findMissionTemp(params.data.missionId);
    if (!mission && !identity) {
      return res.redirect(302, "https://www.service-civique.gouv.fr/");
    }
    if (!mission) {
      captureMessage(`[Redirection Publisher] Mission not found`, `mission ${params.data.missionId}, publisher ${params.data.publisherId}`);
      return res.redirect(302, "https://www.service-civique.gouv.fr/"); // While issue
    }
    if (!identity) {
      return res.redirect(302, mission.applicationUrl);
    }
    href = mission.applicationUrl;

    const fromPublisher = await publisherService.findOnePublisherById(params.data.publisherId);

    const obj = {
      type: "click",
      host: req.get("host") || "",
      origin: req.get("origin") || "",
      referer: identity.referer,
      userAgent: identity.userAgent,
      user: identity.user,
      source: "publisher",
      sourceId: fromPublisher?.id || "",
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
      missionOrganizationClientId: mission.organizationClientId || "",
      toPublisherId: mission.publisherId,
      toPublisherName: mission.publisherName,

      fromPublisherId: fromPublisher?.id || "",
      fromPublisherName: fromPublisher?.name || "",
      isBot: false,
      tags: query.data?.tags ? (query.data.tags.includes(",") ? query.data.tags.split(",").map((tag) => tag.trim()) : [query.data.tags]) : undefined,
    } as StatEventRecord;

    const clickId = await statEventService.createStatEvent(obj);

    if (mission.applicationUrl.indexOf("http://") === -1 && mission.applicationUrl.indexOf("https://") === -1) {
      mission.applicationUrl = "https://" + mission.applicationUrl;
    }

    const url = new URL(mission.applicationUrl || JVA_URL);
    url.searchParams.set("apiengagement_id", clickId);

    // Service ask for mtm
    if (mission.publisherId === PUBLISHER_IDS.SERVICE_CIVIQUE) {
      url.searchParams.set("mtm_source", "api_engagement");
      url.searchParams.set("mtm_medium", "api");
      url.searchParams.set("mtm_campaign", slugify(fromPublisher?.name || "unknown"));
    } else {
      url.searchParams.set("utm_source", "api_engagement");
      url.searchParams.set("utm_medium", "api");
      url.searchParams.set("utm_campaign", slugify(fromPublisher?.name || "unknown"));
    }

    res.redirect(302, url.href);

    // Update stats just created to add isBot (do it after redirect to avoid delay)
    const statBot = await StatsBotModel.findOne({ user: identity.user });
    if (statBot) {
      await statEventService.updateStatEvent(clickId, { isBot: true });
    }
  } catch (error: any) {
    captureException(error);
    if (href) {
      res.redirect(302, href);
    } else {
      res.status(500).send({ ok: false, code: SERVER_ERROR, message: error.message });
    }
  }
});

router.get("/impression/campaign/:campaignId", cors({ origin: "*" }), async (req, res) => {
  try {
    const identity = identify(req);
    if (!identity) {
      return res.status(204).send();
    }

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

    const fromPublisher = await publisherService.findOnePublisherById(campaign.fromPublisherId);
    if (!fromPublisher) {
      captureException(`[Impression Campaign] Publisher not found`, `publisher ${campaign.fromPublisherId}`);
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const statBot = await StatsBotModel.findOne({ user: identity.user });

    const obj = {
      type: "print",
      host: req.get("host") || "",
      origin: req.get("origin") || "",
      referer: identity.referer,
      userAgent: identity.userAgent,
      user: identity.user,
      createdAt: new Date(),
      tag: "link",

      toPublisherId: campaign.toPublisherId,
      toPublisherName: campaign.toPublisherName,

      fromPublisherId: fromPublisher.id,
      fromPublisherName: fromPublisher.name,

      source: "campaign",
      sourceId: campaign._id.toString(),
      sourceName: campaign.name,
      isBot: statBot ? true : false,
    } as StatEventRecord;

    const printId = await statEventService.createStatEvent(obj);
    res.status(200).send({ ok: true, data: { ...obj, _id: printId } });
  } catch (error) {
    captureException(error);
  }
});

router.get("/impression/:missionId/:publisherId", cors({ origin: "*" }), async (req, res) => {
  try {
    const identity = identify(req);
    if (!identity) {
      return res.status(204).send();
    }

    const params = zod
      .object({
        missionId: zod.string(),
        publisherId: zod.string(),
      })
      .safeParse(req.params);

    const query = zod
      .object({
        tracker: zod.string().optional(),
        sourceId: zod.string().optional(),
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

    const fromPublisher = await publisherService.findOnePublisherById(params.data.publisherId);
    if (!fromPublisher) {
      captureException(`[Impression Widget] Publisher not found`, `publisher ${params.data.publisherId}`);
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const source = query.data.sourceId ? await WidgetModel.findById(query.data.sourceId) : null;
    if (!source && query.data.sourceId) {
      captureMessage(`[Impression] Source not found`, `source ${query.data.sourceId}`);
    }

    const statBot = await StatsBotModel.findOne({ user: identity.user });
    const obj = {
      type: "print",
      requestId: query.data.requestId,
      host: req.get("host") || "",
      origin: req.get("origin") || "",
      referer: identity.referer,
      userAgent: identity.userAgent,
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
      missionOrganizationClientId: mission.organizationClientId || "",
      toPublisherId: mission.publisherId,
      toPublisherName: mission.publisherName,

      fromPublisherId: fromPublisher.id,
      fromPublisherName: fromPublisher.name,

      isBot: statBot ? true : false,
    } as StatEventRecord;

    const printId = await statEventService.createStatEvent(obj);

    res.status(200).send({ ok: true, data: { ...obj, _id: printId } });
  } catch (error: any) {
    captureException(error);
    return res.status(500).send({ ok: false, code: SERVER_ERROR });
  }
});

export default router;
