import type { MissionBrowse } from "@engagement/dto";
import { getDomainLabel } from "@engagement/dto";
import { TAXONOMY } from "@engagement/taxonomy";
import { useState } from "react";
import { useSearchParams } from "react-router";

import MissionCard from "~/components/missions/mission-card";
import Pagination from "~/components/ui/pagination";
import { trackMissionClickedFromBrowse } from "~/services/tracking/events";
import type { LandingName, MissionDetailNavState } from "~/services/tracking/types";
import { buildMissionBrowseTags } from "~/utils/mission";

// La clé d'un filtre est aussi sa clé de taxonomie et son param d'URL (lu par le loader de la landing).
export const FILTER_KEYS = ["tranche_age", "activite", "domaine_engagement", "dispositif"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

const FILTER_LABELS: Record<FilterKey, string> = {
  tranche_age: "Tranche d'âge",
  activite: "Activités",
  domaine_engagement: "Domaines",
  dispositif: "Type de mission",
};

const getFilterOptions = (key: FilterKey) =>
  Object.entries(TAXONOMY[key].values as Record<string, { label: string; hidden?: boolean }>)
    .filter(([, value]) => !value.hidden)
    .map(([value, { label }]) => ({ value, label }));

// Missions filtrables de la landing : filtres en colonne à gauche (groupes de cases à cocher dépliables),
// grille de cartes et pagination à droite. L'état vit dans l'URL : chaque changement relance le loader.
export default function MissionsBrowser({
  missions,
  totalPages,
  page,
  landing,
  backTo,
}: {
  missions: MissionBrowse[];
  totalPages: number;
  page: number;
  landing: LandingName;
  backTo: string;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [openGroups, setOpenGroups] = useState<Record<FilterKey, boolean>>({ tranche_age: false, activite: true, domaine_engagement: false, dispositif: false });

  const handleToggleValue = (key: FilterKey, value: string, checked: boolean) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        const values = params.getAll(key).filter((selected) => selected !== value);
        params.delete(key);
        params.delete("page");
        for (const selected of checked ? [...values, value] : values) params.append(key, selected);
        return params;
      },
      { preventScrollReset: true },
    );
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (newPage === 1) params.delete("page");
        else params.set("page", String(newPage));
        return params;
      },
      { preventScrollReset: true },
    );
  };

  return (
    <section className="fr-container relative z-10 flex flex-col gap-6 lg:-mt-50 lg:flex-row">
      <h2 className="fr-sr-only">Missions disponibles</h2>

      {/* Pas de padding horizontal sur le panneau : les en-têtes de groupe le traversent de bord à bord, pour que leur
          fond au survol couvre toute la largeur (comme les entrées du menu principal). */}
      <div className="bg-background flex h-fit flex-col drop-shadow-[0_2px_3px_rgba(0,0,18,0.16)] lg:w-74 lg:shrink-0">
        {FILTER_KEYS.map((key, index) => {
          const open = openGroups[key];
          const panelId = `reengagement-filtre-${key}`;
          return (
            <div key={key} className={`mx-6 py-2 ${index > 0 ? "border-border-default-grey border-t" : ""}`}>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenGroups((prev) => ({ ...prev, [key]: !open }))}
                className="text-label-grey -mx-6! flex w-[calc(100%+3rem)] items-center justify-between px-6 py-4 text-left"
              >
                {FILTER_LABELS[key]}
                <span aria-hidden="true" className={`text-blue-france-sun fr-icon--sm ${open ? "fr-icon-arrow-up-s-line" : "fr-icon-arrow-down-s-line"}`} />
              </button>
              <fieldset id={panelId} hidden={!open} className="fr-fieldset m-0! p-0! pt-2! pb-4!">
                <legend className="fr-sr-only">{FILTER_LABELS[key]}</legend>
                {getFilterOptions(key).map((option) => {
                  const inputId = `${panelId}-${option.value}`;
                  return (
                    <div key={option.value} className="fr-fieldset__element mb-4! p-0! last:mb-0!">
                      <div className="fr-checkbox-group">
                        <input
                          type="checkbox"
                          id={inputId}
                          checked={searchParams.getAll(key).includes(option.value)}
                          onChange={(event) => handleToggleValue(key, option.value, event.target.checked)}
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

      <div className="flex min-w-0 flex-1 flex-col gap-8">
        {missions.length === 0 ? (
          <div role="status" className="fr-alert fr-alert--info">
            <p>Aucune mission ne correspond à ces filtres.</p>
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
                  onClick={() => trackMissionClickedFromBrowse(mission, { section: landing, entryPage: landing, opensExternal: false, rank: index + 1 })}
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
