import type { MissionBrowse, MissionBrowseFacetCount, MissionBrowseFilters } from "@engagement/dto";
import { TAXONOMY } from "@engagement/taxonomy";

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import Newsletter from "~/components/layout/newsletter";
import Partners from "~/components/layout/partners";
import MissionFiltersBar, { MissionFiltersTrigger, type FilterDef } from "~/components/missions/filters";
import MissionCard from "~/components/missions/mission-card";
import GradientBg from "~/components/ui/gradient-bg";
import Pagination from "~/components/ui/pagination";
import { browseMissions } from "~/services/mission-browse";
import type { Route } from "./+types/missions";

const PAGE_SIZE = 9;

const FILTER_KEYS = ["departmentCode", "tranche_age", "type_mission", "secteur_activite", "domaine"] as const satisfies readonly (keyof MissionBrowseFilters)[];

type FilterKey = (typeof FILTER_KEYS)[number];
type BrowseParams = MissionBrowseFilters;
type TaxonomyFilterValue = { label: string; hidden?: boolean };

const sortFacets = (facets: MissionBrowseFacetCount[] | undefined) =>
  (facets ?? [])
    .filter((f) => f.count > 0)
    .slice()
    .sort((a, b) => b.count - a.count);

const buildTaxonomyFilterOptions = (key: FilterKey, facets: MissionBrowseFacetCount[] | undefined) => {
  const taxonomyValues = TAXONOMY[key].values as Record<string, TaxonomyFilterValue>;

  return sortFacets(facets).flatMap((facet) => {
    const taxonomyValue = taxonomyValues[facet.key];
    if (taxonomyValue?.hidden === true) return [];

    return [
      {
        value: facet.key,
        label: taxonomyValue?.label ?? facet.key,
        count: facet.count,
      },
    ];
  });
};

export async function clientLoader() {
  return {};
}

export function HydrateFallback() {
  return null;
}

export function meta(): Route.MetaDescriptors {
  return [{ title: "Trouve ta mission — API Engagement" }];
}

export default function MissionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isNaN(rawPage) ? 1 : Math.max(1, rawPage);
  const filterValues: Record<FilterKey, string[]> = {
    departmentCode: searchParams.getAll("departmentCode"),
    tranche_age: searchParams.getAll("tranche_age"),
    type_mission: searchParams.getAll("type_mission"),
    secteur_activite: searchParams.getAll("secteur_activite"),
    domaine: searchParams.getAll("domaine"),
  };

  const [items, setItems] = useState<MissionBrowse[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<Record<string, MissionBrowseFacetCount[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const browseInput: BrowseParams = { page, pageSize: PAGE_SIZE };
    if (filterValues.departmentCode.length) browseInput.departmentCode = filterValues.departmentCode;
    if (filterValues.tranche_age.length) browseInput.tranche_age = filterValues.tranche_age;
    if (filterValues.type_mission.length) browseInput.type_mission = filterValues.type_mission;
    if (filterValues.secteur_activite.length) browseInput.secteur_activite = filterValues.secteur_activite;
    if (filterValues.domaine.length) browseInput.domaine = filterValues.domaine;

    browseMissions(browseInput, controller.signal)
      .then((res) => {
        setItems(res.data);
        setTotal(res.total);
        setFacets(res.facets);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
      });

    return () => controller.abort();
  }, [searchParams]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filterDefs: FilterDef[] = [
    {
      key: "departmentCode",
      label: "Département",
      placeholder: "Sélectionner un département",
      selected: filterValues.departmentCode,
      options: buildTaxonomyFilterOptions("departmentCode", facets.departmentCodes),
    },
    {
      key: "tranche_age",
      label: "Tranche d'âge",
      placeholder: "Toutes",
      selected: filterValues.tranche_age,
      single: true,
      options: buildTaxonomyFilterOptions("tranche_age", facets.tranche_age),
    },
    {
      key: "type_mission",
      label: "Disponibilités",
      placeholder: "Toutes",
      selected: filterValues.type_mission,
      options: buildTaxonomyFilterOptions("type_mission", facets.type_mission),
    },
    {
      key: "secteur_activite",
      label: "Activités",
      placeholder: "Toutes",
      selected: filterValues.secteur_activite,
      options: buildTaxonomyFilterOptions("secteur_activite", facets.secteur_activite),
    },
    {
      key: "domaine",
      label: "Domaine",
      placeholder: "Tous",
      selected: filterValues.domaine,
      options: buildTaxonomyFilterOptions("domaine", facets.domaine),
    },
  ];

  const handleFilterChange = (key: string, next: string[]) => {
    if (!FILTER_KEYS.includes(key as FilterKey)) return;
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.delete(key);
      params.delete("page");
      for (const val of next) params.append(key, val);
      return params;
    });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (newPage === 1) params.delete("page");
      else params.set("page", String(newPage));
      return params;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <main>
        <GradientBg>
          <div className="fr-container pt-4 md:pt-16">
            <div className="flex items-center justify-between gap-4">
              <h1 className="fr-h1 m-0!">Trouve ta mission</h1>
              <MissionFiltersTrigger filters={filterDefs} onChange={handleFilterChange} />
            </div>
            <p className="fr-text--lead hidden md:block">
              {loading && total === 0 ? "Chargement…" : `${total.toLocaleString("fr-FR")} mission${total > 1 ? "s" : ""} disponible${total > 1 ? "s" : ""}`}
            </p>
            <MissionFiltersBar filters={filterDefs} onChange={handleFilterChange} />
          </div>

          <div className="fr-container my-4 md:my-8">
            {error && (
              <div className="fr-alert fr-alert--error fr-mb-4w">
                <p>Erreur lors du chargement des missions : {error}</p>
              </div>
            )}

            {loading && items.length === 0 && <p className="fr-text--sm">Chargement des missions…</p>}

            {!loading && !error && items.length === 0 && (
              <div className="fr-alert fr-alert--info">
                <p>Aucune mission ne correspond à ces filtres.</p>
              </div>
            )}

            {items.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mx-auto gap-6 w-fit">
                {items.map((mission) => (
                  <MissionCard key={mission.id} mission={mission} link={mission.applicationUrl ? { type: "external", href: mission.applicationUrl } : undefined} />
                ))}
              </div>
            )}

            <div className="fr-mt-6w">
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </div>
        </GradientBg>
      </main>
      <Newsletter
        title="Inscris-toi à la newsletter"
        subtitle="1 email par mois avec les missions qui pourraient t'intéresser."
        ctaText="Je m'inscris"
        hintText="Tu peux te désinscrire à tout moment"
      />

      <Partners />
    </>
  );
}
