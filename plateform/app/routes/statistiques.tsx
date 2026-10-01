import { adaptMetabasePoints, type MetabasePoint, type MetabaseQueryResponse } from "@engagement/dto";
import type { ReactNode } from "react";
import { DepartmentsMap, DsfrBarChart, StatsDataTable, type DepartmentPoint } from "~/components/stats/dsfr-charts";
import { QuestionsChart, type QuestionAnswerRow } from "~/components/stats/questions-chart";
import { createApi } from "~/services/api";
import type { Route } from "./+types/statistiques";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Statistiques — Trouve ta mission" }];
}

type CardResult = Pick<MetabaseQueryResponse, "data">;

const CARDS = {
  homepageViews: 6575,
  quizStarted: 6577,
  quizCompleted: 6576,
  redirections: 6583,
  impressions: 6578,
  departments: 6582,
} as const;

// Une card en erreur ne doit pas faire tomber la page : elle est simplement absente (null).
const fetchCard = async (api: ReturnType<typeof createApi>, id: number, variables?: Record<string, string>) => {
  try {
    return await api.post<CardResult>(`/metabase/card/${id}/query`, variables ? { variables } : {});
  } catch {
    return null;
  }
};

// La card 6584 ne renvoie pas la question : on l'interroge une fois par question via son paramètre.
// ponytail: liste alignée sur le SQL de la card ; ajouter ici toute nouvelle question.
const QUESTIONS = ["Âge", "Handicap reconnu", "Région", "Déplacements", "Ce qui les amène", "Rythme souhaité", "Domaines", "Activités", "Équipe", "Cadre de travail"];

const formatWeek = (name: string) => (/^\d{4}-\d{2}-\d{2}/.test(name) ? new Date(name).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : name);

export async function loader({ request }: Route.LoaderArgs) {
  const api = createApi(request);
  const entries = await Promise.all(Object.entries(CARDS).map(async ([key, id]) => [key, await fetchCard(api, id)] as const));
  const results = Object.fromEntries(entries) as Record<keyof typeof CARDS, CardResult | null>;
  const answerCards = await Promise.all(QUESTIONS.map(async (question) => [question, await fetchCard(api, 6584, { question })] as const));

  // Les semaines (ISO) ne sont pas toujours triées par Metabase.
  const weekly = (card: CardResult | null): MetabasePoint[] | null =>
    card &&
    adaptMetabasePoints(card)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({ ...p, name: formatWeek(p.name) }));
  const answers: QuestionAnswerRow[] | null = answerCards.some(([, card]) => card)
    ? answerCards.flatMap(([question, card]) => adaptMetabasePoints(card, 0, 1).map((p) => ({ question, answer: p.name, value: p.value })))
    : null;

  return {
    homepageViews: weekly(results.homepageViews),
    quizStarted: weekly(results.quizStarted),
    quizCompleted: weekly(results.quizCompleted),
    redirections: weekly(results.redirections),
    impressions: results.impressions && adaptMetabasePoints(results.impressions),
    // Colonnes de la card 6582 : department_code, département, nombre.
    departments: results.departments && (results.departments.data.rows.map((r) => ({ code: String(r[0]), nom: String(r[1]), value: Number(r[2]) || 0 })) as DepartmentPoint[]),
    answers,
  };
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
  const weeklyCharts: [string, MetabasePoint[] | null][] = [
    ["Visites hebdomadaires de la page d'accueil", loaderData.homepageViews],
    ["Quiz démarrés par semaine", loaderData.quizStarted],
    ["Quiz terminés par semaine", loaderData.quizCompleted],
    ["Redirections par semaine", loaderData.redirections],
  ];

  return (
    <main id="contenu" tabIndex={-1}>
      <div className="fr-container py-8 md:py-16">
        <h1>Statistiques</h1>
        {weeklyCharts.map(([title, data]) => (
          <Section key={title} title={title} data={data}>
            <DsfrBarChart data={data!} name={title} />
            <StatsDataTable data={data!} caption={title} nameHeader="Semaine" />
          </Section>
        ))}
        <Section title="Réponses aux questions du quiz" data={loaderData.answers}>
          <QuestionsChart rows={loaderData.answers!} />
        </Section>
        <Section title="Impressions par annonceur" data={loaderData.impressions}>
          <DsfrBarChart data={loaderData.impressions!} horizontal name="Impressions par annonceur" />
          <StatsDataTable data={loaderData.impressions!} caption="Impressions par annonceur" nameHeader="Annonceur" />
        </Section>
        <Section title="Quiz terminés par département" data={loaderData.departments}>
          <DepartmentsMap data={loaderData.departments!} name="Quiz terminés par département" />
        </Section>
      </div>
    </main>
  );
}
