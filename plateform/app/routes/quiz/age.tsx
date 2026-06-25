import { useEffect, useState, type SubmitEvent } from "react";
import { useLocation, useOutletContext } from "react-router";
import Label from "~/components/quiz/label";
import NextButton from "~/components/quiz/next-button";
import { resolveQuizEntrySource, trackQuizStarted } from "~/services/tracking/events";
import { useQuizStore } from "~/stores/quiz";
import { isValidAge } from "~/utils/quiz";
import type { QuizOutletContext } from "./_layout";

const MIN_AGE = 16;
const MAX_AGE = 99;

const STEP_ID = "age";
// Step custom : stocke une valeur numérique brute (pas de taxonomyKey).
// Utilisée uniquement dans les conditions des steps suivants (ex: handicap).
const DEFAULT_TITLE = "Quel âge as-tu ?";
const DEFAULT_SUBTITLE = "Certaines missions dépendent de l'âge.";

// Type de navigation du document courant ("navigate" | "reload" | "back_forward"), pour distinguer
// une arrivée directe d'un simple refresh.
function getNavigationType(): string | undefined {
  if (typeof performance === "undefined" || !performance.getEntriesByType) return undefined;
  const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  return entry?.type;
}

export default function AgeStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext, saveScoring } = useOutletContext<QuizOutletContext>();
  const location = useLocation();
  const [value, setValue] = useState<string>("");

  useEffect(() => {
    if (answers[STEP_ID]?.type === "numeric" && isValidAge(answers[STEP_ID].value, MIN_AGE, MAX_AGE)) setValue(String(answers[STEP_ID].value));
  }, [answers[STEP_ID]]);

  // quiz.started : début d'une tentative.
  useEffect(() => {
    // Arrivée directe/externe sur /quiz/age (chargement initial du document, hors refresh) → nouvelle
    // tentative : on réinitialise pour repartir d'un store propre et émettre quiz.started.
    // (location.key === "default" = aucune navigation in-app préalable ; "reload" = refresh à ignorer.)
    if (location.key === "default" && getNavigationType() !== "reload") {
      useQuizStore.getState().reset();
    }

    // Émis une seule fois par quizAttemptId : refresh / retour arrière sur /quiz/age ne réémettent pas.
    const { startedAttemptId, quizAttemptId, markQuizStarted } = useQuizStore.getState();
    if (startedAttemptId === quizAttemptId) return;
    markQuizStarted();
    const hint = (location.state as { entrySource?: string } | null)?.entrySource;
    trackQuizStarted({ entrySource: resolveQuizEntrySource(hint) });
  }, []);

  const numeric = Number(value);
  const valid = isValidAge(numeric, MIN_AGE, MAX_AGE);

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!valid) return;
    setAnswer(STEP_ID, { type: "numeric", value: numeric });
    const existingHandicap = answers["handicap"]?.type === "options" ? answers["handicap"].option_ids[0] === "oui" : false;
    setAnswer("tranche_age", { type: "params", taxonomy: "tranche_age", params: { age: numeric, handicap: existingHandicap } });
    saveScoring();
    goNext();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
      <Label subtitle={DEFAULT_SUBTITLE} htmlFor="age-input">
        {DEFAULT_TITLE}
      </Label>

      <select id="age-input" className="fr-select md:max-w-80!" value={value} onChange={(e) => setValue(e.target.value)}>
        <option value="">Sélectionne ton âge</option>
        {Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => (
          <option key={i} value={i + MIN_AGE}>
            {i + MIN_AGE}
          </option>
        ))}
      </select>
      <NextButton type="submit" disabled={!valid} />
    </form>
  );
}
