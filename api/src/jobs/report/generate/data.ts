import { Publisher, StatsReport } from "../../../types";

import { getReportAggregations, HistogramBucket } from "./report-stats-source";

export const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const search = async (id: string, month: number, year: number, flux: "to" | "from") => {
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

  const aggregations = await getReportAggregations({
    publisherId: id,
    month,
    year,
    flux,
  });

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
  clickBucket: HistogramBucket[],
  clickLastYearBucket: HistogramBucket[],
  applyBucket: HistogramBucket[],
  applyLastYearBucket: HistogramBucket[],
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
