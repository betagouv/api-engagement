import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StepId } from "~/config/quiz-flow";
import type { QuizAnswers, ScreenAnswer } from "~/types/quiz";

interface QuizStore {
  answers: QuizAnswers;
  geo?: { lat: number; lon: number; label: string };
  userScoringId?: string;
  distinctId: string;
  setAnswer: (stepId: StepId, answer: ScreenAnswer) => void;
  setGeo: (geo: { lat: number; lon: number; label: string }) => void;
  setUserScoringId: (id: string) => void;
  reset: () => void;
}

// Persisté en localStorage : en cas de refresh, les réponses sont restaurées
// et le guard du layout reprend au bon step.
export const useQuizStore = create<QuizStore>()(
  persist(
    (set) => ({
      answers: {},
      geo: undefined,
      userScoringId: undefined,
      // Généré une fois et conservé entre sessions pour authentifier les PUT.
      distinctId: crypto.randomUUID(),
      setAnswer: (stepId, answer) => set((s) => ({ answers: { ...s.answers, [stepId]: answer } })),
      setGeo: (geo) => set({ geo }),
      setUserScoringId: (id) => set({ userScoringId: id }),
      // reset efface les réponses et le scoring mais conserve distinctId.
      reset: () => set({ answers: {}, geo: undefined, userScoringId: undefined }),
    }),
    { name: "quiz-answers", version: 3 },
  ),
);
