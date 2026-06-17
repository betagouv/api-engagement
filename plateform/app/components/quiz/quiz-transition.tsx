import { type ReactNode, useEffect, useState } from "react";
import { QUIZ_TRANSITION_MS } from "~/services/config";

interface QuizTransitionProps {
  onComplete: () => void;
  children: ReactNode;
}

export default function QuizTransition({ onComplete, children }: QuizTransitionProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const enterFrame = requestAnimationFrame(() => setVisible(true));
    const exitTimer = setTimeout(() => setVisible(false), QUIZ_TRANSITION_MS - 700);
    const completeTimer = setTimeout(onComplete, QUIZ_TRANSITION_MS);
    return () => {
      cancelAnimationFrame(enterFrame);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return <div className={`transition-all duration-700 ease-in ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>{children}</div>;
}
