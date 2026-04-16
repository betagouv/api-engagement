import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { API_URL } from "~/services/config";
import { useQuizStore } from "~/stores/quiz";
import type { Mission } from "~/types/quiz";
import type { Route } from "./+types/missions";

export async function clientLoader() {
  return {};
}

export function HydrateFallback() {
  return null;
}

export function meta(): Route.MetaDescriptors {
  return [{ title: "Vos missions — Quiz Engagement" }, { name: "robots", content: "noindex, nofollow" }];
}

export default function MissionsPage() {
  const navigate = useNavigate();
  const { answers } = useQuizStore();

  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  // Rediriger si on arrive sans avoir fait le quiz
  useEffect(() => {
    const params = new URLSearchParams({ answers: Object.values(answers).join(","), limit: "9" });
    fetch(`${API_URL}/v0/mission?${params}`)
      .then((r) => r.json())
      .then((data: Mission[]) => {
        setMissions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [answers]);

  return (
    <main className="fr-container fr-py-6w">
      <h1>Vos missions recommandées</h1>

      {loading && <p>Chargement des missions...</p>}

      {!loading && missions.length === 0 && <p>Aucune mission ne correspond à vos réponses pour le moment.</p>}

      <ul className="fr-grid-row fr-grid-row--gutters">
        {missions.map((mission) => (
          <li key={mission._id} className="fr-col-12 fr-col-md-4">
            <div className="fr-card">
              <div className="fr-card__body">
                <div className="fr-card__content">
                  <h2 className="fr-card__title">
                    <a href={mission.applicationUrl} target="_blank" rel="noopener noreferrer">
                      {mission.title}
                    </a>
                  </h2>
                  <p className="fr-card__desc">{mission.organizationName}</p>
                  {mission.city && <p className="fr-card__detail">{mission.city}</p>}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <a href="/" className="fr-btn fr-btn--secondary fr-mt-6w">
        Recommencer le quiz
      </a>
    </main>
  );
}
