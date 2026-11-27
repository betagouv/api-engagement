import { z } from "zod";

import { metabaseService } from "@/services/metabase";
import type { PublisherRecord } from "@/types/publisher";

import { RANKING_CARD_IDS, TOTAL_EVENTS_CARD_IDS } from "@/jobs/report/config";

export const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const cardResultSchema = z.object({
  data: z.object({
    cols: z.array(z.object({ name: z.string() })),
    rows: z.array(z.array(z.unknown())),
  }),
});

const eventCountSchema = z.union([z.number(), z.string(), z.null()]).transform(Number).pipe(z.number().int().nonnegative());
const totalsSchema = z.object({
  total_click: eventCountSchema,
  total_apply: eventCountSchema,
});

const rankingSchema = z.object({ name: z.string().nullable(), apply: eventCountSchema });

export type ReportActivity = {
  click: number;
  apply: number;
  clickChangePct?: number;
  applyChangePct?: number;
  conversionRatePct?: number;
  conversionChangePp?: number;
  topPublisher?: string;
  topPublisherApply?: number;
};

export type ReportStats = Partial<Record<"receive" | "send", ReportActivity>>;

export const hasEnoughStats = (activity?: ReportActivity): boolean => !!activity && activity.click >= 10 && activity.apply >= 1;

const queryRows = async (cardId: number, year: number, month: number, publisherId: string, extraVariables?: { type: "apply" }) => {
  const response = await metabaseService.queryCard(cardId, {
    variables: {
      publisher_id: publisherId,
      // Les cartes reçoivent des jours civils, comme après conversion par le proxy du back-office.
      from: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10),
      to: new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10),
      ...extraVariables,
    },
  });
  if (!response.ok) {
    throw new Error(`Metabase report card ${cardId} returned ${response.status}`);
  }

  const { cols, rows } = cardResultSchema.parse(response.data).data;

  return rows.map((row) => Object.fromEntries(cols.map(({ name }, index) => [name, row[index]])));
};

const getTotals = async (cardId: number, year: number, month: number, publisherId: string) => {
  const [row] = await queryRows(cardId, year, month, publisherId);

  return row ? totalsSchema.parse(row) : { total_click: 0, total_apply: 0 };
};

const getTopPartner = async (activity: keyof ReportStats, year: number, month: number, publisher: PublisherRecord) => {
  const rows = await queryRows(RANKING_CARD_IDS[activity], year, month, publisher.id, activity === "receive" ? { type: "apply" } : undefined);
  const partners = rows.map((row) => rankingSchema.parse({ name: row.publisher_name, apply: row.apply_count ?? row.doc_count }));
  const publisherName = publisher.name.trim().toLowerCase();
  const top = partners
    .filter((partner) => {
      const name = partner.name?.trim().toLowerCase();
      return name && name !== publisherName && partner.apply > 0;
    })
    .sort((a, b) => b.apply - a.apply)[0];

  if (!top?.name) {
    return {};
  }

  return { topPublisher: top.name, topPublisherApply: top.apply };
};

const getActivityStats = async (activity: keyof ReportStats, year: number, month: number, publisher: PublisherRecord): Promise<ReportActivity> => {
  const totalsCardId = TOTAL_EVENTS_CARD_IDS[activity];
  const { total_click: click, total_apply: apply } = await getTotals(totalsCardId, year, month, publisher.id);
  const conversion = click > 0 ? (100 * apply) / click : undefined;
  const current = { click, apply, conversionRatePct: conversion === undefined ? undefined : Number(conversion.toFixed(2)) };

  if (!hasEnoughStats(current)) {
    return current;
  }

  const [{ total_click: previousClick, total_apply: previousApply }, topPartner] = await Promise.all([
    getTotals(totalsCardId, year, month - 1, publisher.id),
    getTopPartner(activity, year, month, publisher),
  ]);

  return {
    ...current,
    ...topPartner,
    clickChangePct: previousClick ? Number(((100 * (click - previousClick)) / previousClick).toFixed(1)) : undefined,
    applyChangePct: previousApply ? Number(((100 * (apply - previousApply)) / previousApply).toFixed(1)) : undefined,
    conversionChangePp: conversion !== undefined && previousClick ? Number((conversion - (100 * previousApply) / previousClick).toFixed(1)) : undefined,
  };
};

export const getData = async (year: number, month: number, publisher: PublisherRecord): Promise<ReportStats> => {
  const isDiffuseur = publisher.hasApiRights || publisher.hasWidgetRights || publisher.hasCampaignRights;
  const stats: ReportStats = {};
  if (publisher.isAnnonceur) {
    stats.receive = await getActivityStats("receive", year, month, publisher);
  }
  if (isDiffuseur) {
    stats.send = await getActivityStats("send", year, month, publisher);
  }
  return stats;
};
