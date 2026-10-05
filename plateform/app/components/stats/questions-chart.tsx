import type { MetabasePoint } from "@engagement/dto";
import { useMemo, useState } from "react";
import type { QuestionAnswerRow } from "~/utils/public-stats";
import { BarChart } from "./bar-chart";
import { ChartDataTable } from "./chart-data-table";

export function QuestionsChart({ rows }: { rows: QuestionAnswerRow[] }) {
  const questions = useMemo(() => [...new Set(rows.map((r) => r.question))], [rows]);
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
      <BarChart data={data} name={question} horizontal />
      <ChartDataTable data={data} caption={`Réponses à la question : ${question}`} nameHeader="Réponse" />
    </>
  );
}
