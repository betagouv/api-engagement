import { Prisma, Widget } from "../db/core";
import { prismaCore } from "../db/postgres";

const defaultInclude = Prisma.validator<Prisma.WidgetInclude>()({
  fromPublisher: { select: { id: true, name: true } },
  rules: { orderBy: { position: Prisma.SortOrder.asc } },
});

export const widgetRepository = {
  async findMany(params: Prisma.WidgetFindManyArgs = {}): Promise<Widget[]> {
    return prismaCore.widget.findMany({
      ...params,
      include: params.include ?? defaultInclude,
    }) as Promise<Widget[]>;
  },

  async findUnique(params: Prisma.WidgetFindUniqueArgs): Promise<Widget | null> {
    return prismaCore.widget.findUnique({
      ...params,
      include: params.include ?? defaultInclude,
    }) as Promise<Widget | null>;
  },

  async findFirst(params: Prisma.WidgetFindFirstArgs): Promise<Widget | null> {
    return prismaCore.widget.findFirst({
      ...params,
      include: params.include ?? defaultInclude,
    }) as Promise<Widget | null>;
  },

  async count(params: Prisma.WidgetCountArgs = {}): Promise<number> {
    return prismaCore.widget.count(params);
  },

  async create(params: Prisma.WidgetCreateArgs): Promise<Widget> {
    return prismaCore.widget.create({
      ...params,
      include: params.include ?? defaultInclude,
    });
  },

  async update(params: Prisma.WidgetUpdateArgs): Promise<Widget> {
    return prismaCore.widget.update({
      ...params,
      include: params.include ?? defaultInclude,
    });
  },
};
