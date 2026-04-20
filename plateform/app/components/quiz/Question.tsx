import type { Question as QuestionType } from "~/types/quiz";

type Props = {
  question: QuestionType;
  selectedAnswer: string | undefined;
  onAnswer: (answerId: string) => void;
};

export default function Question({ question, selectedAnswer, onAnswer }: Props) {
  const name = `question-${question.slug}`;

  return (
    <fieldset className="fr-fieldset">
      <legend className="fr-fieldset__legend fr-text--regular">{question.label}</legend>
      {question.answers.map((answer) => {
        const id = `${name}-${answer.id}`;
        return (
          <div key={answer.id} className="fr-fieldset__element">
            <div className="fr-radio-group">
              <input type="radio" id={id} name={name} value={answer.id} checked={selectedAnswer === answer.id} onChange={() => onAnswer(answer.id)} />
              <label className="fr-label" htmlFor={id}>
                {answer.label}
              </label>
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}
