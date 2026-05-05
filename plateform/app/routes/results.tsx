import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { fetchMatches } from "~/services/matching";
import { useQuizStore } from "~/stores/quiz";
import type { MatchResultItem } from "~/types/matching";

export default function ResultsPage() {
  const { userScoringId } = useParams<{ userScoringId: string }>();
  const reset = useQuizStore((s) => s.reset);
  const [items, setItems] = useState<MatchResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userScoringId) {
      setError("Identifiant de scoring manquant.");
      setLoading(false);
      return;
    }
    fetchMatches(userScoringId, 5)
      .then((res) => setItems(res.items))
      .catch(() => setError("Impossible de charger les missions. Réessaie plus tard."))
      .finally(() => setLoading(false));
  }, [userScoringId]);

  return (
    <main className="fr-container fr-py-6w">
      <h1 className="fr-h3 fr-mb-4w">Missions recommandées</h1>

      {loading && <p className="fr-text--sm">Chargement…</p>}

      {error && (
        <div className="fr-alert fr-alert--error fr-mb-4w">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && items.length === 0 && <p className="fr-text--sm fr-mb-4w">Aucune mission trouvée pour ce profil.</p>}

      {!loading && !error && items.length > 0 && (
        <ul className="fr-mb-6w" style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
          {items.map((item, i) => (
            <li key={item.missionId} className="fr-card fr-card--no-arrow fr-p-3w">
              <p className="fr-text--xs fr-mb-1w" style={{ color: "#666" }}>
                #{i + 1} · score {Math.round(item.totalScore * 100)}%{item.distanceKm != null && ` · ${Math.round(item.distanceKm)} km`}
              </p>
              <p className="fr-text--bold fr-mb-1w">{item.title}</p>
              <p className="fr-text--sm" style={{ color: "#555" }}>
                {[item.publisherName, item.city].filter(Boolean).join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Link to="/quiz/age" onClick={() => reset()} className="fr-btn fr-btn--secondary">
        Recommencer le quiz
      </Link>
    </main>
  );
}
