import type { MetabasePoint } from "@engagement/dto";
import { useMemo, useState } from "react";
import { DsfrBarChart, StatsDataTable } from "./dsfr-charts";

export type QuestionAnswerRow = { question: string; answer: string; value: number };

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
      <DsfrBarChart data={data} horizontal name={question} />
      <StatsDataTable data={data} caption={`Réponses à la question : ${question}`} nameHeader="Réponse" />
    </>
  );
}
