import { useState, useEffect, useRef } from "react";
import { usePlausible } from "next-plausible";
import { DayPicker } from "react-day-picker";
import fr from "date-fns/locale/fr";
import { RiArrowUpSLine, RiArrowDownSLine, RiCheckboxFill, RiCheckboxBlankLine, RiRadioButtonLine, RiCircleLine, RiMapPin2Fill, RiCloseFill } from "react-icons/ri";

import "react-day-picker/dist/style.css";
import useStore from "../store";
import { ACCESSIBILITIES, ACTIONS, BENEFICIARIES, DOMAINS, MINORS, SCHEDULES } from "../config";

const getAPI = async (path) => {
  const response = await fetch(path, { method: "GET" });

  if (!response.ok) throw response;
  return response.json();
};

const Filters = ({ widget, apiUrl, values, onChange, show, onShow }) => {
  const [options, setOptions] = useState({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", () => setIsMobile(window.innerWidth < 768));
    return () => window.removeEventListener("resize", () => {});
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const searchParams = new URLSearchParams();

        if (values.accessibility && values.accessibility.length) values.accessibility.forEach((o) => searchParams.append("accessibility", o.value));
        if (values.action && values.action.length) values.action.forEach((o) => searchParams.append("action", o.value));
        if (values.beneficiary && values.beneficiary.length) values.beneficiary.forEach((o) => searchParams.append("beneficiary", o.value));
        if (values.country && values.country.length) values.country.forEach((o) => searchParams.append("country", o.value));
        if (values.domain && values.domain.length) values.domain.forEach((o) => searchParams.append("domain", o.value));
        if (values.duration) searchParams.append("duration", values.duration.value);
        if (values.minor && values.minor.length) values.minor.forEach((o) => searchParams.append("minor", o.value));
        if (values.schedule && values.schedule.length) values.schedule.forEach((o) => searchParams.append("schedule", o.value));
        if (values.start) searchParams.append("start", values.start.value.toISOString());
        if (values.location && values.location.lat && values.location.lon) {
          searchParams.append("lat", values.location.lat);
          searchParams.append("lon", values.location.lon);
        }

        const { ok, data } = await getAPI(`${apiUrl}/iframe/${widget._id}/aggs?${searchParams.toString()}`);

        if (!ok) throw Error("Error fetching aggs");
        const france = data.country.reduce((acc, c) => acc + (c.key === "FR" ? c.doc_count : 0), 0);
        const abroad = data.country.reduce((acc, c) => acc + (c.key !== "FR" ? c.doc_count : 0), 0);
        const country = [];
        country.push({ value: "FR", count: france, label: "France" });
        country.push({ value: "NOT_FR", count: abroad, label: "Etranger" });

        const newOptions = {
          schedule: data.schedule.map((b) => ({ value: b.key, count: b.doc_count, label: SCHEDULES[b.key] || b.key })),
          domain: data.domain.map((b) => ({
            value: b.key,
            count: b.doc_count,
            label: DOMAINS[b.key] ? DOMAINS[b.key].label : b.key,
          })),
          action: data.action.map((b) => ({ value: b.key, count: b.doc_count, label: ACTIONS[b.key] || b.key })),
          beneficiary: data.beneficiary.map((b) => ({ value: b.key, count: b.doc_count, label: BENEFICIARIES[b.key] || b.key })),
          accessibility: data.accessibility.map((b) => ({ value: b.key, count: b.doc_count, label: ACCESSIBILITIES[b.key] || b.key })),
          minor: data.minor.map((b) => ({ value: b.key, count: b.doc_count, label: MINORS[b.key] || b.key })),
          country,
        };
        setOptions(newOptions);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, [widget, values]);

  if (isMobile) {
    return (
      <div className="w-full flex flex-col items-center gap-2 md:mb-14">
        <MobileFilters
          options={options}
          values={values}
          onChange={(newFilters) => onChange({ ...values, ...newFilters })}
          disabledLocation={!!widget.location}
          show={show}
          onShow={onShow}
        />
      </div>
    );
  }

  return (
    <div className="w-full mb-8 md:mb-2">
      <DesktopFilters options={options} values={values} onChange={(v) => onChange({ ...values, ...v })} disabledLocation={!!widget.location} />
    </div>
  );
};

const MobileFilters = ({ options, values, onChange, show, onShow, disabledLocation = false }) => {
  const { url, color } = useStore();

  const plausible = usePlausible();
  if (!Object.keys(options).length) return null;

  const handleReset = () => {
    onChange({
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
        <LocationFilter selected={values.location} onChange={(l) => onChange({ ...values, location: l })} disabled={disabledLocation} />
      </div>
      <div className="w-full border-y border-[#DDD]">
        <button
          className="flex h-[40px] items-center justify-between w-full bg-white font-semibold focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
          onClick={() => {
            onShow(!show);
            plausible(show ? "Filters closed" : "Filters opened", { u: url });
          }}
          style={{ color }}
        >
          Filtrer les missions
          {show ? <RiArrowUpSLine className="font-semibold" /> : <RiArrowDownSLine className="font-semibold" />}
        </button>

        {show && (
          <div className="w-full flex flex-col mt-4 gap-4">
            <div className="w-full">
              <DateFilter selected={values.start} onChange={(f) => onChange({ ...values, start: f })} width="w-full" />
            </div>
            <div className="w-full">
              <DurationFilter selected={values.duration} onChange={(v) => onChange({ ...values, duration: v })} width="w-full" />
            </div>
            <div className="w-full">
              <SelectFilter
                id="domain"
                options={options.domain || []}
                selectedOptions={values.domain}
                onChange={(v) => onChange({ ...values, domain: v })}
                placeholder="Domaines"
                width="w-full"
                color={color}
              />
            </div>
            <div className="w-full ">
              <SelectFilter
                id="schedule"
                options={options.schedule || []}
                selectedOptions={values.schedule}
                onChange={(v) => onChange({ ...values, schedule: v })}
                placeholder="Horaires"
                width="w-full"
              />
            </div>
            <div className="w-full">
              <SelectFilter
                id="accessibility"
                options={options.accessibility || []}
                selectedOptions={values.accessibility}
                onChange={(v) => onChange({ ...values, accessibility: v })}
                placeholder="Accessibilité"
                width="w-full"
              />
            </div>
            <div className="w-full">
              <SelectFilter
                id="beneficiary"
                options={options.beneficiary || []}
                selectedOptions={values.beneficiary}
                onChange={(v) => onChange({ ...values, beneficiary: v })}
                placeholder="Public bénéficiaire"
                width="w-full"
              />
            </div>
            <div className="w-full">
              <SelectFilter
                id="action"
                options={options.action || []}
                selectedOptions={values.action}
                onChange={(v) => onChange({ ...values, action: v })}
                placeholder="Actions clés"
                width="w-full"
              />
            </div>
            <div className="w-full">
              <SelectFilter
                id="country"
                options={options.country || []}
                selectedOptions={values.country}
                onChange={(v) => onChange({ ...values, country: v })}
                placeholder="France / Etranger"
                position="right-0"
              />
            </div>
            <button
              aria-label="Voir les missions"
              className="w-full p-3 text-center border-none bg-black text-white focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
              onClick={() => {
                onShow(false);
                plausible("Filters closed", { u: url });
              }}
              style={{
                backgroundColor: color,
                color: "white",
              }}
            >
              Voir les missions
            </button>
            <button
              className="w-full p-3 text-center bg-transparent focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
              onClick={() => {
                handleReset();
                plausible("Filters reset", { u: url });
              }}
              style={{ color }}
            >
              Réinitialiser
            </button>
          </div>
        )}
      </div>
    </>
  );
};

const DesktopFilters = ({ options, values, onChange, disabledLocation = false }) => {
  const { url, color } = useStore();
  const plausible = usePlausible();
  const [moreFilters, setMoreFilters] = useState(false);
  const missionsAbroad = useRef(null);

  useEffect(() => {
    if (missionsAbroad.current === null && Array.isArray(options.country)) {
      missionsAbroad.current = options.country.some((o) => o.value === "NOT_FR" && o.count > 0);
    }
  }, [options.country]);

  return (
    <div className="flex-1">
      <div className="grid grid-cols-5 gap-4 h-10">
        <LocationFilter selected={values.location} onChange={(l) => onChange({ ...values, location: l })} disabled={disabledLocation} color={color} />
        <DateFilter selected={values.start} onChange={(f) => onChange({ ...values, start: f })} color={color} />
        <DurationFilter selected={values.duration} onChange={(v) => onChange({ ...values, duration: v })} color={color} />
        <SelectFilter
          id="domain"
          options={options.domain || []}
          selectedOptions={values.domain}
          onChange={(v) => onChange({ ...values, domain: v })}
          placeholder="Thèmes"
          color={color}
        />
        {moreFilters ? (
          <SelectFilter
            id="minor"
            options={options.minor || []}
            selectedOptions={values.minor}
            onChange={(v) => onChange({ ...values, minor: v })}
            placeholder="Accès aux mineurs"
            position="right-0"
            color={color}
          />
        ) : (
          <button
            aria-label="plus de filtres"
            className="border truncate w-full bg-white border-grey-400 py-2 px-4 h-[40px] focus:outline-none focus-visible:ring focus-visible:ring-blue-800 font-medium"
            onClick={() => {
              setMoreFilters(true);
              plausible("More filters", { u: url });
            }}
            style={{
              backgroundColor: "white",
              color: color,
            }}
          >
            Plus de filtres
          </button>
        )}
      </div>

      {moreFilters && (
        <div className={missionsAbroad.current ? "grid grid-cols-6 gap-4 mt-4" : "grid grid-cols-5 gap-4 mt-4"}>
          <SelectFilter
            id="schedule"
            options={options.schedule || []}
            selectedOptions={values.schedule}
            onChange={(v) => onChange({ ...values, schedule: v })}
            placeholder="Horaires"
            position="left-0"
            color={color}
          />
          <SelectFilter
            id="accessibility"
            options={options.accessibility || []}
            selectedOptions={values.accessibility}
            onChange={(v) => onChange({ ...values, accessibility: v })}
            placeholder="Accessibilité"
            position="right-0"
            color={color}
          />
          <SelectFilter
            id="beneficiary"
            options={options.beneficiary || []}
            selectedOptions={values.beneficiary}
            onChange={(v) => onChange({ ...values, beneficiary: v })}
            placeholder="Public bénéficiaire"
            position="right-0"
            color={color}
          />
          <SelectFilter
            id="action"
            options={options.action || []}
            selectedOptions={values.action}
            onChange={(v) => onChange({ ...values, action: v })}
            placeholder="Actions clés"
            position="right-0"
            color={color}
          />
          {missionsAbroad.current && (
            <SelectFilter
              id="country"
              options={options.country || []}
              selectedOptions={values.country}
              onChange={(v) => onChange({ ...values, country: v })}
              placeholder="France / Etranger"
              position="right-0"
              color={color}
            />
          )}

          <button
            aria-label="moins de filtres"
            className="border truncate w-full bg-white border-grey-400 py-2 px-4 h-[40px] focus:outline-none focus-visible:ring focus-visible:ring-blue-800 font-medium"
            onClick={() => {
              setMoreFilters(false);
              plausible("Less filters", { u: url });
            }}
            style={{
              backgroundColor: "white",
              color: color,
            }}
          >
            Moins de filtres
          </button>
        </div>
      )}
    </div>
  );
};

const DateFilter = ({ selected, onChange, position = "left-0", width = "w-80" }) => {
  const { url, color } = useStore();
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
              plausible("Date selected", { props: { date: date.toLocaleDateString("fr") }, u: url });
            }}
            className="w-full flex justify-center border-none"
            modifiers={{
              selected: (date) => selected && date.toLocaleDateString("fr") === selected.value.toLocaleDateString("fr"),
            }}
            modifiersStyles={{
              selected: {
                backgroundColor: color,
              },
            }}
          />
          <div className="pt-2 pb-1 px-6 w-full flex justify-end border-t border-neutral-grey-950">
            <button
              className="text-sm"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
                plausible("Date erased", { u: url });
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
  const { url, color } = useStore();
  const plausible = usePlausible();
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
                    plausible(`Filter duration selected`, { props: { filter: o.label }, u: url });
                  }}
                >
                  <div className="flex items-center w-[90%]">
                    <div className={`text-sm ${keyboardNav ? "border-2 border-blue-800 rounded" : ""}`} onMouseOver={handleMouseOver}>
                      {selected?.value === o.value ? <RiRadioButtonLine style={{ color }} /> : <RiCircleLine />}
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
                plausible("Filter duration erased", { u: url });
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

const SelectFilter = ({ options, selectedOptions, onChange, id, placeholder = "Choissiez une option", position = "left-0", width = "w-80" }) => {
  const { url, color } = useStore();
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
                  <div
                    key={o.value}
                    className="cursor-pointer w-full flex items-center justify-between text-sm py-2 pl-3 pr-4"
                    onClick={() => {
                      toggleOption(o);
                      plausible(`Filter ${id} selected`, { props: { filter: o.label }, u: url });
                    }}
                  >
                    <div className="flex items-center w-[90%]">
                      <div className="text-sm">
                        {isSelected ? (
                          <RiCheckboxFill
                            style={{
                              height: "16px",
                              width: "16px",
                              color: color,
                            }}
                          />
                        ) : (
                          <RiCheckboxBlankLine />
                        )}
                      </div>
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
                plausible(`Filter ${id} erased`, { u: url });
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
  const { url } = useStore();
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
                  plausible("Location erased", { u: url });
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
                plausible("Location selected", { props: { location: option.label }, u: url });
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

export default Filters;
