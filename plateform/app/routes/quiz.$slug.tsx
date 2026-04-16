import { useEffect } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/quiz.$slug";
import Question from "~/components/quiz/Question";
import { useQuizStore } from "~/stores/quiz";

export function meta(): Route.MetaDescriptors {
  return [{ name: "robots", content: "noindex, nofollow" }];
}

// Pas de loader serveur → clientLoader seul = rendu client uniquement
// Le serveur renvoie HydrateFallback, le client prend le relais après hydratation
export async function clientLoader() {
  return {};
}

export function HydrateFallback() {
  return null;
}

export default function QuizPage({ params }: Route.ComponentProps) {
  const { slug } = params;
  const navigate = useNavigate();

  const { questions, answers, answer, next } = useQuizStore();

  const questionIndex = questions.findIndex((q) => q.slug === slug);
  const question = questions[questionIndex];
  const isLast = questionIndex === questions.length - 1;

  // Slug inconnu → retour à l'accueil
  useEffect(() => {
    if (questions.length > 0 && !question) {
      navigate("/");
    }
  }, [question, questions.length, navigate]);

  // Quiz terminé → résultats
  useEffect(() => {
    if (!isLast) return;
    if (!answers[slug]) return;
    navigate("/missions");
  }, [answers, slug, isLast, navigate]);

  if (!question) return null;

  const nextSlug = !isLast ? questions[questionIndex + 1].slug : null;

  return (
    <main className="fr-container fr-py-6w">
      <div className="fr-stepper fr-mb-4w">
        <h2 className="fr-stepper__title">
          Question {questionIndex + 1} sur {questions.length}
        </h2>
        <div
          className="fr-stepper__steps"
          data-fr-current-step={questionIndex + 1}
          data-fr-steps={questions.length}
        />
      </div>

      <Question question={question} selectedAnswer={answers[slug]} onAnswer={(answerId) => answer(slug, answerId)} />

      <button
        className="fr-btn fr-mt-4w"
        disabled={!answers[slug]}
        onClick={() => {
          next();
          if (nextSlug) navigate(`/quiz/${nextSlug}`);
          else navigate("/missions");
        }}
      >
        {isLast ? "Voir mes résultats" : "Question suivante"}
      </button>
    </main>
  );
}
