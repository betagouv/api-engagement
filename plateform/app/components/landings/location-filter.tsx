import { useEffect, useRef, useState, type KeyboardEvent, type SubmitEvent } from "react";
import { useSearchParams } from "react-router";

import { searchAddress, type GeoSuggestion } from "~/services/geolocation";
import { getDepartmentCodeFromPostcode } from "~/utils/landing-missions";

// Libellé de la localisation choisie, gardé dans l'URL pour réafficher le champ (l'API ne reçoit que le département).
export const LOCATION_LABEL_PARAM = "lieu";

// Bloc « Localisation » de la liste de missions d'une landing : adresse ou ville en autocomplétion
// (comme l'étape localisation du quiz), convertie en département à la validation, seul critère
// géographique filtrable par l'API. Un champ vidé puis validé retire la localisation.
// Autonome (lit et écrit l'URL) pour être placé dans la colonne de filtres (desktop) ou dans le hero (mobile) ;
// `id` distingue les deux exemplaires.
export default function LocationFilter({ id, className = "" }: { id: string; className?: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialLabel = searchParams.get(LOCATION_LABEL_PARAM) ?? "";
  const listboxId = `${id}-listbox`;

  const [value, setValue] = useState(initialLabel);
  const [options, setOptions] = useState<GeoSuggestion[]>([]);
  const [selected, setSelected] = useState<GeoSuggestion | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // La localisation change ailleurs (autre exemplaire, réinitialisation des filtres) : le champ suit l'URL.
  useEffect(() => {
    setValue(initialLabel);
    setSelected(null);
    setError(null);
  }, [initialLabel]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setShowOptions(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (value.length < 3 || value === initialLabel || selected?.label === value) {
      setOptions([]);
      setShowOptions(false);
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
    setError(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showOptions || options.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? options.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      handleSelect(options[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setShowOptions(false);
    }
  };

  const applyLocation = (location: { departmentCode: string; label: string } | null) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.delete("page");
        params.delete("departmentCode");
        params.delete(LOCATION_LABEL_PARAM);
        if (location) {
          params.set("departmentCode", location.departmentCode);
          params.set(LOCATION_LABEL_PARAM, location.label);
        }
        return params;
      },
      { preventScrollReset: true },
    );
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!value.trim()) {
      setError(null);
      applyLocation(null);
      return;
    }
    // Localisation déjà appliquée et inchangée : rien à refaire.
    if (value === initialLabel && !selected) return;

    const departmentCode = selected?.postcode ? getDepartmentCodeFromPostcode(selected.postcode) : null;
    if (!selected || !departmentCode) {
      setError("Sélectionnez une adresse ou une ville dans la liste de suggestions.");
      return;
    }
    applyLocation({ departmentCode, label: selected.label });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-background flex flex-col gap-4 p-4 drop-shadow-[0_2px_3px_rgba(0,0,18,0.16)] md:flex-row md:items-start lg:flex-col lg:items-stretch lg:p-6 ${className}`}
    >
      {/* Tablette : champ et bouton sur une ligne ; mobile et colonne desktop : l'un sous l'autre. */}
      <div className={`fr-input-group mb-0! md:flex-1 ${error ? "fr-input-group--error" : ""}`}>
        {/* Libellé masqué visuellement sur mobile, comme dans la maquette (le champ est déjà dans le hero). */}
        <label className="fr-label text-label-grey max-lg:sr-only" htmlFor={id}>
          Localisation
        </label>
        <div className="relative lg:mt-4" ref={wrapperRef}>
          <input
            id={id}
            role="combobox"
            aria-expanded={showOptions && options.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-messages` : undefined}
            className={`fr-input mt-0! pr-10! max-lg:h-12 ${error ? "fr-input--error" : ""}`}
            type="text"
            placeholder="Adresse ou ville"
            autoComplete="address-level2"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setSelected(null);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
          />
          <span className="fr-icon-map-pin-2-line fr-icon--sm pointer-events-none absolute top-1/2 right-4 -translate-y-1/2" aria-hidden="true" />
          {showOptions && options.length > 0 && (
            <ul
              id={listboxId}
              role="listbox"
              aria-label="Suggestions d'adresses"
              className="bg-background border-border-default-grey absolute top-full right-0 left-0 z-50 m-0! mt-1 max-h-60 list-none! overflow-auto border p-0! shadow-md"
            >
              {/* eslint-disable jsx-a11y-x/click-events-have-key-events -- Le clavier pilote les options depuis la combobox via aria-activedescendant ; les options ne doivent pas devenir des arrêts de tabulation. */}
              {options.map((option, index) => (
                <li
                  key={`${option.lat}-${option.lon}`}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  // RGAA 13.11 : preventDefault au mousedown pour garder le focus sur le champ, sélection au clic.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`cursor-pointer px-3 py-2 text-sm ${index === activeIndex ? "bg-action-high-blue-france text-inverted-blue-france" : "hover:bg-background-default-grey-hover"}`}
                >
                  {option.label}
                </li>
              ))}
              {/* eslint-enable jsx-a11y-x/click-events-have-key-events */}
            </ul>
          )}
        </div>
        {error && (
          <div className="fr-messages-group" id={`${id}-messages`} role="alert">
            <p className="fr-message fr-message--error">{error}</p>
          </div>
        )}
      </div>
      <button type="submit" className="fr-btn fr-btn--lg w-full! shrink-0 justify-center! md:w-auto! lg:w-full!">
        Trouver ma mission
      </button>
    </form>
  );
}
