import { Kpi, Prisma } from "../db/core";
import { kpiRepository } from "../repositories/kpi";
import type { KpiCreateInput, KpiFindParams, KpiRecord, KpiUpdatePatch } from "../types/kpi";

const toKpiRecord = (kpi: Kpi): KpiRecord => ({
  id: kpi.id,
  date: kpi.date,
  availableBenevolatMissionCount: kpi.availableBenevolatMissionCount,
  availableVolontariatMissionCount: kpi.availableVolontariatMissionCount,
  availableJvaMissionCount: kpi.availableJvaMissionCount,
  availableBenevolatGivenPlaceCount: kpi.availableBenevolatGivenPlaceCount,
  availableVolontariatGivenPlaceCount: kpi.availableVolontariatGivenPlaceCount,
  availableBenevolatAttributedPlaceCount: kpi.availableBenevolatAttributedPlaceCount,
  availableVolontariatAttributedPlaceCount: kpi.availableVolontariatAttributedPlaceCount,
  percentageBenevolatGivenPlaces: kpi.percentageBenevolatGivenPlaces,
  percentageVolontariatGivenPlaces: kpi.percentageVolontariatGivenPlaces,
  percentageBenevolatAttributedPlaces: kpi.percentageBenevolatAttributedPlaces,
  percentageVolontariatAttributedPlaces: kpi.percentageVolontariatAttributedPlaces,
  benevolatPrintMissionCount: kpi.benevolatPrintMissionCount,
  volontariatPrintMissionCount: kpi.volontariatPrintMissionCount,
  benevolatClickMissionCount: kpi.benevolatClickMissionCount,
  volontariatClickMissionCount: kpi.volontariatClickMissionCount,
  benevolatApplyMissionCount: kpi.benevolatApplyMissionCount,
  volontariatApplyMissionCount: kpi.volontariatApplyMissionCount,
  benevolatAccountMissionCount: kpi.benevolatAccountMissionCount,
  volontariatAccountMissionCount: kpi.volontariatAccountMissionCount,
  benevolatPrintCount: kpi.benevolatPrintCount,
  volontariatPrintCount: kpi.volontariatPrintCount,
  benevolatClickCount: kpi.benevolatClickCount,
  volontariatClickCount: kpi.volontariatClickCount,
  benevolatApplyCount: kpi.benevolatApplyCount,
  volontariatApplyCount: kpi.volontariatApplyCount,
  benevolatAccountCount: kpi.benevolatAccountCount,
  volontariatAccountCount: kpi.volontariatAccountCount,
  createdAt: kpi.createdAt,
  updatedAt: kpi.updatedAt,
});

const withDefaultNumber = (value: number | undefined): number => (typeof value === "number" ? value : 0);

