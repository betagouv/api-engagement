import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StepId } from "~/config/quiz-flow";
import type { QuizAnswers, ScreenAnswer } from "~/types/quiz";

interface QuizStore {
  answers: QuizAnswers;
  userScoringId?: string;
  distinctId: string;
  quizAttemptId: string;
  quizStartedAt: number;
  // Dernière tentative pour laquelle l'évènement quiz.started a été émis (déduplication).
  startedAttemptId?: string;
  setAnswer: (stepId: StepId, answer: ScreenAnswer) => void;
  setUserScoringId: (id: string) => void;
  markQuizStarted: () => void;
  reset: () => void;
}

// Persisté en localStorage : en cas de refresh, les réponses sont restaurées
// et le guard du layout reprend au bon step.
export const useQuizStore = create<QuizStore>()(
  persist(
    (set) => ({
      answers: {},
      userScoringId: undefined,
      // Généré une fois et conservé entre sessions pour authentifier les PUT.
      distinctId: crypto.randomUUID(),
      // Identifiant de la tentative de quiz courante (regénéré à chaque nouvelle tentative).
      quizAttemptId: crypto.randomUUID(),
      // Horodatage de début de la tentative courante (pour la durée du quiz).
      quizStartedAt: Date.now(),
      setAnswer: (stepId, answer) => set((s) => ({ answers: { ...s.answers, [stepId]: answer } })),
      setUserScoringId: (id) => set({ userScoringId: id }),
      // Marque la tentative courante comme "démarrée" (quiz.started émis). reset() regénère
      // quizAttemptId → la nouvelle tentative ne correspondra plus à startedAttemptId et réémettra.
      markQuizStarted: () => set((s) => ({ startedAttemptId: s.quizAttemptId })),
      // reset démarre une nouvelle tentative : efface réponses et scoring, conserve distinctId,
      // et regénère quizAttemptId + quizStartedAt.
      reset: () => set({ answers: {}, userScoringId: undefined, quizAttemptId: crypto.randomUUID(), quizStartedAt: Date.now() }),
    }),
    { name: "quiz-answers", version: 5 },
  ),
);
