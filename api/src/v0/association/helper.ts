import { ASSOS_INDEX } from "../../config";
import esClient from "../../db/elastic";
import { captureMessage } from "../../error";

const SEARCH_FIELDS = [
  "identite_nom^10",
  "identite_sigle^5",
  "coordonnees_adresse_commune^4",
  "description^4",
  "coordonnees_adresse_region^3",
  "activites_objet^2",
  "activites_lib_famille1^2",
  "coordonnees_adresse_departement^1",
];

const SHOULD_EXIST = ["url", "linkedin", "facebook", "twitter", "donation", "coordonnees_courriel", "coordonnees_telephone"];

type AssociationSortOrder = "asc" | "desc";

export interface AssociationFilters {
  searchbar?: string[] | null;
  coordonnees_adresse_region?: string[] | null;
  coordonnees_adresse_departement?: string[] | null;
  activites_lib_theme1?: string[] | null;
}

export interface AssociationSort {
  field: string;
  order: AssociationSortOrder;
}

export interface SearchAssociationsParams {
  filters?: AssociationFilters;
  sort?: AssociationSort | null;
  size: number;
  page: number;
}

export interface SearchAssociationsResult {
  body: any;
  hitsStatus?: number;
  hitsErrorType?: string;
  total?: number;
}

export async function searchAssociations(params: SearchAssociationsParams): Promise<SearchAssociationsResult> {
  if (getReadAssociationsFrom() === "pg") {
    return searchAssociationsFromPg(params);
  }

  return searchAssociationsFromEs(params);
}

