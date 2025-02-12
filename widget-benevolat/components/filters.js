import { usePlausible } from "next-plausible";
import React, { useState, useRef, useEffect } from "react";
import { RiSearchLine, RiArrowUpSLine, RiArrowDownSLine, RiCheckboxFill, RiCheckboxBlankLine, RiMapPin2Fill, RiCloseFill } from "react-icons/ri";

export const MobileFilters = ({ options, filters, setFilters, color, showFilters, setShowFilters, disabledLocation = false, carousel }) => {
  const plausible = usePlausible();
  if (!Object.keys(options).length) return null;

  const handleReset = () => {
    setFilters({
      domain: [],
      organization: [],
      department: [],
      remote: [],
      location: null,
      size: carousel ? 40 : 6,
      page: 1,
    });
  };

  return (
    <>
      <div className="w-full">
        <LocationFilter selected={filters.location} onChange={(l) => setFilters({ ...filters, location: l })} disabled={disabledLocation} color={color} width="w-full" />
      </div>
      <button
        className="flex h-[40px] border-y items-center justify-between w-full px-4 py-2 focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
        onClick={() => {
          setShowFilters(!showFilters);
          plausible("Filters opened");
        }}
        style={{ color: color }}
      >
        Filtrer les missions
        {showFilters ? <RiArrowUpSLine className="font-semibold" style={{ color: color }} /> : <RiArrowDownSLine className="font-semibold" style={{ color: color }} />}
      </button>

      {showFilters && (
        <div className="w-full mt-2">
          <div className="w-full mb-4">
            <RemoteFilter
              id="remote"
              options={options.remote}
              selectedOptions={filters.remote}
              onChange={(f) => setFilters({ ...filters, remote: f })}
              placeholder="Présentiel / Distance"
              width="w-full"
              color={color}
            />
          </div>
          <div className="w-full mb-4">
            <SelectFilter
              id="domain"
              options={options.domains}
              selectedOptions={filters.domain}
              onChange={(v) => setFilters({ ...filters, domain: v })}
              placeholder="Domaines"
              width="w-full"
              color={color}
            />
          </div>
          <div className="w-full mb-4">
            <SelectFilter
              id="department"
              options={options.departments}
              selectedOptions={filters.department}
              onChange={(v) => setFilters({ ...filters, department: v })}
              placeholder="Départements"
              width="w-full"
              color={color}
            />
          </div>
          <div className="w-full mb-4">
            <SelectFilter
              id="organization"
              options={options.organizations}
              selectedOptions={filters.organization}
              onChange={(v) => setFilters({ ...filters, organization: v })}
              placeholder="Organisations"
              width="w-full"
              color={color}
            />
          </div>
          <div className="w-full flex flex-col gap-2">
            <button
              aria-label="Voir les missions"
              className="w-full p-3 text-center border-none text-white text-sm focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
              onClick={() => {
                setShowFilters(false);
                plausible("Filters closed");
              }}
              style={{ backgroundColor: color }}
            >
              Voir les missions
            </button>
            <button
              aria-label="Réinitialiser les filtres"
              className="w-full p-3 text-center border-none bg-transparent text-sm focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
              style={{ color }}
              onClick={() => {
                handleReset();
                plausible("Filters reset");
              }}
            >
              Réinitialiser les filtres
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const Filters = ({ options, filters, setFilters, color, disabledLocation = false }) => {
  if (!Object.keys(options).length) return null;
  return (
    <>
      <div className="w-[20%] pr-2">
        <LocationFilter selected={filters.location} onChange={(l) => setFilters({ ...filters, location: l })} disabled={disabledLocation} color={color} />
      </div>
      <div className="w-[20%] px-2">
        <RemoteFilter
          id="remote"
          options={options.remote}
          selectedOptions={filters.remote}
          onChange={(f) => setFilters({ ...filters, remote: f })}
          placeholder="Présentiel / Distance"
          color={color}
        />
      </div>
      <div className="w-[20%] px-2">
        <SelectFilter
          id="domain"
          options={options.domains}
          selectedOptions={filters.domain}
          onChange={(v) => setFilters({ ...filters, domain: v })}
          placeholder="Domaines"
          color={color}
        />
      </div>
      <div className="w-[20%] px-2">
        <SelectFilter
          id="department"
          options={options.departments}
          selectedOptions={filters.department}
          onChange={(v) => setFilters({ ...filters, department: v })}
          placeholder="Départements"
          color={color}
        />
      </div>
      <div className="w-[20%] pl-2">
        <SelectFilter
          id="organization"
          options={options.organizations}
          selectedOptions={filters.organization}
          onChange={(v) => setFilters({ ...filters, organization: v })}
          placeholder="Organisations"
          position="right-0"
          color={color}
        />
      </div>
    </>
  );
};

const SelectFilter = ({ options, selectedOptions, onChange, color, id, placeholder = "Choissiez une option", position = "left-0", width = "w-80" }) => {
  const plausible = usePlausible();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const searchRef = useRef(null);

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
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <button
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full rounded-t-md h-[40px] bg-[#EEE] border-b-2 border-[#3A3A3A] p-3 focus:outline-none focus-visible:ring focus-visible:ring-blue-800 flex items-center justify-between ${
          !selectedOptions?.length ? "text-[#666666]" : "text-[#161616]"
        }`}
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
        <div className={`absolute ${position} z-50 ${width} bg-white text-base focus:outline-none shadow-[0_0_12px_rgba(0,0,0,0.15)]`}>
          <div className="p-2">
            <div className="border w-full border-gray-300 p-2 focus:outline-none flex items-center justify-between">
              <RiSearchLine className="text-disabled-grey-700" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher"
                className="w-full text-sm rounded-lg pl-3 focus:outline-none"
              />
            </div>
          </div>

          <div className="py-3 w-full overflow-auto max-h-60">
            {!options?.filter((o) => o.label?.toLowerCase().includes(search.toLowerCase()))?.length ? (
              <div className="text-sm text-center">Aucune option disponible</div>
            ) : (
              options
                ?.filter((o) => o.label?.toLowerCase().includes(search.toLowerCase()))
                ?.map((o) => {
                  const isSelected = selectedOptions?.some((so) => so.value === o.value);
                  return (
                    <button
                      key={o.value}
                      onClick={() => {
                        toggleOption(o);
                        plausible(`Filter ${id} selected`, { props: { filter: o.label } });
                      }}
                      className={`cursor-pointer w-full flex items-center justify-between text-sm py-2 pl-3 pr-4 hover:bg-gray-100`}
                    >
                      <div className="flex items-center w-[90%]">
                        <div className="text-sm">{isSelected ? <RiCheckboxFill style={{ height: "16px", width: "16px", color }} /> : <RiCheckboxBlankLine />}</div>
                        <span className="block text-sm mx-2 truncate font-normal text-[#161616]">{o.label}</span>
                      </div>
                      {o.count && <span className="text-sm text-neutral-grey-500">{o.count}</span>}
                    </button>
                  );
                })
            )}
          </div>

          <div className="p-2 w-full flex justify-end border-t border-gray-300">
            <button
              className={`text-[#3633A1] text-sm hover:underline`}
              onClick={() => {
                onChange([]);
                setIsOpen(false);
                plausible(`Filter ${id} erased`);
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
  const plausible = usePlausible();
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
      <div
        className={`bg-[#EEE] h-[40px] rounded-t-md border-b-2 border-[#3A3A3A] p-3 focus:outline-none focus-visible:ring focus-visible:ring-blue-800 flex items-center justify-between`}
      >
        <RiMapPin2Fill className="text-disabled-grey-700" />
        {disabled ? (
          <input id="location" className="pl-3 w-full ring-0 focus:ring-0 focus:outline-none min-w-[6rem] opacity-75" value={selected?.label} disabled />
        ) : (
          <>
            <input
              id="location"
              aria-label="localisation"
              className={`pl-3 w-full ring-0 focus:ring-0 bg-[#EEE] focus:outline-none min-w-[6rem] ${!selected ? "text-[#666666] placeholder-[#666666]" : "text-[#161616]"}`}
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
                  plausible("Localisation erased");
                }}
              >
                <RiCloseFill />
              </button>
            )}
          </>
        )}
      </div>

      {isOpen && options.length > 0 && (
        <div className={`absolute z-50 mt-1 max-h-60 ${width} overflow-auto border border-neutral-grey-950 rounded-lg bg-white py-1 text-base focus:outline-none`}>
          {options.map((option) => (
            <div
              key={option.value}
              className="cursor-pointer flex items-center justify-between py-2 px-3 hover:bg-gray-100"
              onClick={() => {
                onChange(option);
                setInputValue(option.label);
                setIsOpen(false);
                plausible("Localisation selected", { props: { location: option.label } });
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

const RemoteFilter = ({ options, selectedOptions, onChange, color, id, placeholder = "Choissiez une option", position = "left-0", width = "w-80" }) => {
  const plausible = usePlausible();
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
    const exists = selectedOptions.find((o) => o.value === option.value);
    if (exists) {
      onChange(selectedOptions.filter((o) => o.value !== option.value));
    } else {
      onChange([...selectedOptions, option]);
    }
  };

  return (
    <div className="relative w-full min-w-[6rem]" ref={ref}>
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <button
        id={id}
        aria-label={placeholder}
        className={`w-full bg-[#EEE] h-[40px] rounded-t-md border-b-2 border-[#3A3A3A] p-3 focus:outline-none focus-visible:ring focus-visible:ring-blue-800 flex items-center justify-between ${
          !selectedOptions?.length ? "text-[#666666]" : "text-[#161616]"
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
        <div className={`absolute ${position} z-50 ${width} bg-white text-base focus:outline-none shadow-[0_0_12px_rgba(0,0,0,0.15)]`}>
          <div className="py-3 w-full overflow-auto max-h-60">
            {options?.length === 0 ? (
              <div className="text-sm text-center">Aucune option disponible</div>
            ) : (
              options?.map((o) => {
                const isSelected = selectedOptions?.some((so) => so.value === o.value);
                return (
                  <button
                    key={o.value}
                    onClick={() => {
                      toggleOption(o);
                      plausible("Remote filter selected", { props: { remote: o.label } });
                    }}
                    className="cursor-pointer w-full flex items-center justify-between text-sm py-2 pl-3 pr-4 hover:bg-gray-100"
                  >
                    <div className="flex items-center w-[90%]">
                      <div className="text-sm">{isSelected ? <RiCheckboxFill style={{ height: "16px", width: "16px", color }} /> : <RiCheckboxBlankLine />}</div>
                      <span className="block text-sm mx-2 truncate font-normal">{o.label}</span>
                    </div>
                    {o.count && <span className="text-sm text-neutral-grey-500">{o.count}</span>}
                  </button>
                );
              })
            )}
          </div>
          <div className="p-2 w-full flex justify-end border-t border-gray-300">
            <button
              className="text-[#3633A1] text-sm hover:underline"
              onClick={() => {
                onChange([]);
                setIsOpen(false);
                plausible("Remote filter erased");
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
