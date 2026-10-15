import type { MissionBrowse, MissionBrowseFacetCount } from "@engagement/dto";
import { getDomainLabel } from "@engagement/dto";
import { TAXONOMY } from "@engagement/taxonomy";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router";

import LocationFilter, { LOCATION_LABEL_PARAM } from "~/components/landings/location-filter";
import MissionCard from "~/components/missions/mission-card";
import Pagination from "~/components/ui/pagination";
import { useFocusTrap } from "~/hooks/useFocusTrap";
import { PUBLISHER_ID } from "~/services/config";
import { trackMissionClickedFromBrowse, trackMissionsFilterApplied, trackMissionsPageChanged } from "~/services/tracking/events";
import type { LandingName, MissionDetailNavState, MissionsFilterType } from "~/services/tracking/types";
import { LANDING_MISSIONS_PAGE_SIZE, SINGLE_CHOICE_FILTERS, getSelectedValues, type LandingFilterKey } from "~/utils/landing-missions";
import { buildMissionBrowseTags } from "~/utils/mission";
import { getScrollBehavior } from "~/utils/motion";

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

// Groupes de filtres dépliables (cases à cocher, ou boutons radio pour un choix unique). Partagés par la colonne
// desktop (application immédiate) et la fenêtre mobile (application à la sauvegarde) : `idPrefix` évite les
// identifiants en double quand les deux sont dans la page.
function FilterGroups({
  keys,
  facets,
  selected,
  onChange,
  idPrefix,
}: {
  keys: LandingFilterKey[];
  facets: Record<string, MissionBrowseFacetCount[]>;
  selected: (key: LandingFilterKey) => string[];
  onChange: (key: LandingFilterKey, next: string[]) => void;
  idPrefix: string;
}) {
  const [openGroups, setOpenGroups] = useState<LandingFilterKey[]>([]);

  const handleToggleGroup = (key: LandingFilterKey) => {
    setOpenGroups((prev) => (prev.includes(key) ? prev.filter((openKey) => openKey !== key) : [...prev, key]));
  };

  return (
    // Pas de padding horizontal sur le panneau : les en-têtes de groupe le traversent de bord à bord, pour que leur
    // fond au survol couvre toute la largeur (comme les entrées du menu principal).
    <div className="bg-background flex flex-col drop-shadow-[0_2px_3px_rgba(0,0,18,0.16)]">
      {keys.map((key, index) => {
        const selectedValues = selected(key);
        const open = openGroups.includes(key);
        const panelId = `${idPrefix}-${key}`;
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
              {selectedValues.length > 0 && <span className="fr-sr-only">{`, ${selectedValues.length} sélectionné${selectedValues.length > 1 ? "s" : ""}`}</span>}
              <span aria-hidden="true" className={`text-blue-france-sun fr-icon--sm ${open ? "fr-icon-arrow-up-s-line" : "fr-icon-arrow-down-s-line"}`} />
            </button>
            <fieldset id={panelId} hidden={!open} className="fr-fieldset m-0! p-0! pt-2! pb-4!">
              <legend className="fr-sr-only">{FILTER_LABELS[key]}</legend>
              {getFilterOptions(key, facets).map((option) => {
                const inputId = `${panelId}-${option.value}`;
                const checked = selectedValues.includes(option.value);
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
                        onChange={() => {
                          if (single) return onChange(key, [option.value]);
                          onChange(key, checked ? selectedValues.filter((value) => value !== option.value) : [...selectedValues, option.value]);
                        }}
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
  );
}

// Fenêtre mobile « Modifier mes réponses » : les choix restent en brouillon et ne sont appliqués qu'à la
// sauvegarde ; Annuler, la croix, Échap ou un clic sur le fond referment sans rien changer.
function FiltersSheet({
  keys,
  facets,
  initialValues,
  onSave,
  onClose,
}: {
  keys: LandingFilterKey[];
  facets: Record<string, MissionBrowseFacetCount[]>;
  initialValues: Record<string, string[]>;
  onSave: (values: Record<string, string[]>) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState(initialValues);

  // Échap, piège de focus et restitution du focus au bouton d'ouverture (RGAA 12.9 / 7.3).
  useFocusTrap(sheetRef, true, onClose);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    // eslint-disable-next-line jsx-a11y-x/click-events-have-key-events, jsx-a11y-x/no-noninteractive-element-interactions -- Le clic ne concerne que l'arrière-plan du dialogue, qui reste fermable au clavier via Échap et le bouton dédié.
    <div
      ref={sheetRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[1750] flex items-end bg-black/50"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="bg-background flex max-h-[90vh] w-full flex-col gap-6 rounded-t-[20px] px-3.5 pt-7 pb-4 shadow-[0_6px_18px_0_rgba(0,0,18,0.16)]">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="fr-text--lead text-title-grey mb-0! font-bold">
            Modifier mes réponses
          </h2>
          <button type="button" onClick={onClose} className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-close-line -mt-4" title="Fermer">
            Fermer
          </button>
        </div>

        <div className="-mx-3.5 flex-1 overflow-y-auto px-3.5 pb-1">
          <FilterGroups
            keys={keys}
            facets={facets}
            selected={(key) => values[key] ?? []}
            onChange={(key, next) => setValues((prev) => ({ ...prev, [key]: next }))}
            idPrefix="missions-filtre-mobile"
          />
        </div>

        <div className="flex flex-col gap-2.5">
          <button type="button" onClick={() => onSave(values)} className="fr-btn fr-btn--lg w-full! justify-center!">
            Sauvegarder mes réponses
          </button>
          <button type="button" onClick={onClose} className="fr-btn fr-btn--tertiary fr-btn--sm w-full! justify-center!">
            Annuler
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Liste de missions filtrable des landings. Desktop : localisation et filtres en colonne à gauche, cartes et
// pagination à droite. Mobile : la localisation est dans le hero (`LocationFilter` rendu par la landing) et les
// filtres s'ouvrent dans une fenêtre depuis un bouton collé en bas de l'écran. L'état vit dans l'URL (chaque
// changement relance le loader de la landing, qui applique le réglage `LandingMissionsConfig`).
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  // Filtres de l'affichage précédent : un filtre coché est tracé une fois la nouvelle liste chargée, avec son
  // nombre de résultats, quel que soit l'endroit où il a été coché (colonne, fenêtre mobile, localisation).
  const previousParamsRef = useRef(searchParams);

  useEffect(() => {
    const previousParams = previousParamsRef.current;
    previousParamsRef.current = searchParams;
    const addedFilter = filters
      .map((key) => ({ key, value: getSelectedValues(searchParams, key).find((value) => !getSelectedValues(previousParams, key).includes(value)) }))
      .find((filter) => filter.value);
    if (!addedFilter?.value) return;

    const activeFilterCount = filters.reduce((sum, key) => sum + getSelectedValues(searchParams, key).length, 0);
    trackMissionsFilterApplied({ filterType: FILTER_TYPES[addedFilter.key], filterValue: addedFilter.value, activeFilterCount, resultsCount: total });
  }, [missions]);

  const updateFilters = (values: Record<string, string[]>) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.delete("page");
        for (const [key, next] of Object.entries(values)) {
          params.delete(key);
          for (const value of next) params.append(key, value);
        }
        return params;
      },
      { preventScrollReset: true },
    );
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

  const handleSheetSave = (values: Record<string, string[]>) => {
    updateFilters(values);
    setSheetOpen(false);
  };

  const totalPages = Math.max(1, Math.ceil(total / LANDING_MISSIONS_PAGE_SIZE));
  const groupFilters = filters.filter((key) => key !== "departmentCode");

  // Les premières cartes chevauchent le bas du hero : -160px moins l'espacement entre sections sur mobile et
  // tablette, et à côté de la colonne de filtres sur desktop.
  return (
    <section className="fr-container relative z-10 -mt-40 flex flex-col gap-6 lg:-mt-50 lg:flex-row">
      <h2 className="fr-sr-only">Missions disponibles</h2>

      <div className="hidden h-fit flex-col gap-6 lg:flex lg:w-74 lg:shrink-0">
        {filters.includes("departmentCode") && <LocationFilter id="missions-localisation" />}
        <FilterGroups
          keys={groupFilters}
          facets={facets}
          selected={(key) => getSelectedValues(searchParams, key)}
          onChange={(key, next) => updateFilters({ [key]: next })}
          idPrefix="missions-filtre"
        />
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
                {/* Impression comptée par le jstag API Engagement (chargé dans root.tsx) quand la carte est visible,
                    comme dans le widget : une par mission affichée, attribuée à TrouveTaMission comme diffuseur. */}
                <span data-name="tracker_counter" data-id={mission.id} data-publisher={PUBLISHER_ID} />
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

        {/* Mobile : bouton collé en bas de l'écran tant que la liste est visible. */}
        <div className="bg-background sticky bottom-0 z-20 -mx-4 p-2 lg:hidden">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="fr-btn fr-btn--secondary fr-btn--lg fr-btn--icon-left fr-icon-equalizer-line bg-background! w-full! justify-center!"
          >
            Modifier mes critères
          </button>
        </div>
      </div>

      {sheetOpen && (
        <FiltersSheet
          keys={groupFilters}
          facets={facets}
          initialValues={Object.fromEntries(groupFilters.map((key) => [key, getSelectedValues(searchParams, key)]))}
          onSave={handleSheetSave}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </section>
  );
}
