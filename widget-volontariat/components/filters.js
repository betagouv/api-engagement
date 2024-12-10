import React, { useState, useEffect, useRef } from "react";
import { DayPicker } from "react-day-picker";
import fr from "date-fns/locale/fr";
import { RiArrowUpSLine, RiArrowDownSLine, RiCheckboxFill, RiCheckboxBlankLine, RiRadioButtonLine, RiCircleLine, RiMapPin2Fill, RiCloseFill } from "react-icons/ri";

import "react-day-picker/dist/style.css";

export const MobileFilters = ({ options, filters, setFilters, showFilters, setShowFilters, disabledLocation = false, carousel }) => {
  if (!Object.keys(options).length) return null;

  const handleReset = () => {
    setFilters({
      start: null,
      duration: null,
      schedule: [],
      minor: [],
      accessibility: [],
      domain: [],
      action: [],
      beneficiary: [],
      country: [],
      location: null,
      page: 1,
    });
  };

  return (
    <>
      <div className="w-full">
        <LocationFilter selected={filters.location} onChange={(l) => setFilters({ ...filters, location: l })} disabled={disabledLocation} />
      </div>
      <div className="w-full border-y border-[#DDD]">
        <button
          className="flex h-[40px] items-center justify-between w-full bg-white font-semibold focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
          onClick={() => setShowFilters(!showFilters)}
        >
          Filtrer les missions
          {showFilters ? <RiArrowUpSLine className="font-semibold" /> : <RiArrowDownSLine className="font-semibold" />}
        </button>

        {showFilters && (
          <div className="w-full flex flex-col mt-4 gap-4">
            <div className="w-full">
              <DateFilter selected={filters.start} onChange={(f) => setFilters({ ...filters, start: f })} width="w-full" />
            </div>
            <div className="w-full">
              <DurationFilter selected={filters.duration} onChange={(v) => setFilters({ ...filters, duration: v })} width="w-full" />
            </div>
            <div className="w-full">
              <SelectFilter
                options={options.domain}
                selectedOptions={filters.domain}
                onChange={(v) => setFilters({ ...filters, domain: v })}
                placeholder="Domaines"
                width="w-full"
              />
            </div>
            <div className="w-full ">
              <SelectFilter
                options={options.schedule}
                selectedOptions={filters.schedule}
                onChange={(v) => setFilters({ ...filters, schedule: v })}
                placeholder="Horaires"
                width="w-full"
              />
            </div>
            <div className="w-full">
              <SelectFilter
                options={options.accessibility}
                selectedOptions={filters.accessibility}
                onChange={(v) => setFilters({ ...filters, accessibility: v })}
                placeholder="Accessibilité"
                width="w-full"
              />
            </div>
            <div className="w-full">
              <SelectFilter
                options={options.beneficiary}
                selectedOptions={filters.beneficiary}
                onChange={(v) => setFilters({ ...filters, beneficiary: v })}
                placeholder="Public bénéficiaire"
                width="w-full"
              />
            </div>
            <div className="w-full">
              <SelectFilter
                options={options.action}
                selectedOptions={filters.action}
                onChange={(v) => setFilters({ ...filters, action: v })}
                placeholder="Actions clés"
                width="w-full"
              />
            </div>
            <div className="w-full">
              <SelectFilter
                options={options.country}
                selectedOptions={filters.country}
                onChange={(v) => setFilters({ ...filters, country: v })}
                placeholder="France / Etranger"
                position="right-0"
              />
            </div>
            <button
              aria-label="Voir les missions"
              className="w-full p-3 text-center border-none bg-black text-white focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
              onClick={() => setShowFilters(false)}
            >
              Voir les missions
            </button>
            <button className="w-full p-3 text-center bg-transparent focus:outline-none focus-visible:ring focus-visible:ring-blue-800" onClick={handleReset}>
              Réinitialiser
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export const Filters = ({ options, filters, setFilters, disabledLocation = false }) => {
  const [moreFilters, setMoreFilters] = useState(false);
  const missionsAbroad = useRef(null);

  useEffect(() => {
    if (missionsAbroad.current === null && Array.isArray(options.country)) {
      missionsAbroad.current = options.country.some((o) => o.value === "NOT_FR" && o.count > 0);
    }
  }, [options.country]);

  if (!Object.keys(options).length) return null;

  return (
    <div className="flex-1">
      <div className="grid grid-cols-5 gap-4 h-10">
        <LocationFilter selected={filters.location} onChange={(l) => setFilters({ ...filters, location: l })} disabled={disabledLocation} />
        <DateFilter selected={filters.start} onChange={(f) => setFilters({ ...filters, start: f })} />
        <DurationFilter selected={filters.duration} onChange={(v) => setFilters({ ...filters, duration: v })} />
        <SelectFilter options={options.domain} selectedOptions={filters.domain} onChange={(v) => setFilters({ ...filters, domain: v })} placeholder="Thèmes" />

        {moreFilters ? (
          <SelectFilter
            options={options.minor}
            selectedOptions={filters.minor}
            onChange={(v) => setFilters({ ...filters, minor: v })}
            placeholder="Accès aux mineurs"
            position="right-0"
          />
        ) : (
          <button
            aria-label="plus de filtres"
            className="border truncate w-full bg-white border-grey-400 py-2 px-4 h-[40px] focus:outline-none focus-visible:ring focus-visible:ring-blue-800 font-medium"
            onClick={() => setMoreFilters(true)}
          >
            Plus de filtres
          </button>
        )}
      </div>

      {moreFilters && (
        <div className={missionsAbroad.current ? "grid grid-cols-6 gap-4 mt-4" : "grid grid-cols-5 gap-4 mt-4"}>
          <SelectFilter
            options={options.schedule}
            selectedOptions={filters.schedule}
            onChange={(v) => setFilters({ ...filters, schedule: v })}
            placeholder="Horaires"
            position="left-0"
          />
          <SelectFilter
            options={options.accessibility}
            selectedOptions={filters.accessibility}
            onChange={(v) => setFilters({ ...filters, accessibility: v })}
            placeholder="Accessibilité"
            position="right-0"
          />
          <SelectFilter
            options={options.beneficiary}
            selectedOptions={filters.beneficiary}
            onChange={(v) => setFilters({ ...filters, beneficiary: v })}
            placeholder="Public bénéficiaire"
            position="right-0"
          />
          <SelectFilter
            options={options.action}
            selectedOptions={filters.action}
            onChange={(v) => setFilters({ ...filters, action: v })}
            placeholder="Actions clés"
            position="right-0"
          />
          {missionsAbroad.current && (
            <SelectFilter
              options={options.country}
              selectedOptions={filters.country}
              onChange={(v) => setFilters({ ...filters, country: v })}
              placeholder="France / Etranger"
              position="right-0"
            />
          )}

          <button
            aria-label="moins de filtres"
            className="border truncate w-full bg-white border-grey-400 py-2 px-4 h-[40px] focus:outline-none focus-visible:ring focus-visible:ring-blue-800 font-medium"
            onClick={() => setMoreFilters(false)}
          >
            Moins de filtres
          </button>
        </div>
      )}
    </div>
  );
};

const DateFilter = ({ selected, onChange, position = "left-0", width = "w-80" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full min-w-[6rem]" ref={ref}>
      <label htmlFor="date" className="sr-only">
        Date
      </label>
      <button
        id="date"
        aria-label="date"
        className={`w-full rounded-t-md bg-[#EEE] h-[40px] border-b-2 border-[#3A3A3A] p-3 focus:outline-none focus-visible:ring focus-visible:ring-blue-800 flex items-center justify-between ${
          !selected ? "text-[#666666]" : "text-[#161616]"
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="pr-3 truncate max-w-60">{selected ? selected.label : "Date"}</span>
        {isOpen ? <RiArrowDownSLine className="text-xl transform rotate-180" /> : <RiArrowDownSLine className="text-xl" />}
      </button>

      {isOpen && (
        <div className={`absolute ${position} mt-1 z-50 ${width} flex flex-col items-center border border-neutral-grey-950 bg-white py-1 shadow-[0_0_12px_rgba(0,0,0,0.15)]`}>
          <div className="flex items-center justify-between px-6 py-2">
            <p>Je suis disponible à partir du</p>
          </div>
          <DayPicker
            mode="single"
            locale={fr}
            selected={selected}
            onDayClick={(date) => {
              onChange({ label: date.toLocaleDateString("fr"), value: date });
              setIsOpen(false);
            }}
            className="w-full flex justify-center border-none"
            modifiers={{
              selected: (date) => selected && date.toLocaleDateString("fr") === selected.value.toLocaleDateString("fr"),
            }}
            modifiersStyles={{
              selected: {
                backgroundColor: "black",
              },
            }}
          />
          <div className="pt-2 pb-1 px-6 w-full flex justify-end border-t border-neutral-grey-950">
            <button
              className="text-sm"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
            >
              Effacer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const DURATION_OPTIONS = [
  { label: "6 mois", value: 6 },
  { label: "7 mois", value: 7 },
  { label: "8 mois", value: 8 },
  { label: "9 mois", value: 9 },
  { label: "10 mois", value: 10 },
  { label: "11 mois", value: 11 },
  { label: "12 mois", value: 12 },
];

const DurationFilter = ({ selected, onChange, position = "left-0", width = "w-80" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [keyboardNav, setKeyboardNav] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = () => {
    setKeyboardNav(true);
  };

  const handleMouseOver = () => {
    setKeyboardNav(false);
  };

  return (
    <div className="relative w-full min-w-[6rem]" ref={ref}>
      <label htmlFor="duration" className="sr-only">
        Durée
      </label>
      <button
        id="duration"
        aria-label="durée"
        onKeyDown={handleKeyDown}
        className={`w-full rounded-t-md h-[40px] bg-[#EEE] border-b-2 border-[#3A3A3A] p-3 focus:outline-none focus-visible:ring focus-visible:ring-blue-800 flex items-center justify-between ${
          !selected ? "text-[#666666]" : "text-[#161616]"
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="pr-3 truncate max-w-60">{selected ? selected.label : "Durée"}</span>
        {isOpen ? <RiArrowDownSLine className="text-xl transform rotate-180" /> : <RiArrowDownSLine className="text-xl" />}
      </button>

      {isOpen && (
        <div className={`absolute ${position} mt-1 z-50 ${width} border border-neutral-grey-950  bg-white py-1 shadow-[0_0_12px_rgba(0,0,0,0.15)]`}>
          <div className="p-3 w-full overflow-auto max-h-60">
            <div className="flex items-center justify-between p-2">
              <p>Durée maximale de la mission</p>
            </div>
            {DURATION_OPTIONS.map((o) => {
              return (
                <div
                  key={o.value}
                  className="cursor-pointer w-full flex items-center justify-between text-sm py-2 pl-3 pr-4"
                  onClick={() => {
                    onChange(o);
                    setIsOpen(false);
                    setKeyboardNav(false);
                  }}
                >
                  <div className="flex items-center w-[90%]">
                    <div className={`text-sm ${keyboardNav ? "border-2 border-blue-800 rounded" : ""}`} onMouseOver={handleMouseOver}>
                      {selected?.value === o.value ? <RiRadioButtonLine /> : <RiCircleLine />}
                    </div>
                    <span className="block text-sm mx-2 truncate font-normal">{o.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pt-2 pb-1 px-6 w-full flex justify-end border-t border-neutral-grey-950">
            <button
              className={`text-sm ${keyboardNav ? "border-2 border-blue-800 rounded" : ""}`}
              onClick={() => {
                onChange(null);
                setIsOpen(false);
                setKeyboardNav(false);
              }}
              onMouseOver={handleMouseOver}
            >
              Effacer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const SelectFilter = ({ options, selectedOptions, onChange, placeholder = "Choissiez une option", position = "left-0", width = "w-80" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option) => {
    if (!selectedOptions) return onChange([option]);
    if (selectedOptions.some((o) => o.value === option.value)) {
      onChange(selectedOptions.filter((o) => o.value !== option.value));
    } else {
      onChange([...selectedOptions, option]);
    }
  };

  return (
    <div className="relative w-full min-w-[6rem]" ref={ref}>
      <label htmlFor={placeholder} className="sr-only">
        {placeholder}
      </label>
      <button
        id={placeholder}
        aria-label={placeholder}
        className={`w-full rounded-t-md bg-[#EEE] h-[40px] border-b-2 border-[#3A3A3A] p-3 focus:outline-none focus-visible:ring focus-visible:ring-blue-800 flex items-center justify-between ${
          !selectedOptions || selectedOptions.length === 0 ? "text-[#666666]" : "text-[#161616]"
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="pr-3 truncate max-w-60">
          {!selectedOptions || selectedOptions.some((o) => o === undefined)
            ? placeholder
            : selectedOptions.length > 0
            ? `${selectedOptions[0].label}${selectedOptions.length > 1 ? ` +${selectedOptions.length - 1}` : ""}`
            : placeholder}
        </span>
        {isOpen ? <RiArrowDownSLine className="text-xl transform rotate-180" /> : <RiArrowDownSLine className="text-xl" />}
      </button>

      {isOpen && (
        <div className={`absolute ${position} mt-1 z-50 ${width} border border-neutral-grey-950 bg-white py-1 shadow-[0_0_12px_rgba(0,0,0,0.15)]`}>
          <div className="py-3 w-full overflow-auto max-h-60">
            {options?.length === 0 ? (
              <div className="text-sm text-center">Aucune option disponible</div>
            ) : (
              options.map((o) => {
                const isSelected = selectedOptions?.some((so) => so.value === o.value);
                return (
                  <div key={o.value} className="cursor-pointer w-full flex items-center justify-between text-sm py-2 pl-3 pr-4" onClick={() => toggleOption(o)}>
                    <div className="flex items-center w-[90%]">
                      <div className="text-sm">{isSelected ? <RiCheckboxFill /> : <RiCheckboxBlankLine />}</div>
                      <span className="block text-sm mx-2 truncate font-normal">{o.label}</span>
                    </div>
                    {o.count && <span className="text-sm text-neutral-grey-500">{o.count}</span>}
                  </div>
                );
              })
            )}
          </div>
          <div className="pt-2 pb-1 px-6 w-full flex justify-end border-t border-neutral-grey-950">
            <button
              className="text-sm"
              onClick={() => {
                onChange([]);
                setIsOpen(false);
              }}
            >
              Effacer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const LocationFilter = ({ selected, onChange, disabled = false, width = "w-80" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState(selected?.label || "");
  const ref = useRef(null);

  useEffect(() => {
    setInputValue(selected?.label || "");
  }, [selected]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
        setOptions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = async (e) => {
    const search = e.target.value;
    setInputValue(search);

    if (search?.length > 3) {
      const res = await fetch(`https://api-adresse.data.gouv.fr/search?q=${search}&type=municipality&autocomplete=1&limit=6`).then((r) => r.json());
      if (!res.features) return;
      setOptions(
        res.features.map((f) => ({
          label: `${f.properties.name} (${f.properties.postcode})`,
          value: f.properties.id,
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
          city: f.properties.city,
          postcode: f.properties.postcode,
          name: f.properties.name,
        }))
      );
      setIsOpen(true);
    } else {
      setOptions([]);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={ref}>
      <label htmlFor="location" className="sr-only">
        Localisation
      </label>
      <div className="bg-[#EEE] rounded-t-md border-b-2 border-[#3A3A3A] p-3 focus:outline-none focus-visible:ring focus-visible:ring-blue-800 flex items-center justify-between h-[40px]">
        <RiMapPin2Fill className="text-disabled-grey-700" />
        {disabled ? (
          <input className="pl-3 w-full text-sm ring-0 focus:ring-0 focus:outline-none min-w-[6rem] opacity-75" defaultValue={selected?.label} disabled />
        ) : (
          <>
            <input
              id="location"
              aria-label="localisation"
              className={`pl-3 w-full ring-0 focus:ring-0 bg-[#EEE] focus:outline-none min-w-[6rem] ${!selected ? "text-[#666666]" : "text-[#161616]"}`}
              value={inputValue}
              placeholder="Localisation"
              onChange={handleInputChange}
            />
            {selected && (
              <button
                className="text-sm text-neutral-grey-700"
                onClick={() => {
                  onChange(null);
                  setInputValue("");
                }}
              >
                <RiCloseFill />
              </button>
            )}
          </>
        )}
      </div>

      {options.length > 0 && isOpen && (
        <div className={`absolute z-50 mt-1 max-h-60 ${width} overflow-auto border border-neutral-grey-950 bg-white py-1 shadow-[0_0_12px_rgba(0,0,0,0.15)]`}>
          {options.map((option) => (
            <div
              key={option.value}
              className="cursor-pointer flex items-center justify-between py-2 px-3"
              onClick={() => {
                onChange(option);
                setInputValue(option.label);
                setIsOpen(false);
              }}
            >
              <span className="block text-sm truncate font-normal">{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