async function searchAssociationsFromEs(params: SearchAssociationsParams): Promise<SearchAssociationsResult> {
  const hitsQuery = {
    bool: {
      filter: [{ bool: { should: SHOULD_EXIST.map((field) => ({ exists: { field, boost: 2 } })) } }],
    },
  } as { [key: string]: any };

  const facetsQuery = {
    bool: {
      filter: [{ bool: { should: SHOULD_EXIST.map((field) => ({ exists: { field, boost: 2 } })) } }],
    },
  } as { [key: string]: any };

  const facetsAggs = {
    coordonnees_adresse_region: {
      filter: { bool: { must: [] } },
      aggs: {
        names: {
          terms: { field: "coordonnees_adresse_region.keyword", missing: "N/A", size: 10000 },
        },
      },
    },
    coordonnees_adresse_departement: {
      filter: { bool: { must: [] } },
      aggs: {
        names: {
          terms: {
            field: "coordonnees_adresse_departement.keyword",
            missing: "N/A",
            size: 10000,
          },
        },
      },
    },
    activites_lib_theme1: {
      filter: { bool: { must: [] } },
      aggs: {
        names: {
          terms: { field: "activites_lib_theme1.keyword", missing: "N/A", size: 10000 },
        },
      },
    },
  } as { [key: string]: any };

  const filters = params.filters ?? {};

  if ((filters.searchbar?.length ?? 0) > 0) {
    const filter = {} as { [key: string]: any };
    const words = (filters.searchbar?.[0] ?? "").trim().split(" ");
    filter.bool = { should: [] } as { should: any[] };
    words.forEach((word: string) => {
      filter.bool.should.push({
        multi_match: {
          query: word,
          fields: SEARCH_FIELDS,
          type: "cross_fields",
          operator: "and",
        },
      });
      filter.bool.should.push({
        multi_match: { query: word, fields: SEARCH_FIELDS, type: "phrase", operator: "and" },
      });
      filter.bool.should.push({
        multi_match: {
          query: word,
          fields: SEARCH_FIELDS,
          type: "phrase_prefix",
          operator: "and",
        },
      });
    });
    hitsQuery.bool.filter.push(filter);
  }

  if ((filters.coordonnees_adresse_region?.length ?? 0) > 0) {
    const filter = {} as { [key: string]: any };
    const regions = filters.coordonnees_adresse_region ?? [];
    if (regions.includes("N/A")) {
      filter.bool = {
        should: [
          { bool: { must_not: { exists: { field: "coordonnees_adresse_region" } } } },
          {
            terms: {
              "coordonnees_adresse_region.keyword": regions.filter((region: string) => region !== "N/A"),
            },
          },
        ],
      };
    } else {
      filter.terms = {
        "coordonnees_adresse_region.keyword": regions,
      };
    }
    hitsQuery.bool.filter.push(filter);
    Object.keys(facetsAggs)
      .filter((key) => key !== "coordonnees_adresse_region")
      .forEach((key) => facetsAggs[key].filter.bool.must.push(filter));
  }

  if ((filters.coordonnees_adresse_departement?.length ?? 0) > 0) {
    const filter = {} as { [key: string]: any };
    const departements = filters.coordonnees_adresse_departement ?? [];
    if (departements.includes("N/A")) {
      filter.bool = {
        should: [
          { bool: { must_not: { exists: { field: "coordonnees_adresse_departement" } } } },
          {
            terms: {
              "coordonnees_adresse_departement.keyword": departements.filter((department: string) => department !== "N/A"),
            },
          },
        ],
      };
    } else {
      filter.terms = {
        "coordonnees_adresse_departement.keyword": departements,
      };
    }
    hitsQuery.bool.filter.push(filter);
    Object.keys(facetsAggs)
      .filter((key) => key !== "coordonnees_adresse_departement")
      .forEach((key) => facetsAggs[key].filter.bool.must.push(filter));
  }

  if ((filters.activites_lib_theme1?.length ?? 0) > 0) {
    const filter = {} as { [key: string]: any };
    const activities = filters.activites_lib_theme1 ?? [];
    if (activities.includes("N/A")) {
      filter.bool = {
        should: [
          { bool: { must_not: { exists: { field: "activites_lib_theme1" } } } },
          {
            terms: {
              "activites_lib_theme1.keyword": activities.filter((activity: string) => activity !== "N/A"),
            },
          },
        ],
      };
    } else {
      filter.terms = { "activites_lib_theme1.keyword": activities };
    }
    hitsQuery.bool.filter.push(filter);
    Object.keys(facetsAggs)
      .filter((key) => key !== "activites_lib_theme1")
      .forEach((key) => facetsAggs[key].filter.bool.must.push(filter));
  }

  const hitsBody = {
    query: hitsQuery,
    size: params.size,
    from: params.page > 0 ? params.page * params.size : 0,
    sort: params.sort ? [{ [params.sort.field]: params.sort.order }] : [{ createdAt: "desc" }],
  };

  const aggsBody = {
    query: facetsQuery,
    aggs: facetsAggs,
    size: 0,
    track_total_hits: true,
  };

  const responses = await esClient.msearch({
    body: [{ index: ASSOS_INDEX }, hitsBody, { index: ASSOS_INDEX }, aggsBody],
  });

  const hitsResponse = responses.body.responses?.[0];

  return {
    body: responses.body,
    hitsStatus: hitsResponse?.status,
    hitsErrorType: hitsResponse?.error?.type,
    total: hitsResponse?.hits?.total?.value,
  };
}

async function searchAssociationsFromPg(params: SearchAssociationsParams): Promise<SearchAssociationsResult> {
  captureMessage("[Association] Postgres search used", {
    extra: {
      page: params.page,
      size: params.size,
      hasFilters: Boolean(params.filters && Object.keys(params.filters).length > 0),
      hasSort: Boolean(params.sort),
    },
  });

  const emptyHits = {
    total: { value: 0, relation: "eq" },
    hits: [],
  } as { [key: string]: any };

  const emptyAggregations = {
    coordonnees_adresse_region: { names: { buckets: [] } },
    coordonnees_adresse_departement: { names: { buckets: [] } },
    activites_lib_theme1: { names: { buckets: [] } },
  } as { [key: string]: any };

  return {
    body: {
      responses: [
        {
          status: 200,
          hits: emptyHits,
        },
        {
          status: 200,
          aggregations: emptyAggregations,
        },
      ],
    },
    hitsStatus: 200,
    total: 0,
  };
}

function getReadAssociationsFrom(): "es" | "pg" {
  return (process.env.READ_ASSOCIATIONS_FROM as "es" | "pg") || "es";
}
