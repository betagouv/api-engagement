import React, { useState, Fragment, useEffect, useRef } from "react";
import { Listbox, Popover, Combobox, Transition } from "@headlessui/react";
import { DayPicker } from "react-day-picker";
import fr from "date-fns/locale/fr";
import { RiSubtractLine, RiAddLine, RiArrowDownSLine, RiCheckboxFill, RiCheckboxBlankLine, RiRadioButtonLine, RiCircleLine, RiMapPin2Fill, RiCloseFill } from "react-icons/ri";

import "react-day-picker/dist/style.css";

const hexToRgb = (hex) => {
  const bigint = parseInt(hex.replace("#", ""), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return { r, g, b };
};

const getTextColor = (color) => {
  const { r, g, b } = hexToRgb(color);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 125 ? "black" : "white";
};

export const MobileFilters = ({ options, filters, setFilters, color, showFilters, setShowFilters, disabledLocation = false, carousel }) => {
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
      <div className="w-full mb-2">
        <LocationFilter selected={filters.location} onChange={(l) => setFilters({ ...filters, location: l })} disabled={disabledLocation} color={color} />
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
              <DateFilter selected={filters.start} onChange={(f) => setFilters({ ...filters, start: f })} color={color} width="w-full" />
            </div>
            <div className="w-full mb-2">
              <DurationFilter selected={filters.duration} onChange={(v) => setFilters({ ...filters, duration: v })} color={color} width="w-full" />
            </div>
            <div className="w-full mb-2">
              <SelectFilter
                options={options.domain}
                selectedOptions={filters.domain}
                onChange={(v) => setFilters({ ...filters, domain: v })}
                placeholder="Domaines"
                color={color}
                width="w-full"
              />
            </div>
            <div className="w-full mb-2">
              <SelectFilter
                options={options.schedule}
                selectedOptions={filters.schedule}
                onChange={(v) => setFilters({ ...filters, schedule: v })}
                placeholder="Horaires"
                color={color}
                width="w-full"
              />
            </div>
            <div className="w-full mb-2">
              <SelectFilter
                options={options.accessibility}
                selectedOptions={filters.accessibility}
                onChange={(v) => setFilters({ ...filters, accessibility: v })}
                placeholder="Accessibilité"
                color={color}
                width="w-full"
              />
            </div>
            <div className="w-full mb-2">
              <SelectFilter
                options={options.beneficiary}
                selectedOptions={filters.beneficiary}
                onChange={(v) => setFilters({ ...filters, beneficiary: v })}
                placeholder="Public bénéficiaire"
                color={color}
                width="w-full"
              />
            </div>
            <div className="w-full mb-2">
              <SelectFilter
                options={options.action}
                selectedOptions={filters.action}
                onChange={(v) => setFilters({ ...filters, action: v })}
                placeholder="Actions clés"
                color={color}
                width="w-full"
              />
            </div>
            <div className="w-full mb-2">
              <SelectFilter
                options={options.country}
                selectedOptions={filters.country}
                onChange={(v) => setFilters({ ...filters, country: v })}
                placeholder="France / Etranger"
                position="right-0"
                color={color}
              />
            </div>
            <button
              className="w-full p-2 text-center border-none bg-transparent text-sm focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
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
      <div className="grid grid-cols-5 gap-4">
        <LocationFilter selected={filters.location} onChange={(l) => setFilters({ ...filters, location: l })} disabled={disabledLocation} color={color} />
        <DateFilter selected={filters.start} onChange={(f) => setFilters({ ...filters, start: f })} color={color} />
        <DurationFilter selected={filters.duration} onChange={(v) => setFilters({ ...filters, duration: v })} color={color} />
        <SelectFilter options={options.domain} selectedOptions={filters.domain} onChange={(v) => setFilters({ ...filters, domain: v })} placeholder="Thèmes" color={color} />

        {moreFilters ? (
          <SelectFilter
            options={options.minor}
            selectedOptions={filters.minor}
            onChange={(v) => setFilters({ ...filters, minor: v })}
            placeholder="Accès aux mineurs"
            position="right-0"
            color={color}
          />
        ) : (
          <button
            className="rounded-lg border w-full bg-white border-grey-400 py-2 px-4 focus:outline-none focus-visible:ring focus-visible:ring-blue-800 text-sm text-[#252baa]"
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
            color={color}
          />
          <SelectFilter
            options={options.accessibility}
            selectedOptions={filters.accessibility}
            onChange={(v) => setFilters({ ...filters, accessibility: v })}
            placeholder="Accessibilité"
            position="right-0"
            color={color}
          />
          <SelectFilter
            options={options.beneficiary}
            selectedOptions={filters.beneficiary}
            onChange={(v) => setFilters({ ...filters, beneficiary: v })}
            placeholder="Public bénéficiaire"
            position="right-0"
            color={color}
          />
          <SelectFilter
            options={options.action}
            selectedOptions={filters.action}
            onChange={(v) => setFilters({ ...filters, action: v })}
            placeholder="Actions clés"
            position="right-0"
            color={color}
          />
          {missionsAbroad.current && (
            <SelectFilter
              options={options.country}
              selectedOptions={filters.country}
              onChange={(v) => setFilters({ ...filters, country: v })}
              placeholder="France / Etranger"
              position="right-0"
              color={color}
            />
          )}

          <button
            className="rounded-lg border w-full bg-white border-grey-400 py-2 px-4 focus:outline-none focus-visible:ring focus-visible:ring-blue-800 text-sm text-[#252baa] truncate"
            onClick={() => setMoreFilters(false)}
          >
            Moins de filtres
          </button>
        </div>
      )}
    </div>
  );
};

