import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { useOutletContext } from "react-router";
import Highlight from "~/components/quiz/highlight";
import Label from "~/components/quiz/label";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

type Suggestion = { label: string; lat: number; lon: number };

type AddressFeature = {
  properties: { name: string; postcode: string; id: string };
  geometry: { coordinates: [number, number] };
};

export default function LocalisationStep() {
  const setAnswer = useQuizStore((s) => s.setAnswer);
  const setGeo = useQuizStore((s) => s.setGeo);
  const { goNext } = useOutletContext<QuizOutletContext>();

  const [value, setValue] = useState("");
  const [options, setOptions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [locating, setLocating] = useState(false);
  const [transitioning, setTransitioning] = useState(true);
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
      if (value.length < 3) {
        setOptions([]);
        setShowOptions(false);
        return;
      }

      try {
        const res = await fetch(`https://data.geopf.fr/geocodage/search?q=${value}&type=municipality&autocomplete=1&limit=6`);
        const data: { features?: AddressFeature[] } = await res.json();
        if (!data.features) return;
        setOptions(
          data.features.map((f) => ({
            label: `${f.properties.name} (${f.properties.postcode})`,
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
          })),
        );
        setShowOptions(true);
      } catch (error) {
        console.error("Error fetching locations:", error);
        setOptions([]);
        setShowOptions(false);
      }
    }
    fetchOptions();
  }, [value]);

  const handleSelect = (option: Suggestion) => {
    setSelected(option);
    setValue(option.label);
    setShowOptions(false);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const here: Suggestion = { label: "Ma position", lat: coords.latitude, lon: coords.longitude };
        setSelected(here);
        setValue(here.label);
        setShowOptions(false);
        setLocating(false);
      },
      () => setLocating(false),
    );
  };

  useEffect(() => {
    if (!transitioning) return;
    const timer = setTimeout(() => goNext(), 2000);
    return () => clearTimeout(timer);
  }, [transitioning, goNext]);

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!selected) return;
    setGeo({ lat: selected.lat, lon: selected.lon });
    setAnswer("localisation", { type: "location", lat: selected.lat, lon: selected.lon });
    setTransitioning(true);
  };

  if (transitioning) {
    return (
      <div className="tw:flex tw:gap-6">
        <Label subtitle="Maintenant, aide-nous à comprendre ce qui te donnerait envie de t'engager.">
          On a trouvé des missions <Highlight>pour toi</Highlight>
        </Label>
        <div className="w-1/2 tw:bg-blue-france-950 tw:h-[400px]" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="tw:flex tw:flex-col tw:gap-10">
      <Label subtitle="Entre ton adresse pour découvrir les missions près de chez toi. Certaines missions peuvent aussi se faire à distance.">
        Où veux-tu chercher des missions ?
      </Label>

      <div className="tw:flex tw:flex-col tw:gap-4 tw:max-w-md!">
        <div className="tw:relative" ref={wrapperRef}>
          <label className="fr-label fr-sr-only" htmlFor="localisation-input">
            Adresse, ville ou code postal
          </label>
          <input
            id="localisation-input"
            className="fr-input tw:pr-10! tw:mt-0!"
            type="text"
            placeholder="Adresse, ville ou code postal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
          />
          <span className="fr-icon-map-pin-2-line tw:absolute tw:right-3 tw:top-1/2 tw:-translate-y-1/2 tw:pointer-events-none" aria-hidden="true" />
          {showOptions && options.length > 0 && (
            <ul className="tw:absolute tw:z-50 tw:top-full tw:left-0 tw:right-0 tw:mt-1 tw:bg-white tw:border tw:border-border-default-grey tw:max-h-60 tw:overflow-auto tw:shadow-md tw:list-none! tw:p-0! tw:m-0!">
              {options.map((option) => (
                <li
                  key={`${option.lat}-${option.lon}`}
                  onClick={() => handleSelect(option)}
                  className="tw:py-2 tw:px-3 tw:cursor-pointer tw:hover:bg-background-default-grey-hover tw:text-sm"
                >
                  {option.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button type="button" className="fr-btn fr-btn--secondary tw:justify-center! tw:w-full!" onClick={handleUseMyLocation} disabled={locating}>
          📍 Utiliser ma position
        </button>
      </div>

      <button type="submit" className="fr-btn fr-btn--lg" disabled={!selected}>
        Continuer
      </button>
    </form>
  );
}
