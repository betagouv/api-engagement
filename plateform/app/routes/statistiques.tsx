import type { MetabasePoint } from "@engagement/dto";
import type { ReactNode } from "react";
import { BarChart } from "~/components/stats/bar-chart";
import { ChartDataTable } from "~/components/stats/chart-data-table";
import { DepartmentsMap } from "~/components/stats/departments-map";
import { QuestionsChart } from "~/components/stats/questions-chart";
import { loadPublicStats } from "~/services/public-stats";
import type { Route } from "./+types/statistiques";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Statistiques — Trouve ta mission" }];
}

export function loader({ request }: Route.LoaderArgs) {
  return loadPublicStats(request);
}

function Section({ title, data, children }: { title: string; data: unknown; children: ReactNode }) {
  return (
    <section className="fr-mb-6w">
      <h2 className="fr-h4">{title}</h2>
      {data ? children : <p className="fr-alert fr-alert--warning fr-alert--sm">Ces données sont momentanément indisponibles.</p>}
    </section>
  );
}

export default function Statistiques({ loaderData }: Route.ComponentProps) {
  const { homepageViews, quizStarted, quizCompleted, redirections, impressions, departments, answers } = loaderData;
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
        {weeklyCharts.map(([title, data]) => (
          <Section key={title} title={title} data={data}>
            <BarChart data={data!} name={title} />
            <ChartDataTable data={data!} caption={title} nameHeader="Semaine" />
          </Section>
        ))}
        <Section title="Réponses aux questions du quiz" data={answers}>
          <QuestionsChart rows={answers!} />
        </Section>
        <Section title="Impressions par annonceur" data={impressions}>
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
