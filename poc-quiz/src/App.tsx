import { useEffect, useState } from "react";
import { fetchMatch, postUserScoring, type MatchResultItem } from "./api";
import { MatchResults } from "./components/MatchResults";
import { QuizForm } from "./components/QuizForm";

type AppState =
  | { screen: "quiz" }
  | { screen: "loading"; message: string }
  | { screen: "results"; userScoringId: string; items: MatchResultItem[]; tookMs: number }
  | { screen: "error"; message: string };

function getIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("id");
}

function setIdInUrl(id: string) {
  history.pushState({}, "", `?id=${id}`);
}

function clearIdFromUrl() {
  history.pushState({}, "", window.location.pathname);
}

export default function App() {
  const [state, setState] = useState<AppState>({ screen: "quiz" });

  // On mount: if ?id= is in the URL, load results directly
  useEffect(() => {
    const id = getIdFromUrl();
    if (!id) return;

    setState({ screen: "loading", message: "Chargement des résultats…" });
    fetchMatch(id, 20)
      .then((result) =>
        setState({ screen: "results", userScoringId: id, items: result.items, tookMs: result.tookMs })
      )
      .catch((e) => setState({ screen: "error", message: String(e) }));
  }, []);

  async function handleSubmit(answers: { taxonomy_value_key: string }[], geo: { lat: number; lon: number } | null) {
    setState({ screen: "loading", message: "Création du profil utilisateur…" });
    try {
      const scoring = await postUserScoring(answers, geo);

      setState({ screen: "loading", message: "Calcul du matching…" });
      const result = await fetchMatch(scoring.id, 20);

      setIdInUrl(scoring.id);
      setState({ screen: "results", userScoringId: scoring.id, items: result.items, tookMs: result.tookMs });
    } catch (e) {
      setState({ screen: "error", message: String(e) });
    }
  }

  function handleBack() {
    clearIdFromUrl();
    setState({ screen: "quiz" });
  }

  if (state.screen === "loading") {
    return (
      <div style={loadingStyle}>
        <div style={spinnerStyle} />
        <p style={{ color: "#6b7280", fontSize: 14 }}>{state.message}</p>
      </div>
    );
  }

  if (state.screen === "error") {
    return (
      <div style={errorContainerStyle}>
        <p style={{ color: "#dc2626", fontWeight: 600 }}>Erreur</p>
        <p style={{ color: "#374151", fontSize: 13 }}>{state.message}</p>
        <button onClick={handleBack} style={retryBtnStyle}>
          Retour au quiz
        </button>
      </div>
    );
  }

  if (state.screen === "results") {
    return (
      <MatchResults
        items={state.items}
        tookMs={state.tookMs}
        userScoringId={state.userScoringId}
        onBack={handleBack}
      />
    );
  }

  return <QuizForm onSubmit={handleSubmit} loading={false} />;
}

const loadingStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100vh",
  fontFamily: "system-ui, sans-serif",
  gap: 16,
};

const spinnerStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  border: "3px solid #e5e7eb",
  borderTop: "3px solid #3b82f6",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const errorContainerStyle: React.CSSProperties = {
  maxWidth: 480,
  margin: "80px auto",
  padding: 24,
  fontFamily: "system-ui, sans-serif",
  textAlign: "center",
};

const retryBtnStyle: React.CSSProperties = {
  marginTop: 16,
  background: "#3b82f6",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 20px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};
