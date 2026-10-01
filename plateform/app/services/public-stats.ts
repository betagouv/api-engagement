import { adaptMetabasePoints } from "@engagement/dto";
import { STATS_ANSWERS_CARD, STATS_CACHE_TTL_MS, STATS_CARDS, STATS_PARTIAL_CACHE_TTL_MS, STATS_QUESTIONS } from "~/config/public-stats";
import { createApi } from "~/services/api";
import { toAnswerRows, toDepartmentPoints, toWeeklyPoints, type MetabaseCardResult } from "~/utils/public-stats";
import { createValueCache } from "~/utils/value-cache";

type Api = ReturnType<typeof createApi>;

// Une card en erreur ne doit pas faire tomber la page : elle est simplement absente (null).
async function fetchCard(api: Api, cardId: number, variables?: Record<string, string>) {
  try {
    return await api.post<MetabaseCardResult>(`/metabase/card/${cardId}/query`, variables ? { variables } : {});
  } catch {
    return null;
  }
}

async function fetchPublicStats(request: Request) {
  const api = createApi(request);
  const [homepageViews, quizStarted, quizCompleted, redirections, impressions, departments] = await Promise.all([
    fetchCard(api, STATS_CARDS.homepageViews),
    fetchCard(api, STATS_CARDS.quizStarted),
    fetchCard(api, STATS_CARDS.quizCompleted),
    fetchCard(api, STATS_CARDS.redirections),
    fetchCard(api, STATS_CARDS.impressions),
    fetchCard(api, STATS_CARDS.departments),
  ]);
  const answerCards = await Promise.all(
    STATS_QUESTIONS.map(async (question) => [question, await fetchCard(api, STATS_ANSWERS_CARD, { question })] as [string, MetabaseCardResult | null]),
  );

  const data = {
    homepageViews: homepageViews && toWeeklyPoints(homepageViews),
    quizStarted: quizStarted && toWeeklyPoints(quizStarted),
    quizCompleted: quizCompleted && toWeeklyPoints(quizCompleted),
    redirections: redirections && toWeeklyPoints(redirections),
    impressions: impressions && adaptMetabasePoints(impressions),
    departments: departments && toDepartmentPoints(departments),
    answers: answerCards.some(([, card]) => card) ? toAnswerRows(answerCards) : null,
  };
  const complete = [homepageViews, quizStarted, quizCompleted, redirections, impressions, departments, ...answerCards.map(([, card]) => card)].every(Boolean);

  return { data, complete };
}

// Une visite déclenche 16 appels Metabase, comptés par le rate limit IP partagé de l'instance : on mémorise donc le résultat.
// Un résultat incomplet n'est gardé que brièvement pour réessayer vite sans marteler l'API.
const statsCache = createValueCache<Awaited<ReturnType<typeof fetchPublicStats>>>(({ complete }) => (complete ? STATS_CACHE_TTL_MS : STATS_PARTIAL_CACHE_TTL_MS));

export async function loadPublicStats(request: Request) {
  // Le chargement est partagé entre visiteurs : il ne doit pas dépendre du signal d'annulation de la requête qui le déclenche.
  const detachedRequest = new Request(request.url, { headers: request.headers });
  const { data } = await statsCache.get(() => fetchPublicStats(detachedRequest));
  return data;
}
