import type { MissionBrowse, MissionBrowseFacetCount } from "@engagement/dto";
import { getDomainLabel } from "@engagement/dto";
import { TAXONOMY } from "@engagement/taxonomy";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";

import LocationFilter from "~/components/landings/location-filter";
import MissionCard from "~/components/missions/mission-card";
import Pagination from "~/components/ui/pagination";
import { sendMissionImpressions } from "~/services/mission-impressions";
import { trackMissionClickedFromBrowse, trackMissionsFilterApplied, trackMissionsPageChanged } from "~/services/tracking/events";
import type { LandingName, MissionDetailNavState, MissionsFilterType } from "~/services/tracking/types";
import { LANDING_MISSIONS_PAGE_SIZE, SINGLE_CHOICE_FILTERS, getSelectedValues, type LandingFilterKey } from "~/utils/landing-missions";
import { buildMissionBrowseTags } from "~/utils/mission";
import { getScrollBehavior } from "~/utils/motion";

// Libellé de la localisation choisie (affichage seul, l'API ne reçoit que le département).
const LOCATION_LABEL_PARAM = "lieu";

const FILTER_LABELS: Record<LandingFilterKey, string> = {
  departmentCode: "Localisation",
  tranche_age: "Tranche d'âge",
  activite: "Activités",
  domaine_engagement: "Domaines",
  dispositif: "Type de mission",
};

// Facette renvoyée par l'API pour chaque filtre (les départements sont agrégés sous `departmentCodes`).
const FACET_KEYS: Record<LandingFilterKey, string> = {
  departmentCode: "departmentCodes",
  tranche_age: "tranche_age",
  activite: "activite",
  domaine_engagement: "domaine_engagement",
  dispositif: "dispositif",
};

// filter_type de la spec tracking (departmentCode → departement).
const FILTER_TYPES: Record<LandingFilterKey, MissionsFilterType> = {
  departmentCode: "departement",
  tranche_age: "tranche_age",
  activite: "activite",
  domaine_engagement: "domaine_engagement",
  dispositif: "dispositif",
};

// Options dans l'ordre de la taxonomie, limitées à celles qui ont au moins une mission.
const getFilterOptions = (key: LandingFilterKey, facets: Record<string, MissionBrowseFacetCount[]>) => {
  const countByValue = new Map((facets[FACET_KEYS[key]] ?? []).map((facet) => [facet.key, facet.count]));
  return Object.entries(TAXONOMY[key].values as Record<string, { label: string; hidden?: boolean }>)
    .filter(([value, { hidden }]) => !hidden && (countByValue.get(value) ?? 0) > 0)
    .map(([value, { label }]) => ({ value, label }));
};

