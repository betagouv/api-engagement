import { STATS_INDEX } from "../../../config";
import esClient from "../../../db/elastic";
import { Publisher, StatsReport } from "../../../types";

export const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const search = async (id: string, month: number, year: number, flux: string) => {
  // timezone remove
  const startMonth = new Date(year, month, 1);
  const startLastMonth = new Date(year, month - 1, 1);
  const endMonth = new Date(year, month + 1, 1);
  const endLastMonth = new Date(year, month, 1);

  const startLastSixMonths = new Date(year, month - 5, 1);
  const endLastSixMonths = new Date(year, month + 1, 1);

  const startYear = new Date(year - 1, month + 1, 1);
  const endYear = new Date(year, month + 1, 1);
  const startLastYear = new Date(year - 2, month + 1, 1);
  const endLastYear = new Date(year - 1, month + 1, 1);

  const publisherName = flux === "to" ? "fromPublisherName.keyword" : "toPublisherName.keyword";
  const publisherId = flux === "to" ? "toPublisherId.keyword" : "fromPublisherId.keyword";

  const response = await esClient.search({
    index: STATS_INDEX,
    body: {
      query: {
        bool: {
          must_not: { term: { isBot: true } },
          filter: { term: { [publisherId]: id } },
        },
      },
      aggs: {
        print: {
          filter: { term: { "type.keyword": "print" } },
          aggs: {
            month: {
              filter: { range: { createdAt: { gte: startMonth, lte: endMonth } } },
              aggs: { top: { terms: { field: publisherName, size: 3 } } },
            },
            lastMonth: {
              filter: { range: { createdAt: { gte: startLastMonth, lte: endLastMonth } } },
            },
          },
        },
        click: {
          filter: { term: { "type.keyword": "click" } },
          aggs: {
            month: {
              filter: { range: { createdAt: { gte: startMonth, lte: endMonth } } },
              aggs: {
                topPublishers: { terms: { field: publisherName, size: 5 } },
                topOrganizations: { terms: { field: "missionOrganizationName.keyword", size: 5 } },
              },
            },
            lastMonth: {
              filter: { range: { createdAt: { gte: startLastMonth, lte: endLastMonth } } },
            },
            year: {
              filter: { range: { createdAt: { gte: startYear, lte: endYear } } },
              aggs: {
                histogram: {
                  date_histogram: {
                    field: "createdAt",
                    interval: "month",
                    min_doc_count: 0,
                    time_zone: "Europe/Paris",
                  },
                },
              },
            },
            lastYear: {
              filter: { range: { createdAt: { gte: startLastYear, lte: endLastYear } } },
              aggs: {
                histogram: {
                  date_histogram: {
                    field: "createdAt",
                    interval: "month",
                    min_doc_count: 0,
                    time_zone: "Europe/Paris",
                  },
                },
              },
            },
            lastSixMonths: {
              filter: { range: { createdAt: { gte: startLastSixMonths, lte: endLastSixMonths } } },
              aggs: {
                histogram: {
                  date_histogram: {
                    field: "createdAt",
                    interval: "month",
                    time_zone: "Europe/Paris",
                  },
                  aggs: {
                    orga: { terms: { field: "missionOrganizationName.keyword", size: 100 } },
                  },
                },
              },
            },
          },
        },
        apply: {
          filter: { term: { "type.keyword": "apply" } },
          aggs: {
            month: {
              filter: { range: { createdAt: { gte: startMonth, lte: endMonth } } },
              aggs: { top: { terms: { field: publisherName, size: 3 } } },
            },
            lastMonth: {
              filter: { range: { createdAt: { gte: startLastMonth, lte: endLastMonth } } },
            },
            year: {
              filter: { range: { createdAt: { gte: startYear, lte: endYear } } },
              aggs: {
                histogram: {
                  date_histogram: {
                    field: "createdAt",
                    interval: "month",
                    min_doc_count: 0,
                    time_zone: "Europe/Paris",
                  },
                },
              },
            },
            lastYear: {
              filter: { range: { createdAt: { gte: startLastYear, lte: endLastYear } } },
              aggs: {
                histogram: {
                  date_histogram: {
                    field: "createdAt",
                    interval: "month",
                    time_zone: "Europe/Paris",
                  },
                },
              },
            },
          },
        },
        acccount: {
          filter: { term: { "type.keyword": "account" } },
          aggs: {
            month: {
              filter: { range: { createdAt: { gte: startMonth, lte: endMonth } } },
            },
            lastMonth: {
              filter: { range: { createdAt: { gte: startLastMonth, lte: endLastMonth } } },
            },
          },
        },
      },
      size: 0,
    },
  });

  const aggregations = response.body.aggregations;

  const data = {
    hasStats: aggregations.click.month.doc_count > 9 && aggregations.apply.month.doc_count !== 0, // Abritrary threshold so the report is not empty
    print: aggregations.print.month.doc_count,
    printLastMonth: aggregations.print.lastMonth.doc_count,
    click: aggregations.click.month.doc_count,
    clickLastMonth: aggregations.click.lastMonth.doc_count,
    clickYear: aggregations.click.year.doc_count,
    clickLastYear: aggregations.click.lastYear.doc_count,
    apply: aggregations.apply.month.doc_count,
    applyLastMonth: aggregations.apply.lastMonth.doc_count,
    applyYear: aggregations.apply.year.doc_count,
    applyLastYear: aggregations.apply.lastYear.doc_count,
    account: aggregations.acccount.month.doc_count,
    accountLastMonth: aggregations.acccount.lastMonth.doc_count,
    topPublishers: aggregations.click.month.topPublishers.buckets,
    topOrganizations: aggregations.click.month.topOrganizations.buckets,

    graphYears: buildGraph(
      aggregations.click.year.histogram.buckets,
      aggregations.click.lastYear.histogram.buckets,
      aggregations.apply.year.histogram.buckets,
      aggregations.apply.lastYear.histogram.buckets,
      startYear
    ),
    organizationHistogram: buildHistogram(aggregations.click.lastSixMonths.histogram.buckets, aggregations.click.month.topOrganizations.buckets),
  };

  return data;
};

