import type { MissionBrowseFilters } from "@engagement/dto";

import type { CmsMissionSlot } from "~/types/cms";

// Requêtes du carrousel du bloc « Missions » : une par mission mise en avant, puis (option) 10 missions de la page
// `randomPage`. La tranche d'âge du bloc s'applique à toutes.
export const buildCarouselFilters = (
  { slots, fillWithRandom, trancheAge }: { slots: CmsMissionSlot[]; fillWithRandom: boolean; trancheAge?: string | null },
  randomPage: number,
): MissionBrowseFilters[] => {
  const age = trancheAge ? { tranche_age: trancheAge } : {};
  return [
    ...slots.map(({ dispositif, domaineEngagement }) => ({
      ...(dispositif && { dispositif }),
      ...(domaineEngagement && { domaine_engagement: domaineEngagement }),
      ...age,
      pageSize: 1,
    })),
    ...(fillWithRandom ? [{ ...age, pageSize: 10, page: randomPage }] : []),
  ];
};

export type CmsCustomButton = { label?: string | null; url?: string | null };

// Bouton défini sur le bloc s'il a un libellé et un lien, sinon le bouton par défaut de la page.
export const resolveCmsButton = (custom: CmsCustomButton | undefined, fallback: { to: string; label: string }): { to: string; label: string } =>
  custom?.label && custom.url ? { to: custom.url, label: custom.label } : fallback;
