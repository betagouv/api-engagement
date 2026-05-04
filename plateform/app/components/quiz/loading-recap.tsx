import { useEffect, useState } from "react";
import Label from "~/components/quiz/label";

type Props = {
  items: string[];
  onComplete: () => void;
};

export default function LoadingRecap({ items, onComplete }: Props) {
  const [revealed, setRevealed] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (revealed >= items.length) return;
    const timer = setTimeout(() => setRevealed((r) => r + 1), 900);
    return () => clearTimeout(timer);
  }, [revealed, items.length]);

  useEffect(() => {
    if (revealed < items.length) return;
    const exitTimer = setTimeout(() => setExiting(true), 800);
    const completeTimer = setTimeout(onComplete, 1500);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [revealed, items.length, onComplete]);

  return (
    <div className={`flex flex-col gap-10 transition-all duration-700 ease-in ${exiting ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0"}`}>
      <Label>
        Parfait.
        <br />
        On recherche des missions pour toi !
      </Label>
      <ul className="list-none! p-0! m-0! flex flex-col gap-3">
        {items.map((label, i) => (
          <li
            key={i}
            className={`flex items-center fr-text--lead gap-3 transition-all duration-700 ease-out ${i < revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
          >
            <span
              className="fr-icon-arrow-right-line fr-icon--sm opacity-50 flex items-center justify-center bg-background-default-grey-active h-6 w-6 rounded-full"
              aria-hidden="true"
            />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
