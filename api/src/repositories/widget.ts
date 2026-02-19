import { Prisma, Widget } from "../db/core";
import { prisma } from "../db/postgres";

const defaultInclude = {
  fromPublisher: { select: { id: true, name: true } },
  rules: { orderBy: { position: Prisma.SortOrder.asc } },
  widgetPublishers: { select: { publisherId: true }, orderBy: { createdAt: Prisma.SortOrder.asc } },
} satisfies Prisma.WidgetInclude;

export const widgetRepository = {
  async findMany(params: Prisma.WidgetFindManyArgs = {}): Promise<Widget[]> {
    return prisma.widget.findMany({
      ...params,
      include: params.include ?? defaultInclude,
    }) as Promise<Widget[]>;
  },

  async findUnique(params: Prisma.WidgetFindUniqueArgs): Promise<Widget | null> {
    return prisma.widget.findUnique({
      ...params,
      include: params.include ?? defaultInclude,
    }) as Promise<Widget | null>;
  },

  async findFirst(params: Prisma.WidgetFindFirstArgs): Promise<Widget | null> {
    return prisma.widget.findFirst({
      ...params,
      include: params.include ?? defaultInclude,
    }) as Promise<Widget | null>;
  },

  async count(params: Prisma.WidgetCountArgs = {}): Promise<number> {
    return prisma.widget.count(params);
  },

  async create(params: Prisma.WidgetCreateArgs): Promise<Widget> {
    return prisma.widget.create({
      ...params,
      include: params.include ?? defaultInclude,
    });
  },

  async update(params: Prisma.WidgetUpdateArgs): Promise<Widget> {
    return prisma.widget.update({
      ...params,
      include: params.include ?? defaultInclude,
    });
  },
};
