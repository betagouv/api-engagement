import { useEffect, useState } from "react";
import { fetchTaxonomies, type Taxonomy } from "../api";
import { CityAutocomplete } from "./CityAutocomplete";

type Geo = { lat: number; lon: number } | null;

type Props = {
  onSubmit: (answers: { taxonomy_value_id: string }[], geo: Geo) => void;
  loading: boolean;
};

export function QuizForm({ onSubmit, loading }: Props) {
  const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [geoWithLabel, setGeoWithLabel] = useState<{ lat: number; lon: number; label: string } | null>(null);

  useEffect(() => {
    fetchTaxonomies()
      .then(setTaxonomies)
      .catch((e) => setFetchError(String(e)));
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectOnly(id: string, taxonomyId: string, type: Taxonomy["type"]) {
    if (type === "ordered" || type === "gate") {
      setSelected((prev) => {
        const next = new Set(prev);
        // remove other values from this taxonomy
        taxonomies
          .find((t) => t.id === taxonomyId)
          ?.values.forEach((v) => next.delete(v.id));
        next.add(id);
        return next;
      });
    } else {
      toggle(id);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const answers = Array.from(selected).map((id) => ({ taxonomy_value_id: id }));
    const geo: Geo = geoWithLabel ? { lat: geoWithLabel.lat, lon: geoWithLabel.lon } : null;
    onSubmit(answers, geo);
  }

  if (fetchError) {
    return (
      <div style={styles.error}>
        Erreur lors du chargement des taxonomies : {fetchError}
      </div>
    );
  }

  if (taxonomies.length === 0) {
    return <div style={styles.loading}>Chargement des taxonomies…</div>;
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h1 style={styles.title}>Quiz Matching Engine — POC</h1>

      {taxonomies.map((taxonomy) => {
        const selectedCount = taxonomy.values.filter((v) => selected.has(v.id)).length;
        const isOrdered = taxonomy.type === "ordered" || taxonomy.type === "gate";
        return (
          <details key={taxonomy.id} style={styles.details} open={false}>
            <summary style={styles.summary}>
              <span style={styles.summaryLabel}>
                {taxonomy.label}
                <span style={styles.typeTag}>{taxonomy.type}</span>
              </span>
              {selectedCount > 0 && (
                <span style={styles.badge}>{selectedCount}</span>
              )}
            </summary>
            <div style={styles.valuesGrid}>
              {taxonomy.values.map((value) => {
                const isChecked = selected.has(value.id);
                return (
                  <label key={value.id} style={{ ...styles.valueLabel, ...(isChecked ? styles.valueLabelChecked : {}) }}>
                    <input
                      type={isOrdered ? "radio" : "checkbox"}
                      name={isOrdered ? `taxonomy-${taxonomy.id}` : undefined}
                      checked={isChecked}
                      onChange={() => selectOnly(value.id, taxonomy.id, taxonomy.type)}
                      style={styles.input}
                    />
                    {value.icon && <span style={styles.icon}>{value.icon}</span>}
                    {value.label}
                  </label>
                );
              })}
            </div>
          </details>
        );
      })}

      <fieldset style={styles.fieldset}>
        <legend style={styles.legend}>Géolocalisation (optionnel)</legend>
        <CityAutocomplete value={geoWithLabel} onChange={setGeoWithLabel} />
      </fieldset>

      <div style={styles.footer}>
        <span style={styles.selectionCount}>
          {selected.size} valeur{selected.size !== 1 ? "s" : ""} sélectionnée{selected.size !== 1 ? "s" : ""}
        </span>
        <button
          type="submit"
          disabled={selected.size === 0 || loading}
          style={{ ...styles.submitBtn, ...(selected.size === 0 || loading ? styles.submitBtnDisabled : {}) }}
        >
          {loading ? "Calcul en cours…" : "Voir les missions"}
        </button>
      </div>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    maxWidth: 780,
    margin: "0 auto",
    padding: "24px 16px",
    fontFamily: "system-ui, sans-serif",
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 24,
    color: "#111",
  },
  details: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    marginBottom: 8,
    overflow: "hidden",
  },
  summary: {
    padding: "12px 16px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9fafb",
    userSelect: "none",
    listStyle: "none",
  },
  summaryLabel: {
    fontWeight: 600,
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  typeTag: {
    fontSize: 11,
    color: "#6b7280",
    background: "#e5e7eb",
    borderRadius: 4,
    padding: "1px 6px",
    fontWeight: 400,
  },
  badge: {
    background: "#3b82f6",
    color: "#fff",
    borderRadius: 12,
    padding: "2px 8px",
    fontSize: 12,
    fontWeight: 700,
  },
  valuesGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    padding: 12,
    backgroundColor: "#fff",
  },
  valueLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    color: "#374151",
    background: "#fff",
  },
  valueLabelChecked: {
    background: "#eff6ff",
    borderColor: "#3b82f6",
    color: "#1d4ed8",
  },
  input: {
    accentColor: "#3b82f6",
    cursor: "pointer",
  },
  icon: {
    fontSize: 16,
  },
  fieldset: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "12px 16px",
    marginTop: 16,
  },
  legend: {
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    padding: "0 4px",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    paddingTop: 16,
    borderTop: "1px solid #e5e7eb",
  },
  selectionCount: {
    fontSize: 13,
    color: "#6b7280",
  },
  submitBtn: {
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  submitBtnDisabled: {
    background: "#9ca3af",
    cursor: "not-allowed",
  },
  error: {
    color: "#dc2626",
    padding: 16,
    fontFamily: "system-ui, sans-serif",
  },
  loading: {
    padding: 16,
    color: "#6b7280",
    fontFamily: "system-ui, sans-serif",
  },
};