const buildGraph = (
  clickBucket: { key: string; doc_count: number }[],
  clickLastYearBucket: { key: string; doc_count: number }[],
  applyBucket: { key: string; doc_count: number }[],
  applyLastYearBucket: { key: string; doc_count: number }[],
  startDate: Date
) => {
  // Construct labels, with all months between start and end of the 1st bucket
  const data = [];

  for (let i = startDate.getMonth(); i < startDate.getMonth() + 12; i++) {
    const month = new Date(startDate.getFullYear(), i, 1);
    const c = clickBucket.find((v) => new Date(v.key).getMonth() === month.getMonth() && new Date(v.key).getFullYear() === month.getFullYear());
    const cly = clickLastYearBucket.find((v) => new Date(v.key).getMonth() === month.getMonth() && new Date(v.key).getFullYear() === month.getFullYear() - 1);
    const a = applyBucket.find((v) => new Date(v.key).getMonth() === month.getMonth() && new Date(v.key).getFullYear() === month.getFullYear());
    const aly = applyLastYearBucket.find((v) => new Date(v.key).getMonth() === month.getMonth() && new Date(v.key).getFullYear() === month.getFullYear() - 1);

    const d = {
      month,
      click: c ? c.doc_count : 0,
      clickLastYear: cly ? cly.doc_count : 0,
      apply: a ? a.doc_count : 0,
      applyLastYear: aly ? aly.doc_count : 0,
    };
    data.push(d);
  }
  return data;
};

const buildHistogram = (buckets: any[], topOrganizations: { key: string }[]) => {
  const data = [] as any[];
  buckets.forEach((b) => {
    const d = {
      month: new Date(b.key),
    } as { [key: string]: number | Date };

    topOrganizations.forEach((o) => {
      d[o.key] = b.orga.buckets.find((v: { key: string }) => v.key === o.key)?.doc_count || 0;
    });

    data.push(d);
  });
  return data;
};

export const getData = async (year: number, month: number, publisher: Publisher) => {
  const data = {
    publisherName: publisher.name,
    publisherLogo: publisher.logo,
    year,
    month,
    monthName: MONTHS[month],
    id: publisher._id.toString(),
  } as StatsReport;

  if (publisher.isAnnonceur) {
    data.receive = await search(publisher._id.toString(), month, year, "to");
  }
  if (publisher.hasApiRights || publisher.hasWidgetRights || publisher.hasCampaignRights) {
    data.send = await search(publisher._id.toString(), month, year, "from");
  }

  return data;
};
