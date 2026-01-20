import { randomUUID } from "crypto";
import { Prisma, WidgetRule } from "../db/core";
import { widgetRepository } from "../repositories/widget";
import type {
  WidgetCreateInput,
  WidgetLocation,
  WidgetRecord,
  WidgetRuleInput,
  WidgetRuleRecord,
  WidgetSearchParams,
  WidgetStyle,
  WidgetType,
  WidgetUpdatePatch,
} from "../types/widget";
import { publisherService } from "./publisher";

type PrismaWidgetWithRelations = Prisma.WidgetGetPayload<{
  include: {
    fromPublisher: { select: { id: true; name: true } };
    rules: true;
    widgetPublishers: { select: { publisherId: true } };
  };
}>;

const toRuleRecord = (rule: WidgetRule): WidgetRuleRecord => ({
  id: rule.id,
  field: rule.field,
  fieldType: rule.fieldType ?? null,
  operator: rule.operator,
  value: rule.value,
  combinator: rule.combinator as WidgetRuleRecord["combinator"],
  position: rule.position,
  createdAt: rule.createdAt,
  updatedAt: rule.updatedAt,
});

const toLocation = (lat: number | null | undefined, lon: number | null | undefined, label?: string | null): WidgetLocation => {
  if (lat == null || lon == null) {
    return null;
  }
  return { lat, lon, label: label ?? null };
};

const toWidgetRecord = (widget: PrismaWidgetWithRelations): WidgetRecord => ({
  id: widget.id,
  name: widget.name,
  color: widget.color,
  style: widget.style as WidgetStyle,
  type: widget.type as WidgetType,
  location: toLocation(widget.locationLat, widget.locationLong, widget.locationCity),
  distance: widget.distance,
  rules: (widget.rules ?? []).map(toRuleRecord),
  publishers: widget.widgetPublishers?.map((relation) => relation.publisherId) ?? [],
  url: widget.url ?? null,
  jvaModeration: widget.jvaModeration,
  fromPublisherId: widget.fromPublisherId,
  fromPublisherName: widget.fromPublisher?.name ?? null,
  active: widget.active,
  deletedAt: widget.deletedAt,
  createdAt: widget.createdAt,
  updatedAt: widget.updatedAt,
});

const buildWhere = (params: WidgetSearchParams): Prisma.WidgetWhereInput => {
  const and: Prisma.WidgetWhereInput[] = [];

  if (!params.includeDeleted) {
    and.push({ deletedAt: null });
  }

  if (params.active !== undefined) {
    and.push({ active: params.active });
  }

  if (params.search) {
    and.push({ name: { contains: params.search, mode: "insensitive" } });
  }

  if (params.fromPublisherId) {
    and.push({ fromPublisherId: params.fromPublisherId });
  } else if (params.fromPublisherIds !== undefined) {
    and.push({ fromPublisherId: { in: params.fromPublisherIds } });
  }

  if (!and.length) {
    return {};
  }

  return and.length === 1 ? and[0] : { AND: and };
};

const normalizePublishers = (publishers?: string[] | null): string[] => {
  if (!publishers || !publishers.length) {
    return [];
  }
  const set = new Set<string>();
  publishers.forEach((id) => {
    if (typeof id === "string" && id.trim()) {
      set.add(id.trim());
    }
  });
  return Array.from(set);
};

const normalizeRulesForCreate = (rules: WidgetRuleInput[] | undefined | null) => {
  if (!rules?.length) {
    return undefined;
  }
  return {
    create: rules.map((rule, index) => ({
      combinator: rule.combinator,
      field: rule.field,
      fieldType: rule.fieldType ?? undefined,
      operator: rule.operator,
      value: rule.value,
      position: index,
    })),
  };
};

const normalizeRulesForUpdate = (rules: WidgetRuleInput[] | undefined | null) => {
  if (rules === undefined) {
    return undefined;
  }
  if (!rules) {
    return { deleteMany: {} };
  }
  if (!rules.length) {
    return { deleteMany: {} };
  }
  return {
    deleteMany: {},
    create: rules.map((rule, index) => ({
      combinator: rule.combinator,
      field: rule.field,
      fieldType: rule.fieldType ?? undefined,
      operator: rule.operator,
      value: rule.value,
      position: index,
    })),
  };
};

const normalizePublishersForCreate = (publishers: string[]) => {
  if (!publishers.length) {
    return undefined;
  }
  return {
    create: publishers.map((publisherId) => ({ publisherId })),
  };
};

const normalizePublishersForUpdate = (publishers: string[] | undefined | null) => {
  if (publishers === undefined) {
    return undefined;
  }
  if (!publishers?.length) {
    return { deleteMany: {} };
  }
  return {
    deleteMany: {},
    create: publishers.map((publisherId) => ({ publisherId })),
  };
};

