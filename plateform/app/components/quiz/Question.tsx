import { RadioButtons } from "@codegouvfr/react-dsfr/RadioButtons";
import type { Question as QuestionType } from "~/types/quiz";

type Props = {
  question: QuestionType;
  selectedAnswer: string | undefined;
  onAnswer: (answerId: string) => void;
};

export default function Question({ question, selectedAnswer, onAnswer }: Props) {
  return (
    <RadioButtons
      legend={question.label}
      name={`question-${question.id}`}
      options={question.answers.map((answer) => ({
        label: answer.label,
        nativeInputProps: {
          value: answer.id,
          checked: selectedAnswer === answer.id,
          onChange: () => onAnswer(answer.id),
        },
      }))}
    />
  );
}
