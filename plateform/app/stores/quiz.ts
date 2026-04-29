import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StepId } from "~/config/quiz-flow";
import type { QuizAnswers, ScreenAnswer } from "~/types/quiz";

interface QuizStore {
  answers: QuizAnswers;
  geo?: { lat: number; lon: number };
  setAnswer: (stepId: StepId, answer: ScreenAnswer) => void;
  setGeo: (geo: { lat: number; lon: number }) => void;
  reset: () => void;
}

// Persisté en localStorage : en cas de refresh, les réponses sont restaurées
// et le guard du layout reprend au bon step.
export const useQuizStore = create<QuizStore>()(
  persist(
    (set) => ({
      answers: {},
      geo: undefined,
      setAnswer: (stepId, answer) => set((s) => ({ answers: { ...s.answers, [stepId]: answer } })),
      setGeo: (geo) => set({ geo }),
      reset: () => set({ answers: {}, geo: undefined }),
    }),
    { name: "quiz-answers", version: 2 },
  ),
);
