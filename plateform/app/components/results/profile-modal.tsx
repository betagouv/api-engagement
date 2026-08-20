import { useState } from "react";
import { Link } from "react-router";
import Modal from "~/components/layout/modal";
import MissionTag from "~/components/ui/mission-tag";
import { QUIZ_FLOW } from "~/config/quiz-flow";
import { OPTIONS } from "~/config/quiz-options";
import { useQuizStore } from "~/stores/quiz";

// Bouton « Ton profil » + modale « Ce qu'on a compris de toi » : récapitule les réponses du quiz
// sous forme de tags et propose de refaire le quiz (renvoie vers le dernier step visible).
export default function ProfileModal({ quizHref }: { quizHref: string }) {
  const answers = useQuizStore((s) => s.answers);
  const [open, setOpen] = useState(false);

  // Libellés des réponses, dans l'ordre du parcours du quiz.
  const answerLabels = QUIZ_FLOW.flatMap((step) => {
    const answer = answers[step.id];
    if (!answer) return [];
    // Seul step numérique du parcours : l'âge.
    if (answer.type === "numeric") return [`${answer.value} ans`];
    // Localisation : libellé de l'adresse sélectionnée.
    if (answer.type === "params") return typeof answer.params.label === "string" ? [answer.params.label] : [];
    if (answer.type === "options") return answer.option_ids.map((optionId) => OPTIONS[`${answer.taxonomy}.${optionId}` as keyof typeof OPTIONS]?.label ?? optionId);
    return [];
  });

  return (
    <>
      <button type="button" className="fr-btn fr-btn--sm fr-btn--secondary shrink-0" onClick={() => setOpen(true)}>
        Ton profil
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Ce qu’on a compris de toi" size="lg">
        <p>
          Ces informations nous permettent de te proposer des missions qui te correspondent. Si ta situation a changé ou si tu veux explorer d’autres possibilités, tu peux modifier
          tes réponses et refaire le quiz.
        </p>

        {answerLabels.length > 0 && (
          <ul className="m-0! flex list-none! flex-wrap gap-2 p-0!">
            {answerLabels.map((label, index) => (
              <li key={`${index}-${label}`} className="m-0! p-0!">
                <MissionTag>{label}</MissionTag>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 flex justify-end">
          <Link to={quizHref} className="fr-btn fr-icon-pencil-line fr-btn--icon-left">
            Refaire le quiz
          </Link>
        </div>
      </Modal>
    </>
  );
}
