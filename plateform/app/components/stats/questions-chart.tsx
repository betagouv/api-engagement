import type { MetabasePoint } from "@engagement/dto";
import { useState } from "react";
import { STATS_QUESTIONS as questions } from "~/config/public-stats";
import type { QuestionAnswerRow } from "~/utils/public-stats";
import { BarChart } from "./bar-chart";
import { ChartDataTable } from "./chart-data-table";

export function QuestionsChart({ rows, filtered, unavailable = [] }: { rows: QuestionAnswerRow[]; filtered?: boolean; unavailable?: string[] }) {
  const [question, setQuestion] = useState(questions[0] ?? "");
  const data: MetabasePoint[] = rows.filter((r) => r.question === question).map((r) => ({ name: r.answer, value: r.value }));

  return (
    <>
      <div className="fr-select-group">
        <label className="fr-label" htmlFor="stats-question">
          Question
        </label>
        <select className="fr-select" id="stats-question" value={question} onChange={(e) => setQuestion(e.target.value)}>
          {questions.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
      </div>
      {unavailable.includes(question) ? (
        <p className="fr-alert fr-alert--warning fr-alert--sm">Ces données sont momentanément indisponibles.</p>
      ) : filtered && data.length === 0 ? (
        <p className="fr-alert fr-alert--info fr-alert--sm">Pas assez de réponses pour ce territoire.</p>
      ) : (
        <>
          <BarChart data={data} name={question} horizontal />
          <ChartDataTable data={data} caption={`Réponses à la question : ${question}`} nameHeader="Réponse" />
        </>
      )}
    </>
  );
}