export const widgetService = {
  async findWidgets(params: WidgetSearchParams = {}): Promise<{ widgets: WidgetRecord[]; total: number }> {
    const where = buildWhere(params);
    const skip = params.skip ?? undefined;
    const take = params.take ?? undefined;

    const [rows, total] = await Promise.all([
      widgetRepository.findMany({
        where,
        orderBy: { createdAt: Prisma.SortOrder.desc },
        skip,
        take,
      }) as Promise<PrismaWidgetWithRelations[]>,
      widgetRepository.count({ where }),
    ]);

    return { widgets: rows.map(toWidgetRecord), total };
  },

  async findOneWidgetById(id: string, options: { includeDeleted?: boolean } = {}): Promise<WidgetRecord | null> {
    const where: Prisma.WidgetWhereInput = { id };
    if (!options.includeDeleted) {
      where.deletedAt = null;
    }
    const row = (await widgetRepository.findFirst({ where })) as PrismaWidgetWithRelations | null;

    return row ? toWidgetRecord(row) : null;
  },

  async findOneWidgetByName(name: string, options: { includeDeleted?: boolean } = {}): Promise<WidgetRecord | null> {
    const row = (await widgetRepository.findFirst({
      where: {
        name,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
      },
    })) as PrismaWidgetWithRelations | null;

    return row ? toWidgetRecord(row) : null;
  },

  async createWidget(input: WidgetCreateInput): Promise<WidgetRecord> {
    const fromPublisher = await publisherService.findOnePublisherById(input.fromPublisherId);
    if (!fromPublisher) {
      throw new Error(`Publisher ${input.fromPublisherId} not found`);
    }

    const publishers = normalizePublishers(input.publishers);
    const id = input.id ?? randomUUID();

    const data: Prisma.WidgetCreateInput = {
      id,
      name: input.name,
      color: input.color ?? "#000091",
      style: input.style ?? "page",
      type: input.type ?? "benevolat",
      locationLat: input.location?.lat ?? null,
      locationLong: input.location?.lon ?? null,
      locationCity: input.location?.label ?? null,
      distance: input.distance ?? "25km",
      url: input.url ?? undefined,
      jvaModeration: input.jvaModeration ?? false,
      active: input.active ?? true,
      deletedAt: input.deletedAt ?? undefined,
      createdAt: input.createdAt ?? undefined,
      updatedAt: input.updatedAt ?? undefined,
      fromPublisher: { connect: { id: fromPublisher.id } },
      rules: normalizeRulesForCreate(input.rules),
      widgetPublishers: normalizePublishersForCreate(publishers),
    };

    const created = (await widgetRepository.create({ data })) as PrismaWidgetWithRelations;
    return toWidgetRecord(created);
  },

  async updateWidget(id: string, patch: WidgetUpdatePatch): Promise<WidgetRecord> {
    const data: Prisma.WidgetUpdateInput = {};

    if (patch.name !== undefined) {
      data.name = patch.name;
    }
    if (patch.color !== undefined) {
      data.color = patch.color;
    }
    if (patch.style !== undefined) {
      data.style = patch.style;
    }
    if (patch.type !== undefined) {
      data.type = patch.type;
    }
    if (patch.distance !== undefined) {
      data.distance = patch.distance;
    }
    if (patch.publishers !== undefined) {
      const publishers = normalizePublishers(patch.publishers);
      const widgetPublishers = normalizePublishersForUpdate(publishers);
      if (widgetPublishers !== undefined) {
        data.widgetPublishers = widgetPublishers;
      }
    }
    if (patch.url !== undefined) {
      data.url = patch.url;
    }
    if (patch.jvaModeration !== undefined) {
      data.jvaModeration = patch.jvaModeration;
    }
    if (patch.active !== undefined) {
      data.active = patch.active;
    }
    if (patch.location !== undefined) {
      data.locationLat = patch.location?.lat ?? null;
      data.locationLong = patch.location?.lon ?? null;
      data.locationCity = patch.location?.label ?? null;
    }
    if (patch.rules !== undefined) {
      data.rules = normalizeRulesForUpdate(patch.rules);
    }
    if (patch.deletedAt !== undefined) {
      data.deletedAt = patch.deletedAt;
    }

    const updated = (await widgetRepository.update({
      where: { id },
      data,
    })) as PrismaWidgetWithRelations;

    return toWidgetRecord(updated);
  },

  async findWidgetsForSync(): Promise<WidgetRecord[]> {
    const rows = (await widgetRepository.findMany({
      orderBy: { createdAt: Prisma.SortOrder.asc },
    })) as PrismaWidgetWithRelations[];
    return rows.map(toWidgetRecord);
  },
};
