import { Navigate } from "react-router";

// /quiz → /quiz/age (premier step).
export default function QuizIndex() {
  return <Navigate to="/quiz/age" replace />;
}
