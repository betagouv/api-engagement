import React, { useState, Fragment, useRef } from "react";
import { Listbox, Combobox, Transition } from "@headlessui/react";
import { RiSearchLine, RiSubtractLine, RiAddLine, RiArrowDownSLine, RiCheckboxFill, RiCheckboxBlankLine, RiMapPin2Fill, RiCloseFill } from "react-icons/ri";

export const MobileFilters = ({ options, filters, setFilters, color, showFilters, setShowFilters, disabledLocation = false, carousel }) => {
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
      <div className="w-full mb-2">
        <LocationFilter selected={filters.location} onChange={(l) => setFilters({ ...filters, location: l })} disabled={disabledLocation} color={color} width="w-full" />
      </div>
      <div className="w-full border-y border-neutral-grey-950">
        <button
          className="flex items-center justify-between w-full px-4 py-2 bg-white font-semibold focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
          onClick={() => setShowFilters(!showFilters)}
        >
          Filtrer les missions
          {showFilters ? <RiSubtractLine className="font-semibold" /> : <RiAddLine className="font-semibold" />}
        </button>

        {showFilters && (
          <div className="w-full p-0">
            <div className="w-full mb-2">
              <SelectFilter
                options={options.remote}
                selectedOptions={filters.remote}
                onChange={(f) => setFilters({ ...filters, remote: f })}
                placeholder="Présentiel / Distance"
                width="w-full"
                color={color}
              />
            </div>
            <div className="w-full mb-2">
              <SelectFilter
                options={options.domains}
                selectedOptions={filters.domain}
                onChange={(v) => setFilters({ ...filters, domain: v })}
                placeholder="Domaines"
                width="w-full"
                color={color}
              />
            </div>
            <div className="w-full mb-2">
              <SelectFilter
                options={options.departments}
                selectedOptions={filters.department}
                onChange={(v) => setFilters({ ...filters, department: v })}
                placeholder="Départements"
                width="w-full"
                color={color}
              />
            </div>
            <div className="w-full mb-2">
              <SelectFilter
                options={options.organizations}
                selectedOptions={filters.organization}
                onChange={(v) => setFilters({ ...filters, organization: v })}
                placeholder="Organisations"
                width="w-full"
                color={color}
              />
            </div>
            <button
              aria-label="Réinitialiser"
              className="w-full p-3 text-center border-none bg-transparent text-sm focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
              style={{ color }}
              onClick={handleReset}
            >
              Réinitialiser
            </button>
          </div>
        )}
      </div>
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
        <SelectFilter
          options={options.remote}
          selectedOptions={filters.remote}
          onChange={(f) => setFilters({ ...filters, remote: f })}
          placeholder="Présentiel / Distance"
          aria-label="remote-filter"
          color={color}
        />
      </div>
      <div className="w-[20%] px-2">
        <SelectFilter options={options.domains} selectedOptions={filters.domain} onChange={(v) => setFilters({ ...filters, domain: v })} placeholder="Domaines" color={color} />
      </div>
      <div className="w-[20%] px-2">
        <SelectFilter
          options={options.departments}
          selectedOptions={filters.department}
          onChange={(v) => setFilters({ ...filters, department: v })}
          placeholder="Départements"
          color={color}
        />
      </div>
      <div className="w-[20%] pl-2">
        <SelectFilter
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

const SelectFilter = ({ options, selectedOptions, onChange, color, placeholder = "Choissiez une option", position = "left-0", width = "w-80" }) => {
  const [keyboardNav, setKeyboardNav] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);
  const searchOptions = options && options.filter ? options.filter((o) => o.label?.toLowerCase().includes(search.toLowerCase())) : [];
  const handleKeyDown = () => {
    setKeyboardNav(true);
  };
  const handleMouseOver = () => {
    setKeyboardNav(false);
  };
  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  return (
    <Listbox as={Fragment} value={selectedOptions || []} onChange={onChange} by="value" multiple>
      <div className="relative w-full min-w-[6rem]">
        <Listbox.Button
          aria-label={placeholder}
          className="rounded-lg border w-full border-neutral-grey-950 p-3 focus:outline-none focus-visible:ring focus-visible:ring-blue-800 flex items-center justify-between"
          onKeyDown={handleKeyDown}
        >
          {({ open }) => (
            <>
              <span className="pr-3 text-sm truncate max-w-60" style={{ color: selectedOptions?.length > 0 ? color : "black" }}>
                {!selectedOptions || selectedOptions.some((o) => o === undefined)
                  ? (onChange([]), placeholder)
                  : selectedOptions.length > 0
                  ? `${selectedOptions[0].label}${selectedOptions.length > 1 ? ` +${selectedOptions.length - 1}` : ""}`
                  : placeholder}
              </span>
              {open ? <RiArrowDownSLine className="text-xl transform rotate-180" /> : <RiArrowDownSLine className="text-xl" />}
            </>
          )}
        </Listbox.Button>
        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0" afterEnter={() => searchRef.current?.focus()}>
          <Listbox.Options className={`absolute ${position} mt-1 z-50 ${width} border border-neutral-grey-950 rounded-lg bg-white text-base focus:outline-none`}>
            <div className="p-2">
              <div className="rounded-lg border w-full border-neutral-grey-950 p-2 focus:outline-none flex items-center justify-between">
                <RiSearchLine className="text-disabled-grey-700" />
                <input
                  ref={searchRef}
                  onKeyDown={(e) => {
                    if (e.code === "Space") {
                      e.stopPropagation();
                    }
                  }}
                  type="text"
                  value={search}
                  onChange={handleSearch}
                  placeholder="Rechercher"
                  className="w-full text-sm rounded-lg pl-3 focus:outline-none"
                />
              </div>
            </div>
            <div className="py-3 w-full overflow-auto max-h-60">
              {searchOptions?.length === 0 ? (
                <div className="text-sm text-center">Aucune option disponible</div>
              ) : (
                searchOptions?.map((o) => {
                  return (
                    <Listbox.Option key={o.value} value={o} as={Fragment}>
                      {({ active, selected }) => (
                        <div
                          className="cursor-default w-full flex items-center justify-between text-sm py-2 pl-3 pr-4"
                          style={{
                            color: selected || active ? color : "black",
                          }}
                        >
                          <div className="flex items-center w-[90%]">
                            <div className={`text-sm ${active && keyboardNav ? "border-2 border-blue-800 rounded" : ""}`} onMouseOver={handleMouseOver}>
                              {selected ? <RiCheckboxFill /> : <RiCheckboxBlankLine />}
                            </div>
                            <span className="block text-sm mx-2 truncate font-normal">{o.label}</span>
                          </div>
                          {o.count && <span className="text-sm text-neutral-grey-500">{o.count}</span>}
                        </div>
                      )}
                    </Listbox.Option>
                  );
                })
              )}
            </div>
            <Listbox.Option as={Fragment}>
              {({ active }) => (
                <div className="pt-2 pb-1 px-6 w-full flex justify-end border-t border-neutral-grey-950 focus:outline-none focus-visible:ring focus-visible:ring-blue-800">
                  <button
                    className={`text-sm ${active && keyboardNav ? "border-2 border-blue-800 rounded" : ""}`}
                    style={{ color }}
                    onClick={() => onChange(null)}
                    onMouseOver={handleMouseOver}
                  >
                    Effacer
                  </button>
                </div>
              )}
            </Listbox.Option>
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
};

const LocationFilter = ({ selected, onChange, color, disabled = false, width = "w-80" }) => {
  const [options, setOptions] = useState([]);

  const handleInputChange = async (e) => {
    e.preventDefault();
    const search = e.target.value;
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
    } else if (search?.length === 0) {
      setOptions([]);
    }
  };

  return (
    <Combobox as={Fragment} value={selected} onChange={onChange} disabled={disabled}>
      {({ disabled }) => (
        <div className="relative w-full">
          <div
            tabIndex={0}
            className="rounded-lg border w-full border-neutral-grey-950 p-3 focus:outline-none focus-visible:ring focus-visible:ring-blue-800 flex items-center justify-between"
          >
            <RiMapPin2Fill className="text-disabled-grey-700" />
            {disabled ? (
              <input className="pl-3 w-full text-sm ring-0 focus:ring-0 focus:outline-none min-w-[6rem] opacity-75" defaultValue={selected?.label} disabled />
            ) : (
              <>
                <Combobox.Input
                  aria-label="localisation"
                  className="pl-3 w-full text-sm ring-0 focus:ring-0 focus:outline-none min-w-[6rem]"
                  displayValue={(location) => location?.label}
                  placeholder="Localisation"
                  onChange={handleInputChange}
                />
                {selected && (
                  <button className="text-sm text-neutral-grey-700" onClick={() => onChange(null)}>
                    <RiCloseFill />
                  </button>
                )}
              </>
            )}
          </div>

          {options.length > 0 && (
            <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
              <Combobox.Options
                className={`absolute z-50 mt-1 max-h-60 ${width} overflow-auto border border-neutral-grey-950 rounded-lg bg-white py-1 text-base focus:outline-none`}
              >
                {options.map((option) => (
                  <Combobox.Option key={option.value} value={option} as={Fragment}>
                    {({ active }) => (
                      <div className="cursor-default flex items-center justify-between py-2 px-3" style={{ color: active ? color : "black" }}>
                        <span className="block text-sm truncate font-normal">{option.label}</span>
                      </div>
                    )}
                  </Combobox.Option>
                ))}
              </Combobox.Options>
            </Transition>
          )}
        </div>
      )}
    </Combobox>
  );
};
