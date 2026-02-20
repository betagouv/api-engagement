import cors from "cors";
import { Request, Response, Router } from "express";
import zod from "zod";

import { JVA_URL, PUBLISHER_IDS } from "../config";
import { INVALID_PARAMS, INVALID_QUERY, NOT_FOUND, SERVER_ERROR, captureException } from "../error";
import { campaignService } from "../services/campaign";
import { missionService } from "../services/mission";
import { publisherService } from "../services/publisher";
import { statBotService } from "../services/stat-bot";
import { statEventService } from "../services/stat-event";
import { widgetService } from "../services/widget";
import { MissionRecord, StatEventRecord } from "../types";
import { cleanIdParam, identify, slugify } from "../utils";

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
        clientEventId: zod.string().optional(),
      })
      .strict()
      .safeParse(req.query);

    if (!query.success) {
      return res.status(204).send();
    }

    let click = null as StatEventRecord | null;
    let mission = null as MissionRecord | null;
    let customAttributes: Record<string, unknown> | undefined;

    if (query.data.customAttributes) {
      try {
        const parsed = JSON.parse(query.data.customAttributes);
        if (parsed && typeof parsed === "object") {
          customAttributes = parsed as Record<string, unknown>;
        }
      } catch (error) {
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
        if (query.data.clientEventId) {
          const hasRecentClientEvent = await statEventService.hasStatEventWithRecentClientEventId({
            type: "apply",
            clientEventId: query.data.clientEventId,
            toPublisherId: clickEvent.toPublisherId,
            since: fiveMinutesAgo(),
          });
          if (hasRecentClientEvent) {
            return;
          }
        }
        click = clickEvent;
      } else {
        captureException(new Error(`[Apply] Click not found`), { extra: { clickId: query.data.view } });
      }
    }
    if (!click) {
      return;
    }

    if (query.data.mission) {
      mission = await missionService.findMissionByClientAndPublisher(query.data.mission, query.data.publisher || click.toPublisherId);
      if (!mission) {
        captureException(new Error(`[Apply] Mission not found`), { extra: { missionId: query.data.mission } });
      }
    }

    const statBot = await statBotService.findStatBotByUser(identity.user);

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
    if (query.data.clientEventId) {
      obj.clientEventId = query.data.clientEventId;
    }

    if (mission) {
      obj.missionId = mission.id;
      obj.missionClientId = mission.clientId;
      obj.missionDomain = mission.domain || undefined;
      obj.missionTitle = mission.title;
      obj.missionPostalCode = mission.postalCode || "";
      obj.missionDepartmentName = mission.departmentName || "";
      obj.missionOrganizationName = mission.organizationName || "";
      obj.missionOrganizationId = mission.organizationId || "";
      obj.missionOrganizationClientId = mission.organizationClientId || "";
      obj.toPublisherId = mission.publisherId;
      obj.toPublisherName = mission.publisherName || "";
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
        clientEventId: zod.string().optional(),
      })
      .strict()
      .safeParse(req.query);

    if (!query.success) {
      return res.status(204).send();
    }

    let click = null as StatEventRecord | null;
    let mission = null as MissionRecord | null;

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
        if (query.data.clientEventId) {
          const hasRecentClientEvent = await statEventService.hasStatEventWithRecentClientEventId({
            type: "account",
            clientEventId: query.data.clientEventId,
            toPublisherId: clickEvent.toPublisherId,
            since: fiveMinutesAgo(),
          });
          if (hasRecentClientEvent) {
            return;
          }
        }
        click = clickEvent;
      } else {
        captureException(new Error(`[Account] Click not found`), { extra: { clickId: query.data.view } });
      }
    }
    if (!click) {
      return;
    }

    if (query.data.mission) {
      mission = await missionService.findMissionByClientAndPublisher(query.data.mission, query.data.publisher || click.toPublisherId);
      if (!mission) {
        captureException(new Error(`[Account] Mission not found`), { extra: { missionId: query.data.mission } });
      }
    }

    const statBot = await statBotService.findStatBotByUser(identity.user);

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

    if (query.data.clientEventId) {
      obj.clientEventId = query.data.clientEventId;
    }
    if (mission) {
      obj.missionId = mission.id;
      obj.missionClientId = mission.clientId;
      obj.missionDomain = mission.domain || undefined;
      obj.missionTitle = mission.title;
      obj.missionPostalCode = mission.postalCode || "";
      obj.missionDepartmentName = mission.departmentName || "";
      obj.missionOrganizationName = mission.organizationName || "";
      obj.missionOrganizationId = mission.organizationId || "";
      obj.missionOrganizationClientId = mission.organizationClientId || "";
      obj.toPublisherId = mission.publisherId;
      obj.toPublisherName = mission.publisherName || "";
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
  let redirected = false;
  try {
    const params = zod
      .object({
        id: zod.string().transform(cleanIdParam),
      })
      .required()
      .safeParse(req.params);

    if (!params.success) {
      return res.redirect(302, JVA_URL);
    }

    if (params.data.id.length > 24 && !params.data.id.includes("-")) {
      params.data.id = params.data.id.slice(0, 24); // Fix some badly copy pasted mongo ids
    }

    const campaign = await campaignService.findCampaignById(params.data.id);
    if (!campaign || !campaign.url) {
      return res.redirect(302, JVA_URL);
    }
    href = campaign.url;

    const identity = identify(req);
    if (!identity) {
      return res.redirect(302, campaign.url);
    }

    const fromPublisher = await publisherService.findOnePublisherById(campaign.fromPublisherId);
    const toPublisher = await publisherService.findOnePublisherById(campaign.toPublisherId);

    const obj = {
      type: "click",
      user: identity.user,
      referer: identity.referer,
      userAgent: identity.userAgent,
      host: req.get("host") || "",
      origin: req.get("origin") || "",
      source: "campaign",
      sourceName: campaign.name || "",
      sourceId: campaign.id || "",
      createdAt: new Date(),
      toPublisherId: campaign.toPublisherId,
      toPublisherName: toPublisher?.name || "",
      fromPublisherId: campaign.fromPublisherId,
      fromPublisherName: fromPublisher?.name || "",
      isBot: false,
    } as StatEventRecord;

    const clickId = await statEventService.createStatEvent(obj);
    href = href.includes("?") ? `${href}&apiengagement_id=${clickId}` : `${href}?apiengagement_id=${clickId}`;
    res.redirect(302, href);
    redirected = true;

    // Update stats just created to add isBot (do it after redirect to avoid delay)
    const statBot = await statBotService.findStatBotByUser(identity.user);
    if (statBot) {
      await statEventService.updateStatEvent(clickId, { isBot: true });
    }
  } catch (error) {
    captureException(error);
    if (redirected) {
      return;
    }
    if (href) {
      return res.redirect(302, href);
    } else {
      return res.redirect(302, JVA_URL);
    }
  }
});

