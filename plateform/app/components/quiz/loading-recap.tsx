import { useEffect, useState } from "react";
import Label from "~/components/quiz/label";

type Props = {
  items: string[];
  durationMs?: number;
  onComplete: () => void;
};

export default function LoadingRecap({ items, durationMs = 4000, onComplete }: Props) {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const timer = setTimeout(onComplete, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onComplete]);

  useEffect(() => {
    if (revealed >= items.length) return;
    const timer = setTimeout(() => setRevealed((r) => r + 1), 600);
    return () => clearTimeout(timer);
  }, [revealed, items.length]);

  return (
    <div className="flex flex-col gap-10">
      <Label>
        Parfait.
        <br />
        On recherche des missions pour toi !
      </Label>
      <ul className="list-none! p-0! m-0! flex flex-col gap-3">
        {items.map((label, i) => (
          <li key={i} className={`flex items-center gap-3 text-sm transition-all duration-700 ease-out ${i < revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
            <span className="fr-icon-arrow-right-line opacity-50" aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
