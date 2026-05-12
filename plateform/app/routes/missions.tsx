import { TAXONOMY } from "@engagement/taxonomy";
import { useEffect, useState } from "react";
import Newsletter from "~/components/layout/newsletter";
import Partners from "~/components/layout/partners";
import MissionFiltersBar, { MissionFiltersTrigger, type FilterDef } from "~/components/missions/filters";
import MissionCard from "~/components/missions/mission-card";
import GradientBg from "~/components/ui/gradient-bg";
import Pagination from "~/components/ui/pagination";
import { browseMissions } from "~/services/mission-browse";
import type { BrowseFilters, BrowseMission, FacetCount } from "~/types/api";
import type { Route } from "./+types/missions";

const PAGE_SIZE = 9;

type TaxonomyFilterKey = "domaine" | "secteur_activite" | "type_mission" | "tranche_age";

const filterTaxonomyLabel = (key: TaxonomyFilterKey, value: string): string => {
  const taxonomyValues = TAXONOMY[key].values as Record<string, { label: string }>;
  return taxonomyValues[value]?.label ?? value;
};

const formatDepartmentLabel = (code: string): string => code.replace(/^FR-/, "");

const sortFacets = (facets: FacetCount[] | undefined) =>
  (facets ?? [])
    .filter((f) => f.count > 0)
    .slice()
    .sort((a, b) => b.count - a.count);

export async function clientLoader() {
  return {};
}

export function HydrateFallback() {
  return null;
}

export function meta(): Route.MetaDescriptors {
  return [{ title: "Trouve ta mission — API Engagement" }];
}

type FilterKey = "departmentCode" | "tranche_age" | "type_mission" | "secteur_activite" | "domaine";

const FILTER_KEYS: FilterKey[] = ["departmentCode", "tranche_age", "type_mission", "secteur_activite", "domaine"];

export default function MissionsPage() {
  const [filterValues, setFilterValues] = useState<Record<FilterKey, string[]>>({
    departmentCode: [],
    tranche_age: [],
    type_mission: [],
    secteur_activite: [],
    domaine: [],
  });
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<BrowseMission[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<Record<string, FacetCount[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const browseInput: BrowseFilters = { page, pageSize: PAGE_SIZE };
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
  }, [filterValues, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filterDefs: FilterDef[] = [
    {
      key: "departmentCode",
      label: "Département",
      placeholder: "Sélectionner un département",
      selected: filterValues.departmentCode,
      options: sortFacets(facets.departmentCodes).map((facet) => ({
        value: facet.key,
        label: formatDepartmentLabel(facet.key),
        count: facet.count,
      })),
    },
    {
      key: "tranche_age",
      label: "Tranche d'âge",
      placeholder: "Toutes",
      selected: filterValues.tranche_age,
      single: true,
      options: sortFacets(facets.tranche_age).map((facet) => ({
        value: facet.key,
        label: filterTaxonomyLabel("tranche_age", facet.key),
        count: facet.count,
      })),
    },
    {
      key: "type_mission",
      label: "Disponibilités",
      placeholder: "Toutes",
      selected: filterValues.type_mission,
      options: sortFacets(facets.type_mission).map((facet) => ({
        value: facet.key,
        label: filterTaxonomyLabel("type_mission", facet.key),
        count: facet.count,
      })),
    },
    {
      key: "secteur_activite",
      label: "Activités",
      placeholder: "Toutes",
      selected: filterValues.secteur_activite,
      options: sortFacets(facets.secteur_activite).map((facet) => ({
        value: facet.key,
        label: filterTaxonomyLabel("secteur_activite", facet.key),
        count: facet.count,
      })),
    },
    {
      key: "domaine",
      label: "Domaine",
      placeholder: "Tous",
      selected: filterValues.domaine,
      options: sortFacets(facets.domaine).map((facet) => ({
        value: facet.key,
        label: filterTaxonomyLabel("domaine", facet.key),
        count: facet.count,
      })),
    },
  ];

  const handleFilterChange = (key: string, next: string[]) => {
    if (!FILTER_KEYS.includes(key as FilterKey)) return;
    setPage(1);
    setFilterValues((prev) => ({ ...prev, [key as FilterKey]: next }));
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
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
                <MissionCard key={mission.id} mission={mission} />
              ))}
            </div>
          )}

          <div className="fr-mt-6w">
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        </div>
      </GradientBg>

      <Newsletter
        title="Inscris-toi à la newsletter"
        subtitle="1 email par mois avec les missions qui pourraient t'intéresser."
        ctaText="Je m'inscris"
        hintText="Tu peux te désinscrire à tout moment"
      />

      <Partners />
    </main>
  );
}