// Liste de missions filtrable des landings : filtres en colonne à gauche, grille de cartes et pagination
// à droite. L'état vit dans l'URL (chaque changement relance le loader de la landing, qui applique le réglage
// `LandingMissionsConfig`) ; ce composant n'affiche que les filtres qu'on lui passe.
export default function MissionsBrowser({
  missions,
  total,
  facets,
  page,
  filters,
  landing,
  backTo,
}: {
  missions: MissionBrowse[];
  total: number;
  facets: Record<string, MissionBrowseFacetCount[]>;
  page: number;
  filters: LandingFilterKey[];
  landing: LandingName;
  backTo: string;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [openGroups, setOpenGroups] = useState<LandingFilterKey[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  // Filtre coché en attente de tracking : le nombre de résultats n'est connu qu'au retour du loader.
  const pendingFilterTrackRef = useRef<{ filterType: MissionsFilterType; filterValue: string; activeFilterCount: number } | null>(null);

  useEffect(() => {
    sendMissionImpressions(missions.map((mission) => mission.id));

    const pendingFilterTrack = pendingFilterTrackRef.current;
    if (!pendingFilterTrack) return;
    pendingFilterTrackRef.current = null;
    trackMissionsFilterApplied({ ...pendingFilterTrack, resultsCount: total });
  }, [missions]);

  // `locationLabel` : libellé de la localisation, mis à jour dans la même navigation que le département.
  const handleFilterChange = (key: LandingFilterKey, next: string[], locationLabel?: string) => {
    const addedValue = next.find((value) => !getSelectedValues(searchParams, key).includes(value));
    if (addedValue) {
      const activeFilterCount = filters.reduce((sum, filterKey) => sum + (filterKey === key ? next.length : getSelectedValues(searchParams, filterKey).length), 0);
      pendingFilterTrackRef.current = { filterType: FILTER_TYPES[key], filterValue: addedValue, activeFilterCount };
    }

    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.delete(key);
        params.delete("page");
        for (const value of next) params.append(key, value);
        if (locationLabel !== undefined) {
          if (locationLabel) params.set(LOCATION_LABEL_PARAM, locationLabel);
          else params.delete(LOCATION_LABEL_PARAM);
        }
        return params;
      },
      { preventScrollReset: true },
    );
  };

  const handleToggleValue = (key: LandingFilterKey, value: string, checked: boolean) => {
    const selected = getSelectedValues(searchParams, key).filter((selectedValue) => selectedValue !== value);
    handleFilterChange(key, checked ? [...selected, value] : selected);
  };

  const handleReset = () => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        for (const key of filters) params.delete(key);
        params.delete(LOCATION_LABEL_PARAM);
        params.delete("page");
        return params;
      },
      { preventScrollReset: true },
    );
  };

  const handlePageChange = (newPage: number) => {
    trackMissionsPageChanged({ pageName: landing, fromPage: page, toPage: newPage, totalPages });
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (newPage === 1) params.delete("page");
        else params.set("page", String(newPage));
        return params;
      },
      { preventScrollReset: true },
    );
    listRef.current?.scrollIntoView({ behavior: getScrollBehavior(), block: "start" });
  };

  // La localisation est un département pour l'API ; le libellé saisi est gardé dans l'URL pour réafficher le champ.
  const handleLocationSubmit = (location: { departmentCode: string; label: string } | null) => {
    handleFilterChange("departmentCode", location ? [location.departmentCode] : [], location?.label ?? "");
  };

  const handleToggleGroup = (key: LandingFilterKey) => {
    setOpenGroups((prev) => (prev.includes(key) ? prev.filter((openKey) => openKey !== key) : [...prev, key]));
  };

  const totalPages = Math.max(1, Math.ceil(total / LANDING_MISSIONS_PAGE_SIZE));
  const groupFilters = filters.filter((key) => key !== "departmentCode");
  const locationLabel = searchParams.get(LOCATION_LABEL_PARAM) ?? "";

  return (
    <section className="fr-container relative z-10 flex flex-col gap-6 lg:-mt-50 lg:flex-row">
      <h2 className="fr-sr-only">Missions disponibles</h2>

      <div className="flex h-fit flex-col gap-6 lg:w-74 lg:shrink-0">
        {filters.includes("departmentCode") && (
          // `key` : le champ repart du libellé de l'URL quand la localisation change (ex. réinitialisation).
          <LocationFilter key={locationLabel} initialLabel={locationLabel} onSubmit={handleLocationSubmit} />
        )}

        {/* Pas de padding horizontal sur le panneau : les en-têtes de groupe le traversent de bord à bord, pour que leur
            fond au survol couvre toute la largeur (comme les entrées du menu principal). */}
        <div className="bg-background flex flex-col drop-shadow-[0_2px_3px_rgba(0,0,18,0.16)]">
          {groupFilters.map((key, index) => {
            const selected = getSelectedValues(searchParams, key);
            const options = getFilterOptions(key, facets);
            const open = openGroups.includes(key);
            const panelId = `missions-filtre-${key}`;
            const single = SINGLE_CHOICE_FILTERS.includes(key);
            return (
              <div key={key} className={`mx-6 py-2 ${index > 0 ? "border-border-default-grey border-t" : ""}`}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => handleToggleGroup(key)}
                  className="text-label-grey -mx-6! flex w-[calc(100%+3rem)] items-center justify-between px-6 py-4 text-left"
                >
                  {FILTER_LABELS[key]}
                  {selected.length > 0 && <span className="fr-sr-only">{`, ${selected.length} sélectionné${selected.length > 1 ? "s" : ""}`}</span>}
                  <span aria-hidden="true" className={`text-blue-france-sun fr-icon--sm ${open ? "fr-icon-arrow-up-s-line" : "fr-icon-arrow-down-s-line"}`} />
                </button>
                <fieldset id={panelId} hidden={!open} className="fr-fieldset m-0! p-0! pt-2! pb-4!">
                  <legend className="fr-sr-only">{FILTER_LABELS[key]}</legend>
                  {options.map((option) => {
                    const inputId = `${panelId}-${option.value}`;
                    const checked = selected.includes(option.value);
                    return (
                      <div key={option.value} className="fr-fieldset__element mb-4! p-0! last:mb-0!">
                        <div className={single ? "fr-radio-group" : "fr-checkbox-group"}>
                          {/* Le JS du DSFR annote les cases (`data-fr-js-*`) avant l'hydratation : écart attendu. */}
                          <input
                            suppressHydrationWarning
                            type={single ? "radio" : "checkbox"}
                            id={inputId}
                            name={single ? panelId : undefined}
                            checked={checked}
                            onChange={(event) => (single ? handleFilterChange(key, [option.value]) : handleToggleValue(key, option.value, event.target.checked))}
                          />
                          <label className="fr-label" htmlFor={inputId}>
                            {option.label}
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </fieldset>
              </div>
            );
          })}
        </div>
      </div>

      <div ref={listRef} className="flex min-w-0 flex-1 scroll-mt-4 flex-col gap-8">
        {/* RGAA 7.5 : le nombre de résultats est annoncé après chaque changement de filtre. */}
        <p role="status" className="fr-sr-only">{`${total.toLocaleString("fr-FR")} mission${total > 1 ? "s" : ""} disponible${total > 1 ? "s" : ""}`}</p>

        {missions.length === 0 ? (
          <div className="bg-background flex flex-col items-start gap-4 p-6">
            <p className="fr-text--lg mb-0!">Aucune mission ne correspond à ces filtres</p>
            <button type="button" onClick={handleReset} className="fr-btn fr-btn--secondary">
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <ul role="list" className="m-0! grid list-none! grid-cols-1 gap-6 p-0! md:grid-cols-2">
            {missions.map((mission, index) => (
              <li key={mission.id} className="min-w-0 p-0!">
                <MissionCard
                  image={mission.photo ?? mission.organizationLogo ?? mission.domainLogo}
                  domainLabel={getDomainLabel(mission.domain)}
                  title={mission.title}
                  to={`/missions/${mission.id}`}
                  state={{ entrySource: landing, backTo } satisfies MissionDetailNavState}
                  onClick={() =>
                    trackMissionClickedFromBrowse(mission, {
                      section: landing,
                      entryPage: landing,
                      opensExternal: false,
                      rank: (page - 1) * LANDING_MISSIONS_PAGE_SIZE + index + 1,
                      pageNumber: page,
                    })
                  }
                  tags={buildMissionBrowseTags(mission)}
                  publisherName={mission.publisherName}
                  publisherLogo={mission.publisherLogo}
                />
              </li>
            ))}
          </ul>
        )}

        <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} ariaLabel="Pagination des missions" />
      </div>
    </section>
  );
}
