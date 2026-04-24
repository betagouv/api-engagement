import { useEffect, useRef, useState } from "react";

type CitySuggestion = {
  label: string;
  city: string;
  postcode: string;
  context: string;
  lat: number;
  lon: number;
};

type Props = {
  value: { lat: number; lon: number; label: string } | null;
  onChange: (geo: { lat: number; lon: number; label: string } | null) => void;
};

export function CityAutocomplete({ value, onChange }: Props) {
  const [query, setQuery] = useState(value?.label ?? "");
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    onChange(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&type=municipality&limit=6&autocomplete=1`;
        const res = await fetch(url);
        const json = await res.json();
        const results: CitySuggestion[] = (json.features ?? []).map((f: any) => ({
          label: f.properties.label,
          city: f.properties.city ?? f.properties.name,
          postcode: f.properties.postcode,
          context: f.properties.context,
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
        }));
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }

  function handleSelect(suggestion: CitySuggestion) {
    setQuery(suggestion.label);
    setSuggestions([]);
    setOpen(false);
    onChange({ lat: suggestion.lat, lon: suggestion.lon, label: suggestion.label });
  }

  function handleClear() {
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    onChange(null);
  }

  return (
    <div ref={containerRef} style={styles.container}>
      <div style={styles.inputWrapper}>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Rechercher une ville…"
          style={styles.input}
          autoComplete="off"
        />
        {loading && <span style={styles.spinner} />}
        {value && !loading && (
          <button type="button" onClick={handleClear} style={styles.clearBtn} title="Effacer">
            ×
          </button>
        )}
      </div>

      {value && (
        <div style={styles.selectedInfo}>
          {value.lat.toFixed(4)}, {value.lon.toFixed(4)}
        </div>
      )}

      {open && (
        <ul style={styles.dropdown}>
          {suggestions.map((s, i) => (
            <li
              key={i}
              onMouseDown={() => handleSelect(s)}
              style={styles.option}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            >
              <span style={styles.optionCity}>{s.city}</span>
              <span style={styles.optionMeta}>{s.postcode} — {s.context.split(",").slice(1).join(",").trim()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "relative",
    width: 320,
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  input: {
    width: "100%",
    padding: "7px 32px 7px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 13,
    outline: "none",
  },
  spinner: {
    position: "absolute",
    right: 10,
    width: 14,
    height: 14,
    border: "2px solid #e5e7eb",
    borderTop: "2px solid #3b82f6",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    flexShrink: 0,
  },
  clearBtn: {
    position: "absolute",
    right: 8,
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 18,
    color: "#9ca3af",
    lineHeight: 1,
    padding: 0,
  },
  selectedInfo: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 3,
    paddingLeft: 2,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    listStyle: "none",
    margin: "4px 0 0",
    padding: 0,
    zIndex: 100,
    overflow: "hidden",
  },
  option: {
    padding: "8px 12px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    background: "#fff",
  },
  optionCity: {
    fontSize: 13,
    fontWeight: 600,
    color: "#111827",
  },
  optionMeta: {
    fontSize: 11,
    color: "#6b7280",
  },
};
