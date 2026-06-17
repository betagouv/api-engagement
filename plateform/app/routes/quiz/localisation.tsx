import { useEffect, useRef, useState, type KeyboardEvent, type SubmitEvent } from "react";
import { useOutletContext } from "react-router";
import QuizTransition from "~/components/quiz/quiz-transition";
import Label from "~/components/quiz/label";
import MissionCard from "~/components/quiz/mission-card";
import NextButton from "~/components/quiz/next-button";
import Highlight from "~/components/ui/highlight";
import { searchAddress, reverseGeocode, type GeoSuggestion } from "~/services/geolocation";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

import Photo1 from "~/assets/images/humanitaire-02.jpeg";

const LISTBOX_ID = "localisation-listbox";

export default function LocalisationStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext, saveScoring, transitioning, setTransitioning } = useOutletContext<QuizOutletContext>();

  const locAnswer = answers["localisation"];
  // `label` est persisté avec les coordonnées pour ré-afficher la saisie au retour sur l'écran
  // (ignoré côté API : le transformer `location` ne lit que lat/lon/country_code).
  const savedLocation = locAnswer?.type === "params" ? (locAnswer.params as { lat: number; lon: number; country_code?: string; label?: string }) : null;

  const [value, setValue] = useState(savedLocation?.label ?? "");
  const [options, setOptions] = useState<GeoSuggestion[]>([]);
  const [selected, setSelected] = useState<GeoSuggestion | null>(
    savedLocation ? { label: savedLocation.label ?? "", lat: savedLocation.lat, lon: savedLocation.lon, country_code: savedLocation.country_code } : null,
  );
  const [showOptions, setShowOptions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [locating, setLocating] = useState(false);
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
  };

  const handleChange = (nextValue: string) => {
    setValue(nextValue);
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
        setSelected(result);
        setShowOptions(false);
        setValue(result.label);
        setLocating(false);
      },
      () => setLocating(false),
    );
  };

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!selected) return;
    setAnswer("localisation", {
      type: "params",
      taxonomy: "location",
      params: {
        lat: selected.lat,
        lon: selected.lon,
        ...(selected.country_code ? { country_code: selected.country_code } : {}),
        ...(selected.label ? { label: selected.label } : {}),
      },
    });
    setValue(selected.label);
    saveScoring();
    setTransitioning(true);
  };

  if (transitioning) {
    return (
      <QuizTransition onComplete={goNext}>
        <div className="flex flex-col-reverse md:flex-row gap-6 pt-0 md:pt-20">
          <div className="w-full md:flex-1 flex flex-col gap-6">
            <h1 className="fr-h1 mb-0! text-center md:text-left">
              On a trouvé des missions <Highlight>pour toi</Highlight>
            </h1>
            <p className="fr-text--lead text-center md:text-left">Maintenant, aide-nous à comprendre ce qui te donnerait envie de t'engager.</p>
          </div>
          <div className="w-full md:flex-1 relative gap-4 h-[400px] md:h-auto">
            <MissionCard
              imageSrc={Photo1}
              title="Participer à l'information du public concernant l'accès aux droits…"
              className="absolute top-0 left-1/2 -translate-x-[30%] rotate-[8deg]"
            />
            <MissionCard
              imageSrc={Photo1}
              title="Améliorer la qualité de vie des personnes en situation de handicap"
              className="absolute top-12 left-1/2 -translate-x-[70%] rotate-[-4deg]"
            />
            <MissionCard imageSrc={Photo1} title="Je deviens infirmier pompier volontaire 🚒" className="absolute top-24 left-1/2 -translate-x-1/2 rotate-[3deg]" />
          </div>
        </div>
      </QuizTransition>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
      <Label subtitle="Entre ton adresse pour découvrir les missions près de chez toi. Certaines missions peuvent aussi se faire à distance." htmlFor="localisation-input">
        Où veux-tu chercher des missions ?
      </Label>

      <div className="flex flex-col gap-4 max-w-md!">
        <div className="relative" ref={wrapperRef}>
          <input
            id="localisation-input"
            role="combobox"
            aria-expanded={showOptions && options.length > 0}
            aria-controls={LISTBOX_ID}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `${LISTBOX_ID}-option-${activeIndex}` : undefined}
            className="fr-input pr-10! mt-0!"
            type="text"
            placeholder="Adresse, ville ou code postal"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          <span className="fr-icon-map-pin-2-line absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          {showOptions && options.length > 0 && (
            <ul
              id={LISTBOX_ID}
              role="listbox"
              className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-border-default-grey max-h-60 overflow-auto shadow-md list-none! p-0! m-0!"
            >
              {options.map((option, index) => (
                <li
                  key={`${option.lat}-${option.lon}`}
                  id={`${LISTBOX_ID}-option-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(option);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`py-2 px-3 cursor-pointer text-sm ${index === activeIndex ? "bg-background-default-grey-hover" : "hover:bg-background-default-grey-hover"}`}
                >
                  {option.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button type="button" className="fr-btn fr-btn--secondary justify-center! w-full!" onClick={handleUseMyLocation} disabled={locating}>
          📍 Utiliser ma position
        </button>
      </div>

      <NextButton type="submit" disabled={!selected} />
    </form>
  );
}
