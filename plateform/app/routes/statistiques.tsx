import type { MetabasePoint } from "@engagement/dto";
import type { ReactNode } from "react";
import { Form } from "react-router";
import { BarChart } from "~/components/stats/bar-chart";
import { ChartDataTable } from "~/components/stats/chart-data-table";
import { DepartmentsMap } from "~/components/stats/departments-map";
import { QuestionsChart } from "~/components/stats/questions-chart";
import { TAXONOMY } from "@engagement/taxonomy";
import { STATS_REGIONS } from "~/config/public-stats";
import { loadPublicStats } from "~/services/public-stats";
import { parseTerritory, sortDepartments } from "~/utils/public-stats";
import type { Route } from "./+types/statistiques";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Statistiques — Trouve ta mission" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const territory = new URL(request.url).searchParams.get("territoire");
  const filter = parseTerritory(territory);
  const stats = await loadPublicStats(request, filter);
  return { ...stats, territory: Object.keys(filter).length ? territory : "" };
}

const REGION_OPTIONS = Object.entries(STATS_REGIONS).sort(([, a], [, b]) => a.localeCompare(b, "fr"));
const DEPARTMENT_OPTIONS = sortDepartments(Object.entries(TAXONOMY.departmentCode.values).map(([code, { label }]) => ({ code, nom: label.replace(/ \(.+\)$/, ""), value: 0 })));

const NATIONAL_NOTE = "Toute la France : ce graphique n'est pas disponible par territoire.";

function Section({ title, data, nationalOnly, children }: { title: string; data: unknown; nationalOnly?: boolean; children: ReactNode }) {
  return (
    <section className="fr-mb-6w">
      <h2 className="fr-h4">{title}</h2>
      {nationalOnly && <p className="fr-hint-text fr-mb-2w">{NATIONAL_NOTE}</p>}
      {data ? children : <p className="fr-alert fr-alert--warning fr-alert--sm">Ces données sont momentanément indisponibles.</p>}
    </section>
  );
}

export default function Statistiques({ loaderData }: Route.ComponentProps) {
  const { homepageViews, quizStarted, quizCompleted, redirections, impressions, departments, answers, territory } = loaderData;
  const filtered = Boolean(territory);
  const nationalOnlyTitles = ["Visites hebdomadaires de la page d'accueil", "Redirections par semaine"];
  const weeklyCharts: [string, MetabasePoint[] | null][] = [
    ["Visites hebdomadaires de la page d'accueil", homepageViews],
    ["Quiz démarrés par semaine", quizStarted],
    ["Quiz terminés par semaine", quizCompleted],
    ["Redirections par semaine", redirections],
  ];

  return (
    <main id="contenu" tabIndex={-1}>
      <div className="fr-container py-8 md:py-16">
        <h1>Statistiques</h1>
        <Form method="get" className="fr-select-group fr-mb-6w">
          <label className="fr-label" htmlFor="stats-territoire">
            Territoire
            <span className="fr-hint-text">Département ou région indiqué par le jeune dans le quiz</span>
          </label>
          <select className="fr-select" id="stats-territoire" name="territoire" defaultValue={territory ?? ""} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
            <option value="">Toute la France</option>
            <optgroup label="Régions">
              {REGION_OPTIONS.map(([code, label]) => (
                <option key={code} value={`region:${code}`}>
                  {label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Départements">
              {DEPARTMENT_OPTIONS.map(({ code, nom }) => (
                <option key={code} value={`department:${code}`}>
                  {code} – {nom}
                </option>
              ))}
            </optgroup>
          </select>
          <noscript>
            <button type="submit" className="fr-btn fr-mt-1w">
              Filtrer
            </button>
          </noscript>
        </Form>
        {weeklyCharts.map(([title, data]) => (
          <Section key={title} title={title} data={data} nationalOnly={filtered && nationalOnlyTitles.includes(title)}>
            <BarChart data={data!} name={title} />
            <ChartDataTable data={data!} caption={title} nameHeader="Semaine" />
          </Section>
        ))}
        <Section title="Réponses aux questions du quiz" data={answers}>
          <QuestionsChart rows={answers!} filtered={filtered} />
        </Section>
        <Section title="Impressions par annonceur" data={impressions} nationalOnly={filtered}>
          <BarChart data={impressions!} name="Impressions par annonceur" horizontal />
          <ChartDataTable data={impressions!} caption="Impressions par annonceur" nameHeader="Annonceur" />
        </Section>
        <Section title="Quiz terminés par département" data={departments}>
          <DepartmentsMap data={departments!} name="Quiz terminés par département" />
        </Section>
      </div>
    </main>
  );
}
