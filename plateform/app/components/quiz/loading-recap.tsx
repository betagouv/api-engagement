import { useEffect, useState } from "react";
import Title from "~/components/quiz/title";

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
    <div className="tw:flex tw:flex-col tw:gap-10">
      <Title>
        Parfait.
        <br />
        On recherche des missions pour toi !
      </Title>
      <ul className="tw:list-none! tw:p-0! tw:m-0! tw:flex tw:flex-col tw:gap-3">
        {items.map((label, i) => (
          <li
            key={i}
            className={`tw:flex tw:items-center tw:gap-3 tw:text-sm tw:transition-all tw:duration-700 tw:ease-out ${
              i < revealed ? "tw:opacity-100 tw:translate-y-0" : "tw:opacity-0 tw:translate-y-2"
            }`}
          >
            <span className="fr-icon-arrow-right-line tw:opacity-50" aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