const buildCreateData = (input: KpiCreateInput): Prisma.KpiCreateInput => ({
  date: input.date,
  availableBenevolatMissionCount: withDefaultNumber(input.availableBenevolatMissionCount),
  availableVolontariatMissionCount: withDefaultNumber(input.availableVolontariatMissionCount),
  availableJvaMissionCount: withDefaultNumber(input.availableJvaMissionCount),
  availableBenevolatGivenPlaceCount: withDefaultNumber(input.availableBenevolatGivenPlaceCount),
  availableVolontariatGivenPlaceCount: withDefaultNumber(input.availableVolontariatGivenPlaceCount),
  availableBenevolatAttributedPlaceCount: withDefaultNumber(input.availableBenevolatAttributedPlaceCount),
  availableVolontariatAttributedPlaceCount: withDefaultNumber(input.availableVolontariatAttributedPlaceCount),
  percentageBenevolatGivenPlaces: withDefaultNumber(input.percentageBenevolatGivenPlaces),
  percentageVolontariatGivenPlaces: withDefaultNumber(input.percentageVolontariatGivenPlaces),
  percentageBenevolatAttributedPlaces: withDefaultNumber(input.percentageBenevolatAttributedPlaces),
  percentageVolontariatAttributedPlaces: withDefaultNumber(input.percentageVolontariatAttributedPlaces),
  benevolatPrintMissionCount: withDefaultNumber(input.benevolatPrintMissionCount),
  volontariatPrintMissionCount: withDefaultNumber(input.volontariatPrintMissionCount),
  benevolatClickMissionCount: withDefaultNumber(input.benevolatClickMissionCount),
  volontariatClickMissionCount: withDefaultNumber(input.volontariatClickMissionCount),
  benevolatApplyMissionCount: withDefaultNumber(input.benevolatApplyMissionCount),
  volontariatApplyMissionCount: withDefaultNumber(input.volontariatApplyMissionCount),
  benevolatAccountMissionCount: withDefaultNumber(input.benevolatAccountMissionCount),
  volontariatAccountMissionCount: withDefaultNumber(input.volontariatAccountMissionCount),
  benevolatPrintCount: withDefaultNumber(input.benevolatPrintCount),
  volontariatPrintCount: withDefaultNumber(input.volontariatPrintCount),
  benevolatClickCount: withDefaultNumber(input.benevolatClickCount),
  volontariatClickCount: withDefaultNumber(input.volontariatClickCount),
  benevolatApplyCount: withDefaultNumber(input.benevolatApplyCount),
  volontariatApplyCount: withDefaultNumber(input.volontariatApplyCount),
  benevolatAccountCount: withDefaultNumber(input.benevolatAccountCount),
  volontariatAccountCount: withDefaultNumber(input.volontariatAccountCount),
  createdAt: input.createdAt ?? undefined,
  updatedAt: input.updatedAt ?? undefined,
});

const buildUpdateData = (patch: KpiUpdatePatch): Prisma.KpiUpdateInput => {
  const data: Prisma.KpiUpdateInput = {};

  if ("date" in patch) {
    data.date = patch.date ?? undefined;
  }
  if ("availableBenevolatMissionCount" in patch) {
    data.availableBenevolatMissionCount = withDefaultNumber(patch.availableBenevolatMissionCount);
  }
  if ("availableVolontariatMissionCount" in patch) {
    data.availableVolontariatMissionCount = withDefaultNumber(patch.availableVolontariatMissionCount);
  }
  if ("availableJvaMissionCount" in patch) {
    data.availableJvaMissionCount = withDefaultNumber(patch.availableJvaMissionCount);
  }
  if ("availableBenevolatGivenPlaceCount" in patch) {
    data.availableBenevolatGivenPlaceCount = withDefaultNumber(patch.availableBenevolatGivenPlaceCount);
  }
  if ("availableVolontariatGivenPlaceCount" in patch) {
    data.availableVolontariatGivenPlaceCount = withDefaultNumber(patch.availableVolontariatGivenPlaceCount);
  }
  if ("availableBenevolatAttributedPlaceCount" in patch) {
    data.availableBenevolatAttributedPlaceCount = withDefaultNumber(patch.availableBenevolatAttributedPlaceCount);
  }
  if ("availableVolontariatAttributedPlaceCount" in patch) {
    data.availableVolontariatAttributedPlaceCount = withDefaultNumber(patch.availableVolontariatAttributedPlaceCount);
  }
  if ("percentageBenevolatGivenPlaces" in patch) {
    data.percentageBenevolatGivenPlaces = withDefaultNumber(patch.percentageBenevolatGivenPlaces);
  }
  if ("percentageVolontariatGivenPlaces" in patch) {
    data.percentageVolontariatGivenPlaces = withDefaultNumber(patch.percentageVolontariatGivenPlaces);
  }
  if ("percentageBenevolatAttributedPlaces" in patch) {
    data.percentageBenevolatAttributedPlaces = withDefaultNumber(patch.percentageBenevolatAttributedPlaces);
  }
  if ("percentageVolontariatAttributedPlaces" in patch) {
    data.percentageVolontariatAttributedPlaces = withDefaultNumber(patch.percentageVolontariatAttributedPlaces);
  }
  if ("benevolatPrintMissionCount" in patch) {
    data.benevolatPrintMissionCount = withDefaultNumber(patch.benevolatPrintMissionCount);
  }
  if ("volontariatPrintMissionCount" in patch) {
    data.volontariatPrintMissionCount = withDefaultNumber(patch.volontariatPrintMissionCount);
  }
  if ("benevolatClickMissionCount" in patch) {
    data.benevolatClickMissionCount = withDefaultNumber(patch.benevolatClickMissionCount);
  }
  if ("volontariatClickMissionCount" in patch) {
    data.volontariatClickMissionCount = withDefaultNumber(patch.volontariatClickMissionCount);
  }
  if ("benevolatApplyMissionCount" in patch) {
    data.benevolatApplyMissionCount = withDefaultNumber(patch.benevolatApplyMissionCount);
  }
  if ("volontariatApplyMissionCount" in patch) {
    data.volontariatApplyMissionCount = withDefaultNumber(patch.volontariatApplyMissionCount);
  }
  if ("benevolatAccountMissionCount" in patch) {
    data.benevolatAccountMissionCount = withDefaultNumber(patch.benevolatAccountMissionCount);
  }
  if ("volontariatAccountMissionCount" in patch) {
    data.volontariatAccountMissionCount = withDefaultNumber(patch.volontariatAccountMissionCount);
  }
  if ("benevolatPrintCount" in patch) {
    data.benevolatPrintCount = withDefaultNumber(patch.benevolatPrintCount);
  }
  if ("volontariatPrintCount" in patch) {
    data.volontariatPrintCount = withDefaultNumber(patch.volontariatPrintCount);
  }
  if ("benevolatClickCount" in patch) {
    data.benevolatClickCount = withDefaultNumber(patch.benevolatClickCount);
  }
  if ("volontariatClickCount" in patch) {
    data.volontariatClickCount = withDefaultNumber(patch.volontariatClickCount);
  }
  if ("benevolatApplyCount" in patch) {
    data.benevolatApplyCount = withDefaultNumber(patch.benevolatApplyCount);
  }
  if ("volontariatApplyCount" in patch) {
    data.volontariatApplyCount = withDefaultNumber(patch.volontariatApplyCount);
  }
  if ("benevolatAccountCount" in patch) {
    data.benevolatAccountCount = withDefaultNumber(patch.benevolatAccountCount);
  }
  if ("volontariatAccountCount" in patch) {
    data.volontariatAccountCount = withDefaultNumber(patch.volontariatAccountCount);
  }
  if ("createdAt" in patch) {
    data.createdAt = patch.createdAt ?? undefined;
  }
  if ("updatedAt" in patch) {
    data.updatedAt = patch.updatedAt ?? undefined;
  }

  return data;
};