const DateFilter = ({ selected, onChange, color, position = "left-0", width = "w-80" }) => {
  return (
    <Popover as={Fragment}>
      <div className="relative w-full min-w-[6rem]">
        <Popover.Button className="rounded-lg border bg-white w-full border-neutral-grey-950 py-2 px-4 focus:outline-none focus-visible:ring focus-visible:ring-blue-800 flex items-center justify-between">
          {({ open }) => (
            <>
              <span className="pr-3 text-sm truncate max-w-60" style={{ color: selected > 0 ? color : "black" }}>
                {selected ? selected.label : "Date"}
              </span>
              {open ? <RiArrowDownSLine className="text-xl transform rotate-180" /> : <RiArrowDownSLine className="text-xl" />}
            </>
          )}
        </Popover.Button>
        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
          <Popover.Panel
            className={`absolute ${position} mt-1 z-50 ${width} flex flex-col items-center border border-neutral-grey-950 rounded-lg bg-white py-1 text-base focus:outline-none`}
          >
            {({ close }) => (
              <>
                <div className="flex items-center justify-between px-6 py-2">
                  <p>Je suis disponible à partir du</p>
                </div>
                <div>
                  <DayPicker
                    mode="single"
                    locale={fr}
                    selected={selected}
                    onDayClick={(date) => onChange({ label: date.toLocaleDateString("fr"), value: date })}
                    className="w-full border-none"
                    // Set Selected date to color + set hover color with low opacity
                    modifiers={{
                      selected: (date) => selected && date.toLocaleDateString("fr") === selected.value.toLocaleDateString("fr"),
                    }}
                    modifiersStyles={{
                      selected: {
                        backgroundColor: color,
                        color: getTextColor(color),
                      },
                      hover: {
                        color: color,
                        opacity: 0.2,
                      },
                    }}
                  />
                </div>

                <div className="pt-2 pb-1 px-6 w-full flex justify-end border-t border-neutral-grey-950 focus:outline-none focus-visible:ring focus-visible:ring-blue-800">
                  <button className="text-sm" style={{ color }} onClick={() => onChange(null)}>
                    Effacer
                  </button>
                </div>
              </>
            )}
          </Popover.Panel>
        </Transition>
      </div>
    </Popover>
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

const DurationFilter = ({ selected, onChange, color, position = "left-0", width = "w-80" }) => {
  const [keyboardNav, setKeyboardNav] = useState(false);
  const handleKeyDown = () => {
    setKeyboardNav(true);
  };
  const handleMouseOver = () => {
    setKeyboardNav(false);
  };

  return (
    <Listbox as={Fragment} value={selected} onChange={onChange} by="value">
      <div className="relative w-full min-w-[6rem]">
        <Listbox.Button
          onKeyDown={handleKeyDown}
          className="rounded-lg border w-full bg-white border-neutral-grey-950 py-2 px-4 focus:outline-none focus-visible:ring focus-visible:ring-blue-800 flex items-center justify-between"
        >
          {({ open }) => (
            <>
              <span className="pr-3 text-sm truncate max-w-60" style={{ color: selected ? color : "black" }}>
                {selected ? selected.label : "Durée"}
              </span>
              {open ? <RiArrowDownSLine className="text-xl transform rotate-180" /> : <RiArrowDownSLine className="text-xl" />}
            </>
          )}
        </Listbox.Button>
        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
          <Listbox.Options className={`absolute ${position} mt-1 z-50 ${width} border border-neutral-grey-950 rounded-lg bg-white py-1 text-base focus:outline-none`}>
            <div className="p-3 w-full overflow-auto max-h-60">
              <div className="flex items-center justify-between p-2">
                <p>Durée maximale de la mission</p>
              </div>
              {DURATION_OPTIONS.map((o) => {
                return (
                  <Listbox.Option key={o.value} value={o} as={Fragment}>
                    {({ active, selected }) => (
                      <div className="cursor-default w-full flex items-center justify-between text-sm py-2 pl-3 pr-4" style={{ color: selected || active ? color : "black" }}>
                        <div className="flex items-center w-[90%]">
                          <div className={`text-sm ${active && keyboardNav ? "border-2 border-blue-800 rounded" : ""}`} onMouseOver={handleMouseOver}>
                            {selected ? <RiRadioButtonLine /> : <RiCircleLine />}
                          </div>

                          <span className="block text-sm mx-2 truncate font-normal">{o.label}</span>
                        </div>
                      </div>
                    )}
                  </Listbox.Option>
                );
              })}
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

const SelectFilter = ({ options, selectedOptions, onChange, color, placeholder = "Choissiez une option", position = "left-0", width = "w-80" }) => {
  const [keyboardNav, setKeyboardNav] = useState(false);
  const handleKeyDown = () => {
    setKeyboardNav(true);
  };
  const handleMouseOver = () => {
    setKeyboardNav(false);
  };

  return (
    <Listbox as={Fragment} value={selectedOptions || []} onChange={onChange} by="value" multiple>
      <div className="relative w-full min-w-[6rem]">
        <Listbox.Button
          onKeyDown={handleKeyDown}
          tabIndex={0}
          className="rounded-lg border w-full bg-white border-neutral-grey-950 py-2 px-4 focus:outline-none focus-visible:ring focus-visible:ring-blue-800 flex items-center justify-between"
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
        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
          <Listbox.Options className={`absolute ${position} mt-1 z-50 ${width} border border-neutral-grey-950 rounded-lg bg-white py-1 text-base focus:outline-none`}>
            <div className="py-3 w-full overflow-auto max-h-60">
              {options?.length === 0 ? (
                <div className="text-sm text-center">Aucune option disponible</div>
              ) : (
                options.map((o) => {
                  return (
                    <Listbox.Option key={o.value} value={o} as={Fragment}>
                      {({ active, selected }) => (
                        <div className="cursor-default w-full flex items-center justify-between text-sm py-2 pl-3 pr-4" style={{ color: selected || active ? color : "black" }}>
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
            className="rounded-lg border w-full bg-white border-neutral-grey-950 py-2 px-4 focus:outline-none focus-visible:ring focus-visible:ring-blue-800 flex items-center justify-between"
          >
            <RiMapPin2Fill className="text-disabled-grey-700" />
            {disabled ? (
              <input className="pl-3 w-full text-sm ring-0 focus:ring-0 focus:outline-none min-w-[6rem] opacity-75" defaultValue={selected?.label} disabled />
            ) : (
              <>
                <Combobox.Input
                  className="pl-3 w-full text-sm ring-0 focus:ring-0 focus:outline-none min-w-[6rem]"
                  displayValue={(location) => location?.label}
                  placeholder="Localisation"
                  onChange={handleInputChange}
                />
                {selected && (
                  <button
                    aria-label="Réinitialiser localisation"
                    className="text-sm text-neutral-grey-700 focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
                    onClick={() => onChange(null)}
                  >
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
