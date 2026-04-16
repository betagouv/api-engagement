import { create } from "zustand";
import type { Question } from "~/types/quiz";

const FAKE_QUESTIONS: Question[] = [
  {
    slug: "question-1",
    label: "Question 1",
    type: "single",
    answers: [{ id: "answer-1", label: "Réponse 1" }],
  },
];

type QuizState = {
  questions: Question[];
  // clé = slug de la question, valeur = id de la réponse choisie
  answers: Record<string, string>;

  // Actions
  setQuestions: (questions: Question[]) => void;
  answer: (questionSlug: string, answerId: string) => void;
  next: () => void;
  reset: () => void;
};

export const useQuizStore = create<QuizState>((set) => ({
  questions: FAKE_QUESTIONS,
  answers: {},

  setQuestions: (questions) => set({ questions, answers: {} }),

  answer: (questionSlug, answerId) =>
    set((state) => ({
      answers: { ...state.answers, [questionSlug]: answerId },
    })),

  next: () => {
    // Réservé pour d'éventuels side-effects futurs (analytics, etc.)
  },

  reset: () => set({ questions: [], answers: {} }),
}));
