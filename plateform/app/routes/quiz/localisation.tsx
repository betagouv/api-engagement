import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { useOutletContext } from "react-router";
import Highlight from "~/components/quiz/highlight";
import Label from "~/components/quiz/label";
import MissionCard from "~/components/quiz/mission-card";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

import Photo1 from "~/assets/images/humanitaire-02.jpeg";

type Suggestion = { label: string; lat: number; lon: number };

type AddressFeature = {
  properties: { name: string; postcode: string; id: string };
  geometry: { coordinates: [number, number] };
};

export default function LocalisationStep() {
  const geo = useQuizStore((s) => s.geo);
  const setGeo = useQuizStore((s) => s.setGeo);
  const { goNext, transitioning, setTransitioning } = useOutletContext<QuizOutletContext>();

  const [value, setValue] = useState("");
  const [options, setOptions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [locating, setLocating] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (geo) {
      setSelected({ label: geo.label, lat: geo.lat, lon: geo.lon });
      setValue(geo.label || "");
      setShowOptions(false);
      return;
    }

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
      async (res) => {
        const feature = await fetch(`https://data.geopf.fr/geocodage/reverse?lon=${res.coords.longitude}&lat=${res.coords.latitude}&limit=1`);
        const data: { features?: AddressFeature[] } = await feature.json();

        if (!data.features) return;
        const here: Suggestion = { label: data.features[0].properties.name, lat: data.features[0].geometry.coordinates[1], lon: data.features[0].geometry.coordinates[0] };
        setSelected(here);
        setShowOptions(false);
        setValue(here.label);
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
    setGeo(selected);
    setValue(selected.label);
    setTransitioning(true);
  };

  if (transitioning) {
    return (
      <div className="flex gap-6 pt-20">
        <div className="flex-1 flex flex-col gap-6 flex-1 pt-16">
          <h1 className="fr-h1 mb-0!">
            On a trouvé des missions <Highlight>pour toi</Highlight>
          </h1>
          <p className="fr-text--lead">Maintenant, aide-nous à comprendre ce qui te donnerait envie de t'engager.</p>
        </div>
        <div className="flex-1 relative gap-4">
          <MissionCard
            imageSrc={Photo1}
            title="Participer à l'information du public concernant l'accès aux droits…"
            className="absolute -top-12 left-1/2 -translate-x-[40%] rotate-[8deg]"
          />
          <MissionCard
            imageSrc={Photo1}
            title="Améliorer la qualité de vie des personnes en situation de handicap"
            className="absolute top-0 left-1/2 -translate-x-[80%] rotate-[-4deg]"
          />
          <MissionCard imageSrc={Photo1} title="Je deviens infirmier pompier volontaire 🚒" className="absolute top-16 left-1/2 -translate-x-1/2 rotate-[3deg]" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
      <Label subtitle="Entre ton adresse pour découvrir les missions près de chez toi. Certaines missions peuvent aussi se faire à distance.">
        Où veux-tu chercher des missions ?
      </Label>

      <div className="flex flex-col gap-4 max-w-md!">
        <div className="relative" ref={wrapperRef}>
          <label className="fr-label fr-sr-only" htmlFor="localisation-input">
            Adresse, ville ou code postal
          </label>
          <input
            id="localisation-input"
            className="fr-input pr-10! mt-0!"
            type="text"
            placeholder="Adresse, ville ou code postal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
          />
          <span className="fr-icon-map-pin-2-line absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          {showOptions && options.length > 0 && (
            <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-border-default-grey max-h-60 overflow-auto shadow-md list-none! p-0! m-0!">
              {options.map((option) => (
                <li key={`${option.lat}-${option.lon}`} onClick={() => handleSelect(option)} className="py-2 px-3 cursor-pointer hover:bg-background-default-grey-hover text-sm">
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

      <div className="fixed inset-x-0 bottom-0 z-10 bg-white p-4 md:static md:bg-transparent md:p-0">
        <button type="submit" className="fr-btn fr-btn--lg w-full! justify-center! md:w-auto" disabled={!selected}>
          Continuer
        </button>
      </div>
    </form>
  );
}
