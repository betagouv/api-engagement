import { usePlausible } from "next-plausible";
import { useEffect, useRef, useState } from "react";
import { RiCloseFill, RiMapPin2Fill } from "react-icons/ri";

import { Location } from "../types";
import useStore from "../utils/store";

interface AddressFeature {
  properties: {
    name: string;
    postcode: string;
    id: string;
    city: string;
  };
  geometry: {
    coordinates: [number, number];
  };
}

interface AddressApiResponse {
  features: AddressFeature[];
}

interface LocationFilterProps {
  selected: Location | null;
  onChange: (location: Location | null) => void;
  width?: string;
  disabled?: boolean;
}

const LocationFilter = ({ selected, onChange, width = "w-80", disabled = false }: LocationFilterProps) => {
  const { url } = useStore();
  const plausible = usePlausible();
  const [show, setShow] = useState(false);
  const [options, setOptions] = useState<Location[]>([]);
  const [inputValue, setInputValue] = useState(selected?.label || "");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(selected?.label || "");
  }, [selected]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setShow(false);
        setOptions([]);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const search = e.target.value;
    setInputValue(search);
    setFocusedIndex(-1);

    if (search?.length > 3) {
      try {
        const res: AddressApiResponse = await fetch(`https://api-adresse.data.gouv.fr/search?q=${search}&type=municipality&autocomplete=1&limit=6`).then((r) => r.json());
        if (!res.features) {
          return;
        }
        setOptions(
          res.features.map((f) => ({
            label: `${f.properties.name} (${f.properties.postcode})`,
            value: f.properties.id,
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            city: f.properties.city,
            postcode: f.properties.postcode,
            name: f.properties.name,
          })),
        );
        setShow(true);
      } catch (error) {
        console.error("Error fetching locations:", error);
        setOptions([]);
        setShow(false);
      }
    } else {
      setOptions([]);
      setShow(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!show || options.length === 0) {
      return;
    }

    switch (e.key) {
      case "Down":
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
        break;
      case "Up":
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && options[focusedIndex]) {
          handleSelect(options[focusedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShow(false);
        setOptions([]);
        setFocusedIndex(-1);
        break;
      case "Tab":
        setShow(false);
        setOptions([]);
        setFocusedIndex(-1);
        break;
    }
  };

  const handleSelect = (option: Location) => {
    onChange(option);
    setInputValue(option.label);
    setShow(false);
    setFocusedIndex(-1);
    plausible("Location selected", { props: { location: option.label }, u: url || undefined });
  };

  return (
    <div className="relative w-full" ref={ref}>
      <label htmlFor="location" className="sr-only">
        Localisation
      </label>
      <div className="relative w-full h-10">
        <div className="absolute left-2 top-1/2 -translate-y-1/2">
          <RiMapPin2Fill className="text-[#929292]" />
        </div>
        {disabled ? (
          <input
            className="bg-[#EEE] rounded-t-md border-b-2 border-[#3A3A3A] px-6 h-full w-full text-sm ring-0 focus:ring-0 focus:outline-none opacity-75"
            defaultValue={selected?.label}
            disabled
          />
        ) : (
          <>
            <input
              id="location"
              aria-label="Localisation"
              aria-expanded={show}
              aria-controls="location-list"
              role="combobox"
              aria-autocomplete="both"
              aria-activedescendant={focusedIndex >= 0 ? `location-option-${focusedIndex}` : undefined}
              className="bg-[#EEE] rounded-t-md border-b-2 border-[#3A3A3A] px-8 h-full w-full focus:outline-none focus-visible:ring focus-visible:ring-[#000091] placeholder-[#666666]"
              value={inputValue}
              placeholder="Localisation"
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />
            {selected && (
              <button
                className="text-sm text-neutral-grey-700 absolute right-2 top-1/2 -translate-y-1/2"
                aria-label="Effacer la localisation"
                onClick={() => {
                  onChange(null);
                  setInputValue("");
                  plausible("Location erased", { u: url || undefined });
                }}
              >
                <RiCloseFill />
              </button>
            )}
          </>
        )}
      </div>

      <ul
        id="location-list"
        aria-label="Liste des villes"
        role="listbox"
        className={`absolute z-50 mt-1 max-h-60 ${width} overflow-auto border border-gray-900 bg-white p-[1px] shadow-md ${show ? "block" : "hidden"}`}
      >
        {options.length === 0 && show && (
          <li className="cursor-pointer flex items-center justify-between py-2 px-3">
            <span className="block text-sm truncate font-normal">Aucune ville trouvée</span>
          </li>
        )}
        {options.length > 0 &&
          show &&
          options.map((option, index) => (
            <li
              key={index}
              id={`location-option-${index}`}
              className={`cursor-pointer flex items-center justify-between py-2 px-3 ${index === focusedIndex ? "bg-[#0000000A] ring ring-[#000091]" : "hover:bg-[#0000000A]"}`}
              role="option"
              aria-selected={focusedIndex === index}
              aria-label={option.label}
              onClick={() => handleSelect(option)}
            >
              <span className="block text-sm truncate font-normal">{option.label}</span>
              {selected?.value === option.value && (
                <span className="ml-2 text-blue-600" aria-hidden="true">
                  ✓
                </span>
              )}
            </li>
          ))}
      </ul>
    </div>
  );
};

export default LocationFilter;
