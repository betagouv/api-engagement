import { TAXONOMY } from "@engagement/taxonomy";
import { useEffect, useState } from "react";
import MissionFiltersBar, { type FilterDef } from "~/components/missions/filters";
import Newsletter from "~/components/missions/newsletter";
import Partners from "~/components/missions/partners";
import GradientBg from "~/components/ui/gradient-bg";
import Pagination from "~/components/ui/pagination";
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

const FAKE_MISSION_TEMPLATES: Array<Pick<BrowseMission, "title" | "city" | "domain" | "organizationName" | "publisherName" | "schedule">> = [
  {
    title: "Améliorer la qualité de vie des personnes en situation de handicap",
    city: "Paris",
    domain: "social_solidarite",
    organizationName: "APF France handicap",
    publisherName: "JeVeuxAider",
    schedule: "30j/an",
  },
  {
    title: "Aide soignant militaire",
    city: "Lyon",
    domain: "sante_soins",
    organizationName: "Service de santé des armées",
    publisherName: "Service Civique",
    schedule: "Temps plein",
  },
  {
    title: "Participer à l'information du public concernant l'accès aux soins",
    city: "Marseille",
    domain: "sante_soins",
    organizationName: "ARS PACA",
    publisherName: "JeVeuxAider",
    schedule: "Quelques heures par semaine",
  },
  {
    title: "Devenir infirmier pompier volontaire",
    city: "Bordeaux",
    domain: "securite_defense",
    organizationName: "SDIS 33",
    publisherName: "Réserve Civique",
    schedule: "1 jour par semaine",
  },
  {
    title: "Accompagner des jeunes dans leurs projets scolaires",
    city: "Nantes",
    domain: "education_transmission",
    organizationName: "Afev",
    publisherName: "Service Civique",
    schedule: "2 demi-journées par semaine",
  },
  {
    title: "Distribuer des repas aux personnes en précarité",
    city: "Toulouse",
    domain: "social_solidarite",
    organizationName: "Restos du Cœur",
    publisherName: "JeVeuxAider",
    schedule: "Quelques heures par semaine",
  },
  {
    title: "Sensibiliser à la protection des océans",
    city: "Nice",
    domain: "environnement_nature",
    organizationName: "Surfrider Foundation",
    publisherName: "JeVeuxAider",
    schedule: "Mission ponctuelle",
  },
  {
    title: "Animer des ateliers culturels en maison de retraite",
    city: "Lille",
    domain: "culture_arts",
    organizationName: "Les Petits Frères des Pauvres",
    publisherName: "JeVeuxAider",
    schedule: "1 demi-journée par semaine",
  },
  {
    title: "Coacher des sportifs amateurs en quartier prioritaire",
    city: "Strasbourg",
    domain: "sport_animation",
    organizationName: "Sport dans la Ville",
    publisherName: "Service Civique",
    schedule: "10h par semaine",
  },
  {
    title: "Participer à une mission humanitaire en Afrique",
    city: "Montpellier",
    domain: "international_humanitaire",
    organizationName: "Médecins du Monde",
    publisherName: "JeVeuxAider",
    schedule: "6 mois",
  },
  {
    title: "Trier et redistribuer des denrées alimentaires",
    city: "Rennes",
    domain: "social_solidarite",
    organizationName: "Banque Alimentaire",
    publisherName: "JeVeuxAider",
    schedule: "Quelques heures par mois",
  },
  {
    title: "Apprendre à lire à des adultes en difficulté",
    city: "Grenoble",
    domain: "education_transmission",
    organizationName: "Secours Catholique",
    publisherName: "JeVeuxAider",
    schedule: "2h par semaine",
  },
  {
    title: "Soutenir le maintien à domicile des personnes âgées",
    city: "Reims",
    domain: "sante_soins",
    organizationName: "Croix-Rouge française",
    publisherName: "JeVeuxAider",
    schedule: "Quelques heures par semaine",
  },
  {
    title: "Restaurer un sentier en parc national",
    city: "Annecy",
    domain: "environnement_nature",
    organizationName: "Parcs nationaux de France",
    publisherName: "Service Civique",
    schedule: "Mission ponctuelle",
  },
  {
    title: "Accompagner un mineur isolé dans ses démarches",
    city: "Le Havre",
    domain: "social_solidarite",
    organizationName: "France Terre d'Asile",
    publisherName: "JeVeuxAider",
    schedule: "1 jour par semaine",
  },
  {
    title: "Co-animer un club de lecture avec des collégiens",
    city: "Dijon",
    domain: "education_transmission",
    organizationName: "Lire et faire lire",
    publisherName: "JeVeuxAider",
    schedule: "1h par semaine",
  },
  {
    title: "Participer à des maraudes auprès des sans-abris",
    city: "Paris",
    domain: "social_solidarite",
    organizationName: "Emmaüs Solidarité",
    publisherName: "JeVeuxAider",
    schedule: "Soirée hebdomadaire",
  },
  {
    title: "Encadrer un groupe d'enfants pendant les vacances",
    city: "Marseille",
    domain: "sport_animation",
    organizationName: "UFOLEP",
    publisherName: "Service Civique",
    schedule: "2 semaines",
  },
  {
    title: "Accueillir et orienter des visiteurs dans un musée",
    city: "Lyon",
    domain: "culture_arts",
    organizationName: "Musée des Beaux-Arts",
    publisherName: "JeVeuxAider",
    schedule: "Week-end",
  },
  {
    title: "Aider à la collecte de données sur la biodiversité locale",
    city: "Bordeaux",
    domain: "environnement_nature",
    organizationName: "LPO France",
    publisherName: "JeVeuxAider",
    schedule: "Mission ponctuelle",
  },
];

const FAKE_MISSIONS: BrowseMission[] = FAKE_MISSION_TEMPLATES.map((template, index) => ({
  _id: `fake-${index}`,
  id: `fake-${index}`,
  title: template.title,
  description: null,
  city: template.city,
  departmentCode: null,
  departmentName: null,
  domain: template.domain,
  domainOriginal: null,
  domainLogo: null,
  organizationName: template.organizationName,
  organizationLogo: null,
  publisherName: template.publisherName,
  publisherLogo: null,
  applicationUrl: null,
  schedule: template.schedule,
}));

export default function MissionsPage() {
  const [filterValues, setFilterValues] = useState<Record<FilterKey, string[]>>({
    departmentCode: [],
    tranche_age: [],
    type_mission: [],
    secteur_activite: [],
    domaine: [],
  });
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<BrowseMission[]>(FAKE_MISSIONS.slice(0, PAGE_SIZE));
  const [total, setTotal] = useState(FAKE_MISSIONS.length);
  const [facets, setFacets] = useState<Record<string, FacetCount[]>>(FAKE_FACETS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const start = (page - 1) * PAGE_SIZE;
    setItems(FAKE_MISSIONS.slice(start, start + PAGE_SIZE));
    setTotal(FAKE_MISSIONS.length);

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
