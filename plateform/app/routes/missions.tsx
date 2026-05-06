import { TAXONOMY } from "@engagement/taxonomy";
import { useEffect, useMemo, useState } from "react";
import MissionFiltersBar, { type FilterDef } from "~/components/missions/filters";
import GradientBg from "~/components/ui/gradient-bg";
import { browseMissions, type BrowseFilters, type BrowseMission, type FacetCount } from "~/services/mission-browse";
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

const FAKE_FACETS: Record<string, FacetCount[]> = {
  departmentCodes: [
    { key: "FR-75", count: 124 },
    { key: "FR-69", count: 87 },
    { key: "FR-13", count: 64 },
    { key: "FR-33", count: 41 },
    { key: "FR-44", count: 33 },
    { key: "FR-31", count: 28 },
    { key: "FR-59", count: 22 },
  ],
  tranche_age: [
    { key: "moins_26_ans", count: 52 },
    { key: "moins_31_ans_handicap", count: 18 },
    { key: "entre_17_72_ans", count: 96 },
    { key: "entre_16_67_ans", count: 73 },
  ],
  type_mission: [
    { key: "ponctuelle", count: 145 },
    { key: "reguliere", count: 87 },
    { key: "temps_plein", count: 32 },
  ],
  secteur_activite: [
    { key: "sante_social_aide_personne", count: 64 },
    { key: "education_formation_animation", count: 58 },
    { key: "environnement_agriculture", count: 41 },
    { key: "culture_creation_medias", count: 27 },
    { key: "securite_service_public", count: 19 },
    { key: "numerique_communication", count: 14 },
  ],
  domaine: [
    { key: "social_solidarite", count: 78 },
    { key: "sante_soins", count: 52 },
    { key: "environnement_nature", count: 44 },
    { key: "education_transmission", count: 39 },
    { key: "culture_arts", count: 26 },
    { key: "sport_animation", count: 21 },
    { key: "international_humanitaire", count: 12 },
  ],
};

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
  const [facets, setFacets] = useState<Record<string, FacetCount[]>>(FAKE_FACETS);
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

  const visiblePageNumbers = useMemo(() => {
    const window = 5;
    const start = Math.max(1, Math.min(page - Math.floor(window / 2), totalPages - window + 1));
    const length = Math.min(window, totalPages);
    return Array.from({ length }, (_, i) => start + i);
  }, [page, totalPages]);

  const filterDefs: FilterDef[] = [
    {
      key: "departmentCode",
      label: "Lieu de la mission",
      placeholder: "Tous",
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
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main>
      <GradientBg>
        <div className="fr-container fr-py-8w">
          <h1 className="fr-h1 fr-mb-2w">Trouve ta mission</h1>
          <p className="fr-text--lead fr-mb-4w">
            {loading && total === 0 ? "Chargement…" : `${total.toLocaleString("fr-FR")} mission${total > 1 ? "s" : ""} disponible${total > 1 ? "s" : ""}`}
          </p>
          <MissionFiltersBar filters={filterDefs} onChange={handleFilterChange} />
        </div>

        <div className="fr-container fr-py-6w">
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
            <div className="fr-grid-row fr-grid-row--gutters">
              {items.map((mission) => {
                const cardImage = mission.organizationLogo ?? mission.domainLogo;
                const domainLabel = mission.domain ? filterTaxonomyLabel("domaine", mission.domain) : null;
                return (
                  <div key={mission._id} className="fr-col-12 fr-col-md-6 fr-col-lg-4">
                    <div className="fr-card fr-enlarge-link h-full">
                      <div className="fr-card__body">
                        <div className="fr-card__content">
                          <h3 className="fr-card__title">
                            <a href={mission.applicationUrl ?? "#"} target="_blank" rel="noopener noreferrer">
                              {mission.title}
                            </a>
                          </h3>
                          <div className="fr-card__end">
                            <ul className="fr-mb-0 list-none p-0 text-sm text-title-grey">
                              {mission.city && (
                                <li className="flex items-center gap-2 py-0.5">
                                  <i className="fr-icon-map-pin-2-line fr-icon--sm" aria-hidden="true" />
                                  <span>{mission.city}</span>
                                </li>
                              )}
                              {mission.schedule && (
                                <li className="flex items-center gap-2 py-0.5">
                                  <i className="fr-icon-time-line fr-icon--sm" aria-hidden="true" />
                                  <span>{mission.schedule}</span>
                                </li>
                              )}
                              {mission.organizationName && (
                                <li className="flex items-center gap-2 py-0.5">
                                  <i className="fr-icon-building-line fr-icon--sm" aria-hidden="true" />
                                  <span className="line-clamp-1">{mission.organizationName}</span>
                                </li>
                              )}
                            </ul>
                          </div>
                          {(mission.publisherName ?? mission.publisherLogo) && (
                            <div className="mt-4 flex items-center justify-end gap-2 border-t border-border-default-grey pt-3 text-xs text-title-grey">
                              {mission.publisherName && <span className="line-clamp-1">{mission.publisherName}</span>}
                              {mission.publisherLogo && <img src={mission.publisherLogo} alt="" className="max-h-6 max-w-16 object-contain" loading="lazy" />}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="fr-card__header">
                        <div className="fr-card__img relative">
                          {cardImage ? <img className="fr-responsive-img" src={cardImage} alt="" loading="lazy" /> : <div className="aspect-[16/9] w-full bg-beige-gris-galet" />}
                          {domainLabel && (
                            <ul className="fr-tags-group absolute left-3 top-3">
                              <li>
                                <p className="fr-tag fr-tag--sm">{domainLabel}</p>
                              </li>
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="fr-pagination fr-mt-6w" aria-label="Pagination des missions">
              <ul className="fr-pagination__list">
                <li>
                  <button type="button" className="fr-pagination__link fr-pagination__link--first" disabled={page === 1} onClick={() => handlePageChange(1)}>
                    Première page
                  </button>
                </li>
                <li>
                  <button type="button" className="fr-pagination__link fr-pagination__link--prev" disabled={page === 1} onClick={() => handlePageChange(page - 1)}>
                    Page précédente
                  </button>
                </li>
                {visiblePageNumbers.map((pageNumber) => (
                  <li key={pageNumber}>
                    <button type="button" className="fr-pagination__link" aria-current={pageNumber === page ? "page" : undefined} onClick={() => handlePageChange(pageNumber)}>
                      {pageNumber}
                    </button>
                  </li>
                ))}
                <li>
                  <button type="button" className="fr-pagination__link fr-pagination__link--next" disabled={page === totalPages} onClick={() => handlePageChange(page + 1)}>
                    Page suivante
                  </button>
                </li>
                <li>
                  <button type="button" className="fr-pagination__link fr-pagination__link--last" disabled={page === totalPages} onClick={() => handlePageChange(totalPages)}>
                    Dernière page
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </GradientBg>
    </main>
  );
}
