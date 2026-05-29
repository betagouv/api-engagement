import { useEffect, useRef, useState, type KeyboardEvent, type SubmitEvent } from "react";
import { useOutletContext } from "react-router";
import Label from "~/components/quiz/label";
import MissionCard from "~/components/quiz/mission-card";
import Highlight from "~/components/ui/highlight";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

import Photo1 from "~/assets/images/humanitaire-02.jpeg";
import NextButton from "~/components/quiz/next-button";
import { QUIZ_TRANSITION_MS } from "~/services/config";

type Suggestion = { label: string; lat: number; lon: number; country_code?: string };

type AddressFeature = {
  // `label` = adresse complète formatée par l'API (ex: "8 Boulevard du Port 80000 Amiens").
  // `type`  = housenumber | street | locality | municipality.
  properties: { label: string; name: string; postcode: string; type: string; id: string };
  geometry: { coordinates: [number, number] };
};

const LISTBOX_ID = "localisation-listbox";

export default function LocalisationStep() {
  const { answers, setAnswer } = useQuizStore();
  const { goNext, transitioning, setTransitioning } = useOutletContext<QuizOutletContext>();

  const locAnswer = answers["localisation"];
  const savedLocation = locAnswer?.type === "params" ? (locAnswer.params as { lat: number; lon: number; country_code?: string }) : null;

  const [value, setValue] = useState("");
  const [options, setOptions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Suggestion | null>(savedLocation ? { label: "", ...savedLocation } : null);
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
    async function fetchOptions() {
      if (value.length < 3 || selected?.label === value) {
        setOptions([]);
        setShowOptions(false);
        setActiveIndex(-1);
        return;
      }

      try {
        // Pas de filtre `type` → l'API renvoie aussi les adresses précises (numéro + rue), pas seulement les villes.
        const res = await fetch(`https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(value)}&autocomplete=1&limit=6`);
        const data: { features?: AddressFeature[] } = await res.json();
        if (!data.features) return;
        setOptions(
          data.features.map((f) => ({
            // Villes : on garde "Nom (code postal)" pour lever l'ambiguïté entre homonymes.
            // Adresses/rues : on utilise le `label` complet fourni par l'API.
            label: f.properties.type === "municipality" ? `${f.properties.name} (${f.properties.postcode})` : f.properties.label,
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            country_code: "fr",
          })),
        );
        setShowOptions(true);
        setActiveIndex(-1);
      } catch (error) {
        console.error("Error fetching locations:", error);
        setOptions([]);
        setShowOptions(false);
        setActiveIndex(-1);
      }
    }
    fetchOptions();
  }, [value]);

  const handleSelect = (option: Suggestion) => {
    setSelected(option);
    setValue(option.label);
    setShowOptions(false);
    setActiveIndex(-1);
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
      async (res) => {
        const feature = await fetch(`https://data.geopf.fr/geocodage/reverse?lon=${res.coords.longitude}&lat=${res.coords.latitude}&limit=1`);
        const data: { features?: AddressFeature[] } = await feature.json();

        if (!data.features) return;
        const here: Suggestion = {
          label: data.features[0].properties.label ?? data.features[0].properties.name,
          lat: data.features[0].geometry.coordinates[1],
          lon: data.features[0].geometry.coordinates[0],
          country_code: "fr",
        };
        setSelected(here);
        setShowOptions(false);
        setValue(here.label);
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
      params: { lat: selected.lat, lon: selected.lon, ...(selected.country_code ? { country_code: selected.country_code } : {}) },
    });
    setValue(selected.label);
    setTransitioning(true);
  };

  if (transitioning) {
    return <LocationTransition onComplete={goNext} />;
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
            onChange={(e) => setValue(e.target.value)}
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

function LocationTransition({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const enterFrame = requestAnimationFrame(() => setVisible(true));
    const exitTimer = setTimeout(() => setVisible(false), QUIZ_TRANSITION_MS - 700);
    const completeTimer = setTimeout(onComplete, QUIZ_TRANSITION_MS);
    return () => {
      cancelAnimationFrame(enterFrame);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`flex flex-col-reverse md:flex-row gap-6 pt-0 md:pt-20 transition-all duration-700 ease-in ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
    >
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
  );
}
