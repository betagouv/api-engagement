import { STATS_INDEX } from "../../config";
import esClient from "../../db/elastic";
import { prismaCore } from "../../db/postgres";

type MissionStatsDetails = {
  key: string;
  doc_count: number;
  name?: string;
  logo?: string;
  url?: string;
};

type MissionStatsSummary = {
  key: string;
  doc_count: number;
};

export async function getMissionStatsWithDetails(missionId: string): Promise<{ clicks: MissionStatsDetails[]; applications: MissionStatsDetails[] }> {
  if (getReadStatsFrom() === "pg") {
    const [applications, clicks] = await Promise.all([
      prismaCore.statEvent.groupBy({
        by: ["from_publisher_id", "from_publisher_name"],
        where: {
          mission_id: missionId,
          is_bot: false,
          type: "apply",
        },
        _count: { _all: true },
      }),
      prismaCore.statEvent.groupBy({
        by: ["from_publisher_id", "from_publisher_name"],
        where: {
          mission_id: missionId,
          is_bot: false,
          type: "click",
        },
        _count: { _all: true },
      }),
    ]);

    const mapGroup = (group: { from_publisher_id: string | null; from_publisher_name: string | null; _count: { _all: number } }): MissionStatsDetails => ({
      key: group.from_publisher_id ?? "",
      name: group.from_publisher_name ?? undefined,
      logo: undefined,
      url: undefined,
      doc_count: group._count._all,
    });

    return {
      applications: applications.map(mapGroup),
      clicks: clicks.map(mapGroup),
    };
  }

  const query = {
    query: {
      bool: {
        must_not: [{ term: { isBot: true } }],
        must: [{ term: { "missionId.keyword": missionId } }],
      },
    },
    aggs: {
      apply: {
        filter: { term: { type: "apply" } },
        aggs: {
          data: {
            terms: { field: "fromPublisherId.keyword", size: 100 },
            aggs: { hits: { top_hits: { size: 1 } } },
          },
        },
      },
      click: {
        filter: { term: { type: "click" } },
        aggs: {
          data: {
            terms: { field: "fromPublisherId.keyword", size: 100 },
            aggs: { hits: { top_hits: { size: 1 } } },
          },
        },
      },
    },
    size: 0,
  };

  const raw = await esClient.msearch({ body: [{ index: STATS_INDEX }, query] });
  const response = raw.body.responses[0];
  const applications = mapEsBuckets(response?.aggregations?.apply?.data?.buckets ?? []);
  const clicks = mapEsBuckets(response?.aggregations?.click?.data?.buckets ?? []);
  return { applications, clicks };
}

export async function getMissionStatsSummary(missionId: string): Promise<{ clicks: MissionStatsSummary[]; applications: MissionStatsSummary[] }> {
  if (getReadStatsFrom() === "pg") {
    const [clicks, applications] = await Promise.all([
      prismaCore.statEvent.groupBy({
        by: ["from_publisher_name"],
        where: {
          mission_id: missionId,
          is_bot: false,
          type: "click",
        },
        _count: { _all: true },
      }),
      prismaCore.statEvent.groupBy({
        by: ["from_publisher_name"],
        where: {
          mission_id: missionId,
          is_bot: false,
          type: "apply",
        },
        _count: { _all: true },
      }),
    ]);

    const mapGroup = (group: { from_publisher_name: string | null; _count: { _all: number } }): MissionStatsSummary => ({
      key: group.from_publisher_name ?? "",
      doc_count: group._count._all,
    });

    return {
      clicks: clicks.map(mapGroup),
      applications: applications.map(mapGroup),
    };
  }

  const clicksQuery = {
    query: {
      bool: {
        must_not: [{ term: { isBot: true } }],
        must: [
          { term: { "missionId.keyword": missionId } },
          { term: { "type.keyword": "click" } },
        ],
      },
    },
    aggs: { mission: { terms: { field: "fromPublisherName.keyword" } } },
    size: 0,
  };

  const applicationsQuery = {
    query: {
      bool: {
        must_not: [{ term: { isBot: true } }],
        must: [
          { term: { "missionId.keyword": missionId } },
          { term: { "type.keyword": "apply" } },
        ],
      },
    },
    aggs: { mission: { terms: { field: "fromPublisherName.keyword" } } },
    size: 0,
  };

  const stats = await esClient.msearch({
    body: [{ index: STATS_INDEX }, clicksQuery, { index: STATS_INDEX }, applicationsQuery],
  });

  const [clicksResponse, applicationsResponse] = stats.body.responses;

  return {
    clicks: mapEsMissionBuckets(clicksResponse?.aggregations?.mission?.buckets ?? []),
    applications: mapEsMissionBuckets(applicationsResponse?.aggregations?.mission?.buckets ?? []),
  };
}

function mapEsBuckets(buckets: any[]): MissionStatsDetails[] {
  return buckets.map((bucket) => {
    const topHit = bucket?.hits?.hits?.hits?.[0]?._source ?? {};
    return {
      key: bucket.key,
      doc_count: bucket.doc_count,
      logo: topHit.fromPublisherLogo,
      name: topHit.fromPublisherName,
      url: topHit.fromPublisherUrl,
    };
  });
}

function mapEsMissionBuckets(buckets: any[]): MissionStatsSummary[] {
  return buckets.map((bucket) => ({
    key: bucket.key,
    doc_count: bucket.doc_count,
  }));
}

function getReadStatsFrom(): "es" | "pg" {
  return (process.env.READ_STATS_FROM as "es" | "pg") || "es";
}
