import { Navigate } from "react-router";
import { QUIZ_FLOW } from "~/config/quiz-flow";

// /quiz → premier step de la version active du parcours.
export default function QuizIndex() {
  return <Navigate to={QUIZ_FLOW[0].route} replace />;
}