export const kpiService = {
  async findKpis(params: KpiFindParams = {}): Promise<KpiRecord[]> {
    const where: Prisma.KpiWhereInput = {};

    if (params.dateFrom || params.dateTo) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (params.dateFrom) {
        dateFilter.gte = params.dateFrom;
      }
      if (params.dateTo) {
        dateFilter.lte = params.dateTo;
      }
      where.date = dateFilter;
    }

    const orderBy = {
      date: params.order === "asc" ? Prisma.SortOrder.asc : Prisma.SortOrder.desc,
    };

    const kpis = await kpiRepository.find({
      where,
      orderBy,
    });
    return kpis.map(toKpiRecord);
  },

  async findOneKpi(where: Prisma.KpiWhereUniqueInput): Promise<KpiRecord | null> {
    const kpi = await kpiRepository.findOne({ where });
    return kpi ? toKpiRecord(kpi) : null;
  },

  async findOneKpiByDate(date: Date): Promise<KpiRecord | null> {
    return this.findOneKpi({ date });
  },

  async findOneKpiById(id: string): Promise<KpiRecord | null> {
    return this.findOneKpi({ id });
  },

  async createKpi(input: KpiCreateInput): Promise<KpiRecord> {
    const data = buildCreateData(input);
    const created = await kpiRepository.create(data);
    return toKpiRecord(created);
  },

  async updateKpi(id: string, patch: KpiUpdatePatch): Promise<KpiRecord> {
    const data = buildUpdateData(patch);
    const updated = await kpiRepository.update({ id }, data);
    return toKpiRecord(updated);
  },
};
