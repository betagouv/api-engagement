import { useEffect, useRef, useState, type KeyboardEvent, type SubmitEvent } from "react";
import { useOutletContext } from "react-router";
import Label from "~/components/quiz/label";
import NextButton from "~/components/quiz/next-button";
import { getStepDef } from "~/config/quiz-flow";
import { reverseGeocode, searchAddress, type GeoSuggestion } from "~/services/geolocation";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

const LISTBOX_ID = "localisation-listbox";

const STEP = getStepDef("localisation");

export default function LocalisationStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext, saveScoring } = useOutletContext<QuizOutletContext>();

  const locAnswer = answers["localisation"];
  // `label` est persisté avec les coordonnées pour ré-afficher la saisie au retour sur l'écran
  // (ignoré côté API : le transformer `location` ne lit que lat/lon/country_code).
  const savedLocation = locAnswer?.type === "params" ? (locAnswer.params as { lat: number; lon: number; country_code?: string; label?: string; postcode?: string }) : null;

  const [value, setValue] = useState(savedLocation?.label ?? "");
  const [options, setOptions] = useState<GeoSuggestion[]>([]);
  const [selected, setSelected] = useState<GeoSuggestion | null>(
    savedLocation
      ? { label: savedLocation.label ?? "", lat: savedLocation.lat, lon: savedLocation.lon, country_code: savedLocation.country_code, postcode: savedLocation.postcode }
      : null,
  );
  const [showOptions, setShowOptions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (value.length < 3 || selected?.label === value) {
      setOptions([]);
      setShowOptions(false);
      setActiveIndex(-1);
      return;
    }

    let cancelled = false;
    searchAddress(value)
      .then((results) => {
        if (cancelled) return;
        setOptions(results);
        setShowOptions(results.length > 0);
        setActiveIndex(-1);
      })
      .catch(() => {
        if (cancelled) return;
        setOptions([]);
        setShowOptions(false);
        setActiveIndex(-1);
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  const handleSelect = (option: GeoSuggestion) => {
    setSelected(option);
    setValue(option.label);
    setShowOptions(false);
    setActiveIndex(-1);
    setError(undefined);
  };

  const handleChange = (nextValue: string) => {
    setValue(nextValue);
    setError(undefined);
    if (selected && nextValue !== selected.label) {
      setSelected(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      if (options.length === 0) return;
      e.preventDefault();
      if (!showOptions) {
        setShowOptions(true);
        setActiveIndex(0);
        return;
      }
      setActiveIndex((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      if (options.length === 0) return;
      e.preventDefault();
      if (!showOptions) {
        setShowOptions(true);
        setActiveIndex(options.length - 1);
        return;
      }
      setActiveIndex((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (showOptions && activeIndex >= 0 && activeIndex < options.length) {
        e.preventDefault();
        handleSelect(options[activeIndex]);
      }
    } else if (e.key === "Escape") {
      if (showOptions) {
        e.preventDefault();
        setShowOptions(false);
        setActiveIndex(-1);
      }
    } else if (e.key === "Home") {
      if (showOptions) {
        e.preventDefault();
        setActiveIndex(0);
      }
    } else if (e.key === "End") {
      if (showOptions) {
        e.preventDefault();
        setActiveIndex(options.length - 1);
      }
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const result = await reverseGeocode(coords.latitude, coords.longitude);
        if (!result) return setLocating(false);
        handleSelect(result);
        setLocating(false);
      },
      () => setLocating(false),
    );
  };

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!selected) {
      setError(value.trim().length > 0 ? "Sélectionne une adresse dans la liste de suggestions" : "Entre une adresse pour continuer");
      return;
    }
    setAnswer("localisation", {
      type: "params",
      taxonomy: "location",
      params: {
        lat: selected.lat,
        lon: selected.lon,
        ...(selected.postcode ? { postcode: selected.postcode } : {}),
        ...(selected.country_code ? { country_code: selected.country_code } : {}),
        ...(selected.label ? { label: selected.label } : {}),
      },
    });
    setValue(selected.label);
    saveScoring();
    goNext();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div className={`fr-input-group ${error ? "fr-input-group--error" : ""}`}>
        <Label subtitle={STEP.subtitle} htmlFor="localisation-input" error={error} required>
          {STEP.title}
        </Label>
        <div className="relative max-w-sm!" ref={wrapperRef}>
          <input
            id="localisation-input"
            role="combobox"
            aria-expanded={showOptions && options.length > 0}
            aria-controls={LISTBOX_ID}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `${LISTBOX_ID}-option-${activeIndex}` : undefined}
            aria-required="true"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "localisation-input-messages" : undefined}
            className={`fr-input pr-10! mt-0! ${error ? "fr-input--error" : ""}`}
            type="text"
            placeholder="Adresse, ville ou code postal"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="street-address"
          />
          <span className="fr-icon-map-pin-2-line absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          {showOptions && options.length > 0 && (
            <ul
              id={LISTBOX_ID}
              role="listbox"
              className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border-default-grey max-h-60 overflow-auto shadow-md list-none! p-0! m-0!"
            >
              {/* eslint-disable jsx-a11y/click-events-have-key-events -- Le clavier pilote les options depuis la combobox via aria-activedescendant ; les options ne doivent pas devenir des arrêts de tabulation. */}
              {options.map((option, index) => (
                <li
                  key={`${option.lat}-${option.lon}`}
                  id={`${LISTBOX_ID}-option-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  // RGAA 13.11 : preventDefault au mousedown pour garder le focus sur l'input, sélection au click (annulable en éloignant le pointeur).
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`py-2 px-3 cursor-pointer text-sm ${index === activeIndex ? "bg-action-high-blue-france text-inverted-blue-france" : "hover:bg-background-default-grey-hover"}`}
                >
                  {option.label}
                </li>
              ))}
              {/* eslint-enable jsx-a11y/click-events-have-key-events */}
            </ul>
          )}
        </div>

        <button type="button" className="fr-btn fr-btn--secondary justify-center! max-w-sm! w-full! mt-8!" onClick={handleUseMyLocation} disabled={locating}>
          <span aria-hidden="true">📍</span> Utiliser ma position
        </button>
        {error && (
          <div className="fr-messages-group" id="localisation-input-messages" aria-live="polite">
            <p className="fr-message fr-message--error mb-0!">{error}</p>
          </div>
        )}
      </div>

      <NextButton type="submit" />
    </form>
  );
}