router.get("/widget/:id", cors({ origin: "*" }), async (req: Request, res: Response) => {
  let href: string | null = null;
  let redirected = false;
  try {
    const params = zod
      .object({
        id: zod.string().transform(cleanIdParam),
      })
      .required()
      .safeParse(req.params);

    const query = zod
      .object({
        widgetId: zod.string().min(1).optional(),
        requestId: zod.string().optional(),
      })
      .safeParse(req.query);

    if (!params.success) {
      return res.redirect(302, JVA_URL);
    }

    const identity = identify(req);

    const mission = await missionService.findOneMission(params.data.id);
    if (!mission) {
      return res.redirect(302, JVA_URL);
    }
    href = mission.applicationUrl || JVA_URL;
    if (!identity) {
      return res.redirect(302, href);
    }

    if (!query.success || !query.data.widgetId) {
      return res.redirect(302, href);
    }

    const widget = await widgetService.findOneWidgetById(query.data.widgetId);
    if (!widget) {
      return res.redirect(302, href);
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
      sourceId: widget.id || "",
      createdAt: new Date(),
      missionId: mission.id,
      missionClientId: mission.clientId || "",
      missionDomain: mission.domain || "",
      missionTitle: mission.title || "",
      missionPostalCode: mission.postalCode || "",
      missionDepartmentName: mission.departmentName || "",
      missionOrganizationName: mission.organizationName || "",
      missionOrganizationId: mission.organizationId || "",
      missionOrganizationClientId: mission.organizationClientId || "",
      toPublisherId: mission.publisherId,
      toPublisherName: mission.publisherName || "",
      fromPublisherId: widget.fromPublisherId,
      fromPublisherName: widget.fromPublisherName,
      isBot: false,
    } as StatEventRecord;
    const clickId = await statEventService.createStatEvent(obj);

    let targetUrl = href;
    if (targetUrl.indexOf("http://") === -1 && targetUrl.indexOf("https://") === -1) {
      targetUrl = "https://" + targetUrl;
    }

    const url = new URL(targetUrl || JVA_URL);
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
    redirected = true;
    // Update stats just created to add isBot (do it after redirect to avoid delay)
    const statBot = await statBotService.findStatBotByUser(identity.user);
    if (statBot) {
      await statEventService.updateStatEvent(clickId, { isBot: true });
    }
  } catch (error: any) {
    captureException(error);
    if (redirected) {
      return;
    }
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
        id: zod.string().transform(cleanIdParam),
      })
      .required()
      .safeParse(req.params);

    if (!params.success) {
      captureException(params.error, { extra: { params: req.params } });
      return res.redirect(302, JVA_URL);
    }

    const identity = identify(req);
    const mission = await missionService.findOneMission(params.data.id);
    if (!mission) {
      return res.redirect(302, JVA_URL);
    }
    if (!identity) {
      return res.redirect(302, mission.applicationUrl || JVA_URL);
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

      missionId: mission.id,
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
    const statBot = await statBotService.findStatBotByUser(identity.user);
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
        id: zod.string().transform(cleanIdParam),
      })
      .required()
      .safeParse(req.params);

    if (!params.success) {
      return res.redirect(302, JVA_URL);
    }

    const mission = await missionService.findOneMission(params.data.id);
    if (!mission) {
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

router.get("/:missionId/:publisherId", cors({ origin: "*" }), async (req, res) => {
  let href: string | null = null;
  try {
    const params = zod
      .object({
        missionId: zod.string(),
        publisherId: zod.string().transform(cleanIdParam),
      })
      .safeParse(req.params);

    const query = zod
      .object({
        tags: zod.string().optional(),
      })
      .safeParse(req.query);

    if (!params.success) {
      return res.redirect(302, "https://www.service-civique.gouv.fr/");
    }

    const identity = identify(req);

    const mission = await missionService.findOneMission(params.data.missionId);
    if (!mission) {
      return res.redirect(302, "https://www.service-civique.gouv.fr/");
    }
    if (!identity) {
      return res.redirect(302, mission.applicationUrl || JVA_URL);
    }
    href = mission.applicationUrl || JVA_URL;

    const fromPublisher = await publisherService.findOnePublisherById(params.data.publisherId);
    if (!fromPublisher) {
      return res.redirect(302, "https://www.service-civique.gouv.fr/");
    }

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
      missionId: mission.id,
      missionClientId: mission.clientId || "",
      missionDomain: mission.domain || "",
      missionTitle: mission.title || "",
      missionPostalCode: mission.postalCode || "",
      missionDepartmentName: mission.departmentName || "",
      missionOrganizationName: mission.organizationName || "",
      missionOrganizationId: mission.organizationId || "",
      missionOrganizationClientId: mission.organizationClientId || "",
      toPublisherId: mission.publisherId,
      toPublisherName: mission.publisherName || "",

      fromPublisherId: fromPublisher?.id || "",
      fromPublisherName: fromPublisher?.name || "",
      isBot: false,
      tags: query.data?.tags ? (query.data.tags.includes(",") ? query.data.tags.split(",").map((tag) => tag.trim()) : [query.data.tags]) : undefined,
    } as StatEventRecord;

    const clickId = await statEventService.createStatEvent(obj);

    let targetUrl = href;
    if (targetUrl.indexOf("http://") === -1 && targetUrl.indexOf("https://") === -1) {
      targetUrl = "https://" + targetUrl;
    }

    const url = new URL(targetUrl || JVA_URL);
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
    const statBot = await statBotService.findStatBotByUser(identity.user);
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
        campaignId: zod.string().transform(cleanIdParam),
      })
      .safeParse(req.params);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }

    const campaign = await campaignService.findCampaignById(params.data.campaignId);
    if (!campaign) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const fromPublisher = await publisherService.findOnePublisherById(campaign.fromPublisherId);
    if (!fromPublisher) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const statBot = await statBotService.findStatBotByUser(identity.user);

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
      toPublisherName: (await publisherService.findOnePublisherById(campaign.toPublisherId))?.name || "",

      fromPublisherId: fromPublisher.id,
      fromPublisherName: fromPublisher.name,

      source: "campaign",
      sourceId: campaign.id,
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
        publisherId: zod.string().transform(cleanIdParam),
      })
      .safeParse(req.params);

    const query = zod
      .object({
        tracker: zod.string().optional(),
        sourceId: zod.string().optional(),
        requestId: zod.string().optional(),
      })
      .safeParse(req.query);

    if (!params.success) {
      return res.status(400).send({ ok: false, code: INVALID_PARAMS, message: params.error });
    }
    if (!query.success) {
      return res.status(400).send({ ok: false, code: INVALID_QUERY, message: query.error });
    }

    const mission = await missionService.findOneMission(params.data.missionId);
    if (!mission) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const fromPublisher = await publisherService.findOnePublisherById(params.data.publisherId);
    if (!fromPublisher) {
      return res.status(404).send({ ok: false, code: NOT_FOUND });
    }

    const source = query.data.sourceId ? await widgetService.findOneWidgetById(query.data.sourceId) : null;

    const statBot = await statBotService.findStatBotByUser(identity.user);
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

      missionId: mission.id,
      missionClientId: mission.clientId || "",
      missionDomain: mission.domain || "",
      missionTitle: mission.title || "",
      missionPostalCode: mission.postalCode || "",
      missionDepartmentName: mission.departmentName || "",
      missionOrganizationName: mission.organizationName || "",
      missionOrganizationId: mission.organizationId || "",
      missionOrganizationClientId: mission.organizationClientId || "",
      toPublisherId: mission.publisherId,
      toPublisherName: mission.publisherName || "",

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
