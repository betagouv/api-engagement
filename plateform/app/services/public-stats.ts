import { adaptMetabasePoints } from "@engagement/dto";
import { STATS_ANSWERS_CARD, STATS_CACHE_TTL_MS, STATS_CARDS, STATS_PARTIAL_CACHE_TTL_MS, STATS_QUESTIONS } from "~/config/public-stats";
import { createApi } from "~/services/api";
import { toAnswerRows, toDepartmentPoints, toWeeklyPoints, type MetabaseCardResult, type TerritoryFilter } from "~/utils/public-stats";
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

async function fetchPublicStats(request: Request, filter: TerritoryFilter) {
  const api = createApi(request);
  const [homepageViews, quizStarted, quizCompleted, redirections, impressions, departments] = await Promise.all([
    fetchCard(api, STATS_CARDS.homepageViews),
    fetchCard(api, STATS_CARDS.quizStarted, filter),
    fetchCard(api, STATS_CARDS.quizCompleted, filter),
    fetchCard(api, STATS_CARDS.redirections),
    fetchCard(api, STATS_CARDS.impressions),
    fetchCard(api, STATS_CARDS.departments, filter),
  ]);
  const answerCards = await Promise.all(
    STATS_QUESTIONS.map(async (question) => [question, await fetchCard(api, STATS_ANSWERS_CARD, { question, ...filter })] as [string, MetabaseCardResult | null]),
  );

  const data = {
    homepageViews: homepageViews && toWeeklyPoints(homepageViews),
    quizStarted: quizStarted && toWeeklyPoints(quizStarted),
    quizCompleted: quizCompleted && toWeeklyPoints(quizCompleted),
    redirections: redirections && toWeeklyPoints(redirections),
    impressions: impressions && adaptMetabasePoints(impressions),
    departments: departments && toDepartmentPoints(departments),
    answers: answerCards.some(([, card]) => card) ? toAnswerRows(answerCards) : null,
    unavailableQuestions: answerCards.filter(([, card]) => !card).map(([question]) => question),
  };
  const complete = [homepageViews, quizStarted, quizCompleted, redirections, impressions, departments, ...answerCards.map(([, card]) => card)].every(Boolean);

  return { data, complete };
}

// Une visite déclenche 16 appels Metabase, comptés par le rate limit IP partagé de l'instance : on mémorise donc le résultat.
// Un résultat incomplet n'est gardé que brièvement pour réessayer vite sans marteler l'API.
// Un cache par territoire : les clés sont bornées (filtre validé par parseTerritory).
type Stats = Awaited<ReturnType<typeof fetchPublicStats>>;
const statsCaches = new Map<string, ReturnType<typeof createValueCache<Stats>>>();
const getStatsCache = (key: string) => {
  let cache = statsCaches.get(key);
  if (!cache) statsCaches.set(key, (cache = createValueCache<Stats>(({ complete }) => (complete ? STATS_CACHE_TTL_MS : STATS_PARTIAL_CACHE_TTL_MS))));
  return cache;
};

export async function loadPublicStats(request: Request, filter: TerritoryFilter = {}) {
  // Le chargement est partagé entre visiteurs : il ne doit pas dépendre du signal d'annulation de la requête qui le déclenche.
  const detachedRequest = new Request(request.url, { headers: request.headers });
  const { data } = await getStatsCache(JSON.stringify(filter)).get(() => fetchPublicStats(detachedRequest, filter));
  return data;
}
