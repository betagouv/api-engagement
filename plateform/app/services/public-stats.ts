import { adaptMetabasePoints } from "@engagement/dto";
import { STATS_ANSWERS_CARD, STATS_CARDS, STATS_QUESTIONS } from "~/config/public-stats";
import { createApi } from "~/services/api";
import { toAnswerRows, toDepartmentPoints, toWeeklyPoints, type MetabaseCardResult } from "~/utils/public-stats";

type Api = ReturnType<typeof createApi>;

// Une card en erreur ne doit pas faire tomber la page : elle est simplement absente (null).
async function fetchCard(api: Api, cardId: number, variables?: Record<string, string>) {
  try {
    return await api.post<MetabaseCardResult>(`/metabase/card/${cardId}/query`, variables ? { variables } : {});
  } catch {
    return null;
  }
}

export async function loadPublicStats(request: Request) {
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

  return {
    homepageViews: homepageViews && toWeeklyPoints(homepageViews),
    quizStarted: quizStarted && toWeeklyPoints(quizStarted),
    quizCompleted: quizCompleted && toWeeklyPoints(quizCompleted),
    redirections: redirections && toWeeklyPoints(redirections),
    impressions: impressions && adaptMetabasePoints(impressions),
    departments: departments && toDepartmentPoints(departments),
    answers: answerCards.some(([, card]) => card) ? toAnswerRows(answerCards) : null,
  };
}
