import type { Schema } from "mongoose";

export interface KpiBaseFields {
  date: Date;

  availableBenevolatMissionCount: number;
  availableVolontariatMissionCount: number;

  availableJvaMissionCount: number;

  availableBenevolatGivenPlaceCount: number;
  availableVolontariatGivenPlaceCount: number;

  availableBenevolatAttributedPlaceCount: number;
  availableVolontariatAttributedPlaceCount: number;

  percentageBenevolatGivenPlaces: number;
  percentageVolontariatGivenPlaces: number;

  percentageBenevolatAttributedPlaces: number;
  percentageVolontariatAttributedPlaces: number;

  benevolatPrintMissionCount: number;
  volontariatPrintMissionCount: number;

  benevolatClickMissionCount: number;
  volontariatClickMissionCount: number;

  benevolatApplyMissionCount: number;
  volontariatApplyMissionCount: number;

  benevolatAccountMissionCount: number;
  volontariatAccountMissionCount: number;

  benevolatPrintCount: number;
  volontariatPrintCount: number;

  benevolatClickCount: number;
  volontariatClickCount: number;

  benevolatApplyCount: number;
  volontariatApplyCount: number;

  benevolatAccountCount: number;
  volontariatAccountCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface Kpi extends KpiBaseFields {
  _id: Schema.Types.ObjectId;
}

type KpiMutableFields = Omit<KpiBaseFields, "createdAt" | "updatedAt">;

export interface KpiRecord extends KpiBaseFields {
  id: string;
}

export type KpiFindParams = {
  dateFrom?: Date;
  dateTo?: Date;
  order?: "asc" | "desc";
};

export type KpiCreateInput = Partial<KpiMutableFields> & {
  date: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

export type KpiUpdatePatch = Partial<KpiMutableFields> & {
  date?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};
