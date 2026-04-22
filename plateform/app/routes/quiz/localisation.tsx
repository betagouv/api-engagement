import { useState, type FormEvent } from "react";
import { useOutletContext } from "react-router";
import type { QuizOutletContext } from "./_layout";
import { useQuizStore } from "~/stores/quiz";

// Stub : adresse saisie libre, coords factices. TODO : brancher api-adresse.data.gouv.fr.
export default function LocalisationStep() {
  const setAnswer = useQuizStore((s) => s.setAnswer);
  const setGeo = useQuizStore((s) => s.setGeo);
  const { goNext, goBack } = useOutletContext<QuizOutletContext>();

  const [value, setValue] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    const coords = { lat: 48.8566, lon: 2.3522 };
    setGeo(coords);
    setAnswer("localisation", { type: "location", ...coords });
    goNext();
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="fr-h3">Où veux-tu chercher des missions ?</h1>

      <div className="fr-input-group">
        <label className="fr-label" htmlFor="localisation-input">
          Adresse, ville ou code postal
        </label>
        <input
          id="localisation-input"
          className="fr-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
      </div>

      <div className="fr-mt-2w">
        <button type="button" className="fr-btn fr-btn--secondary fr-mr-2w" onClick={goBack}>
          Retour
        </button>
        <button type="submit" className="fr-btn" disabled={!value.trim()}>
          Continuer
        </button>
      </div>
    </form>
  );
}
