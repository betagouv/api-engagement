import { getTaxonomyList, type TaxonomyListItem } from "@engagement/taxonomy";
import { useState } from "react";
import { CityAutocomplete } from "./CityAutocomplete";

type Geo = { lat: number; lon: number } | null;

type Props = {
  onSubmit: (answers: { taxonomy_value_key: string }[], geo: Geo) => void;
  loading: boolean;
};

function computeAgeKeys(age: number | null, hasDisability: boolean): string[] {
  if (age === null) return [];
  if (age < 26) return ["tranche_age.moins_26_ans", "tranche_age.moins_31_ans_handicap"];
  if (age < 31 && hasDisability) return ["tranche_age.moins_31_ans_handicap"];
  return [];
}

const taxonomies = getTaxonomyList();

export function QuizForm({ onSubmit, loading }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [geoWithLabel, setGeoWithLabel] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [age, setAge] = useState<number | "">("");
  const [hasDisability, setHasDisability] = useState(false);

  function toggle(prefixedKey: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(prefixedKey)) next.delete(prefixedKey);
      else next.add(prefixedKey);
      return next;
    });
  }

  function selectOnly(prefixedKey: string, taxonomyKey: string, type: TaxonomyListItem["type"]) {
    if (type === "categorical") {
      setSelected((prev) => {
        const next = new Set(prev);
        const taxonomy = taxonomies.find((t) => t.key === taxonomyKey);
        taxonomy?.values.forEach((v) => next.delete(`${taxonomy.key}.${v.key}`));
        next.add(prefixedKey);
        return next;
      });
    } else {
      toggle(prefixedKey);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const taxonomyAnswers = Array.from(selected).map((key) => ({ taxonomy_value_key: key }));
    const ageAnswers = computeAgeKeys(age !== "" ? age : null, hasDisability).map((key) => ({
      taxonomy_value_key: key,
    }));
    const geo: Geo = geoWithLabel ? { lat: geoWithLabel.lat, lon: geoWithLabel.lon } : null;
    onSubmit([...taxonomyAnswers, ...ageAnswers], geo);
  }

  // Les taxonomies gate (tranche_age) sont gérées via la section âge ci-dessous.
  const scoringTaxonomies = taxonomies.filter((t) => !t.gate);
  const totalSelected = selected.size + computeAgeKeys(age !== "" ? age : null, hasDisability).length;

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h1 style={styles.title}>Quiz Matching Engine — POC</h1>

      {scoringTaxonomies.map((taxonomy) => {
        const selectedCount = taxonomy.values.filter((v) => selected.has(`${taxonomy.key}.${v.key}`)).length;
        const isCategorical = taxonomy.type === "categorical";
        return (
          <details key={taxonomy.key} style={styles.details} open={false}>
            <summary style={styles.summary}>
              <span style={styles.summaryLabel}>
                {taxonomy.label}
                <span style={styles.typeTag}>{taxonomy.type}</span>
              </span>
              {selectedCount > 0 && <span style={styles.badge}>{selectedCount}</span>}
            </summary>
            <div style={styles.valuesGrid}>
              {taxonomy.values.map((value) => {
                const prefixedKey = `${taxonomy.key}.${value.key}`;
                const isChecked = selected.has(prefixedKey);
                return (
                  <label key={value.key} style={{ ...styles.valueLabel, ...(isChecked ? styles.valueLabelChecked : {}) }}>
                    <input
                      type={isCategorical ? "radio" : "checkbox"}
                      name={isCategorical ? `taxonomy-${taxonomy.key}` : undefined}
                      checked={isChecked}
                      onChange={() => selectOnly(prefixedKey, taxonomy.key, taxonomy.type)}
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
        <legend style={styles.legend}>Âge (optionnel)</legend>
        <div style={styles.ageRow}>
          <label style={styles.ageLabel}>
            Votre âge
            <input
              type="number"
              min={15}
              max={99}
              value={age}
              onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="ex. 22"
              style={styles.ageInput}
            />
          </label>
          <label style={styles.disabilityLabel}>
            <input type="checkbox" checked={hasDisability} onChange={(e) => setHasDisability(e.target.checked)} style={styles.input} />
            Situation de handicap
          </label>
        </div>
        {age !== "" && (
          <div style={styles.ageHint}>
            {computeAgeKeys(age, hasDisability).length > 0
              ? `Éligibilité : ${computeAgeKeys(age, hasDisability).join(", ")}`
              : "Aucune tranche d'âge applicable (> 30 ans ou > 30 ans sans handicap)"}
          </div>
        )}
      </fieldset>

      <fieldset style={styles.fieldset}>
        <legend style={styles.legend}>Géolocalisation (optionnel)</legend>
        <CityAutocomplete value={geoWithLabel} onChange={setGeoWithLabel} />
      </fieldset>

      <div style={styles.footer}>
        <span style={styles.selectionCount}>
          {totalSelected} valeur{totalSelected !== 1 ? "s" : ""} sélectionnée{totalSelected !== 1 ? "s" : ""}
        </span>
        <button type="submit" disabled={totalSelected === 0 || loading} style={{ ...styles.submitBtn, ...(totalSelected === 0 || loading ? styles.submitBtnDisabled : {}) }}>
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
  ageRow: {
    display: "flex",
    alignItems: "center",
    gap: 24,
    flexWrap: "wrap",
  },
  ageLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#374151",
  },
  ageInput: {
    width: 72,
    padding: "4px 8px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 13,
    color: "#111",
  },
  disabilityLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#374151",
    cursor: "pointer",
  },
  ageHint: {
    marginTop: 8,
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
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
};
