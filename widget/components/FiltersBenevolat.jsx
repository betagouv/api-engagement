import { usePlausible } from "next-plausible";
import { useEffect, useRef, useState } from "react";
import { RiArrowDownSLine, RiArrowUpSLine, RiCheckboxBlankLine, RiCheckboxFill, RiCloseFill, RiMapPin2Fill, RiSearchLine } from "react-icons/ri";

import { DOMAINS } from "../config";
import useStore from "../utils/store";

const getAPI = async (path) => {
  const response = await fetch(path, { method: "GET" });

  if (!response.ok) {
    throw response;
  }
  return response.json();
};

const Filters = ({ widget, apiUrl, values, onChange, show, onShow }) => {
  const [options, setOptions] = useState({
    organizations: [],
    domains: [],
    departments: [],
    remote: [],
  });
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

        if (values.domain && values.domain.length) {
          values.domain.forEach((item) => searchParams.append("domain", item.value));
        }
        if (values.organization && values.organization.length) {
          values.organization.forEach((item) => searchParams.append("organization", item.value));
        }
        if (values.department && values.department.length) {
          values.department.forEach((item) => searchParams.append("department", item.value === "" ? "none" : item.value));
        }
        if (values.remote && values.remote.length) {
          values.remote.forEach((item) => searchParams.append("remote", item.value));
        }

        if (values.location && values.location.lat && values.location.lon) {
          searchParams.append("lat", values.location.lat);
          searchParams.append("lon", values.location.lon);
        }
        ["domain", "organization", "department", "remote"].forEach((key) => searchParams.append("aggs", key));

        const { ok, data } = await getAPI(`${apiUrl}/iframe/${widget._id}/aggs?${searchParams.toString()}`);

        if (!ok) {
          throw Error("Error fetching aggs");
        }

        const remote = data.remote.filter((b) => b.key === "full" || b.key === "possible");
        const presentiel = data.remote.filter((b) => b.key === "no");
        const newOptions = {
          organizations: data.organization.map((b) => ({ value: b.key, count: b.doc_count, label: b.key })),
          domains: data.domain.map((b) => ({ value: b.key, count: b.doc_count, label: DOMAINS[b.key] ? DOMAINS[b.key].label : b.key })),
          departments: data.department.map((b) => ({
            value: b.key === "" ? "none" : b.key,
            count: b.doc_count,
            label: b.key === "" ? "Non renseigné" : b.key,
          })),
          remote: [
            { value: "no", label: "Présentiel", count: presentiel.reduce((acc, b) => acc + b.doc_count, 0) },
            { value: "yes", label: "Distance", count: remote.reduce((acc, b) => acc + b.doc_count, 0) },
          ],
        };
        setOptions(newOptions);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, [widget._id, values]);

  if (isMobile) {
    return (
      <div className="flex w-full flex-col items-center gap-2">
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
    <div className="m-auto flex items-center justify-between">
      <DesktopFilters options={options} values={values} onChange={(v) => onChange({ ...values, ...v })} disabledLocation={!!widget.location} />
    </div>
  );
};

const MobileFilters = ({ options, values, onChange, show, onShow, disabledLocation = false }) => {
  const { url, color } = useStore();

  const plausible = usePlausible();
  if (!Object.keys(options).length) {
    return null;
  }

  const handleReset = () => {
    onChange({
      domain: [],
      organization: [],
      department: [],
      remote: [],
      location: null,
      page: 1,
    });
  };

  return (
    <>
      <div className="w-full">
        <LocationFilter selected={values.location} onChange={(l) => onChange({ ...values, location: l })} disabled={disabledLocation} color={color} width="w-full" />
      </div>
      <div className="w-full border-y border-[#DDD]">
        <button
          className="flex h-[40px] w-full items-center justify-between bg-white px-4 focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
          onClick={() => {
            onShow(!show);
            plausible(show ? "Filters closed" : "Filters opened", { u: url });
          }}
        >
          Filtrer les missions
          {show ? <RiArrowUpSLine className="font-semibold" style={{ color: color }} /> : <RiArrowDownSLine className="font-semibold" style={{ color: color }} />}
        </button>

        {show && (
          <div className="mt-2 w-full">
            <div className="mb-4 w-full">
              <RemoteFilter
                id="remote"
                options={options.remote}
                selectedOptions={values.remote}
                onChange={(f) => onChange({ ...values, remote: f })}
                placeholder="Présentiel / Distance"
                width="w-full"
                color={color}
              />
            </div>
            <div className="mb-4 w-full">
              <SelectFilter
                id="domain"
                options={options.domains}
                selectedOptions={values.domain}
                onChange={(v) => onChange({ ...values, domain: v })}
                placeholder="Domaines"
                width="w-full"
                color={color}
              />
            </div>
            <div className="mb-4 w-full">
              <SelectFilter
                id="department"
                options={options.departments}
                selectedOptions={values.department}
                onChange={(v) => onChange({ ...values, department: v })}
                placeholder="Départements"
                width="w-full"
                color={color}
              />
            </div>
            <div className="mb-4 w-full">
              <SelectFilter
                id="organization"
                options={options.organizations}
                selectedOptions={values.organization}
                onChange={(v) => onChange({ ...values, organization: v })}
                placeholder="Organisations"
                width="w-full"
                color={color}
              />
            </div>
            <div className="flex w-full flex-col gap-2">
              <button
                aria-label="Voir les missions"
                className="w-full border-none p-3 text-center text-sm text-white focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
                onClick={() => {
                  onShow(false);
                  plausible("Filters closed", { u: url });
                }}
                style={{ backgroundColor: color }}
              >
                Voir les missions
              </button>
              <button
                aria-label="Réinitialiser les filtres"
                className="w-full border-none bg-transparent p-3 text-center text-sm focus:outline-none focus-visible:ring focus-visible:ring-blue-800"
                style={{ color }}
                onClick={() => {
                  handleReset();
                  plausible("Filters reset", { u: url });
                }}
              >
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const DesktopFilters = ({ options, values, onChange, disabledLocation = false }) => {
  const { color } = useStore();
  return (
    <>
      <div className="w-[20%] pr-2">
        <LocationFilter selected={values.location} onChange={(l) => onChange({ ...values, location: l })} disabled={disabledLocation} color={color} />
      </div>
      <div className="w-[20%] px-2">
        <RemoteFilter
          id="remote"
          options={options.remote}
          selectedOptions={values.remote}
          onChange={(f) => onChange({ ...values, remote: f })}
          placeholder="Présentiel / Distance"
          color={color}
        />
      </div>
      <div className="w-[20%] px-2">
        <SelectFilter
          id="domain"
          options={options.domains}
          selectedOptions={values.domain}
          onChange={(v) => onChange({ ...values, domain: v })}
          placeholder="Domaines"
          color={color}
        />
      </div>
      <div className="w-[20%] px-2">
        <SelectFilter
          id="department"
          options={options.departments}
          selectedOptions={values.department}
          onChange={(v) => onChange({ ...values, department: v })}
          placeholder="Départements"
          color={color}
        />
      </div>
      <div className="w-[20%] pl-2">
        <SelectFilter
          id="organization"
          options={options.organizations}
          selectedOptions={values.organization}
          onChange={(v) => onChange({ ...values, organization: v })}
          placeholder="Organisations"
          position="right-0"
          color={color}
        />
      </div>
    </>
  );
};

const SelectFilter = ({ options, selectedOptions, onChange, id, placeholder = "Choissiez une option", position = "left-0", width = "w-80" }) => {
  const { url, color } = useStore();
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
    if (!selectedOptions) {
      return onChange([option]);
    }
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
        className={`flex h-[40px] w-full cursor-pointer items-center justify-between rounded-t-md border-b-2 border-[#3A3A3A] bg-[#EEE] p-3 focus:outline-none focus-visible:ring focus-visible:ring-blue-800 ${
          !selectedOptions?.length ? "text-[#666666]" : "text-[#161616]"
        }`}
      >
        <span className="max-w-60 truncate pr-3">
          {!selectedOptions || selectedOptions.some((o) => o === undefined)
            ? placeholder
            : selectedOptions.length > 0
              ? `${selectedOptions[0].label}${selectedOptions.length > 1 ? ` +${selectedOptions.length - 1}` : ""}`
              : placeholder}
        </span>
        {isOpen ? <RiArrowDownSLine className="rotate-180 transform text-xl" /> : <RiArrowDownSLine className="text-xl" />}
      </button>

      {isOpen && (
        <div className={`absolute ${position} z-50 ${width} bg-white text-base shadow-[0_0_12px_rgba(0,0,0,0.15)] focus:outline-none`}>
          <div className="p-2">
            <div className="flex w-full items-center justify-between border border-gray-300 p-2 focus:outline-none">
              <RiSearchLine className="text-[#929292]" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher"
                className="w-full rounded-lg pl-3 text-sm focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-60 w-full overflow-auto py-3">
            {!options?.filter((o) => o.label?.toLowerCase().includes(search.toLowerCase()))?.length ? (
              <div className="text-center text-sm">Aucune option disponible</div>
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
                        plausible(`Filter ${id} selected`, { props: { filter: o.label }, u: url });
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between py-2 pl-3 pr-4 text-sm hover:bg-gray-100`}
                    >
                      <div className="flex w-[90%] items-center">
                        <div className="text-sm">{isSelected ? <RiCheckboxFill style={{ height: "16px", width: "16px", color }} /> : <RiCheckboxBlankLine />}</div>
                        <span className="mx-2 block truncate text-sm font-normal text-[#161616]">{o.label}</span>
                      </div>
                      {o.count && <span className="text-neutral-grey-500 text-sm">{o.count}</span>}
                    </button>
                  );
                })
            )}
          </div>

          <div className="flex w-full items-center justify-between border-t border-gray-300 p-2">
            <button
              className={`text-sm text-[#3633A1] hover:underline`}
              onClick={() => {
                onChange([]);
                setIsOpen(false);
                plausible(`Filter ${id} erased`, { u: url });
              }}
              style={{ color }}
            >
              Réinitialiser
            </button>
            <button
              className={`p-2 text-sm text-white focus:outline-none ${!selectedOptions || selectedOptions.length === 0 ? "cursor-not-allowed opacity-50" : ""}`}
              style={{
                backgroundColor: color ? color : "",
              }}
              disabled={!selectedOptions || selectedOptions.length === 0}
              onClick={() => {
                setIsOpen(false);
                plausible(`Filters applied`, { u: url });
              }}
            >
              Appliquer
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
        className={`flex h-[40px] items-center justify-between rounded-t-md border-b-2 border-[#3A3A3A] bg-[#EEE] p-3 focus:outline-none focus-visible:ring focus-visible:ring-blue-800`}
      >
        <RiMapPin2Fill className="text-[#929292]" />
        {disabled ? (
          <input id="location" className="w-full min-w-[6rem] pl-3 opacity-75 ring-0 focus:outline-none focus:ring-0" value={selected?.label} disabled />
        ) : (
          <>
            <input
              id="location"
              aria-label="localisation"
              className={`w-full min-w-[6rem] bg-[#EEE] pl-3 ring-0 focus:outline-none focus:ring-0 ${!selected ? "text-[#666666] placeholder-[#666666]" : "text-[#161616]"}`}
              value={inputValue}
              placeholder="Localisation"
              onChange={handleInputChange}
            />
            {selected && (
              <button
                className="text-neutral-grey-700 text-sm"
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

      {isOpen && options.length > 0 && (
        <div className={`absolute z-50 mt-1 max-h-60 ${width} overflow-auto rounded-lg border border-[#DDDDDD] bg-white py-1 text-base focus:outline-none`}>
          {options.map((option) => (
            <div
              key={option.value}
              className="flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-gray-100"
              onClick={() => {
                onChange(option);
                setInputValue(option.label);
                setIsOpen(false);
                plausible("Location selected", { props: { location: option.label }, u: url });
              }}
            >
              <span className="block truncate text-sm font-normal">{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const RemoteFilter = ({ options, selectedOptions, onChange, id, placeholder = "Choissiez une option", position = "left-0", width = "w-80" }) => {
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
    if (!selectedOptions) {
      return onChange([option]);
    }
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
        className={`flex h-[40px] w-full cursor-pointer items-center justify-between rounded-t-md border-b-2 border-[#3A3A3A] bg-[#EEE] p-3 focus:outline-none focus-visible:ring focus-visible:ring-blue-800 ${
          !selectedOptions?.length ? "text-[#666666]" : "text-[#161616]"
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="max-w-60 truncate pr-3">
          {!selectedOptions || selectedOptions.some((o) => o === undefined)
            ? placeholder
            : selectedOptions.length > 0
              ? `${selectedOptions[0].label}${selectedOptions.length > 1 ? ` +${selectedOptions.length - 1}` : ""}`
              : placeholder}
        </span>
        {isOpen ? <RiArrowDownSLine className="rotate-180 transform text-xl" /> : <RiArrowDownSLine className="text-xl" />}
      </button>

      {isOpen && (
        <div className={`absolute ${position} z-50 ${width} bg-white text-base shadow-[0_0_12px_rgba(0,0,0,0.15)] focus:outline-none`}>
          <div className="max-h-60 w-full overflow-auto py-3">
            {options?.length === 0 ? (
              <div className="text-center text-sm">Aucune option disponible</div>
            ) : (
              options?.map((o) => {
                const isSelected = selectedOptions?.some((so) => so.value === o.value);
                return (
                  <button
                    key={o.value}
                    onClick={() => {
                      toggleOption(o);
                      plausible("Remote filter selected", { props: { remote: o.label }, u: url });
                    }}
                    className="flex w-full cursor-pointer items-center justify-between py-2 pl-3 pr-4 text-sm hover:bg-gray-100"
                  >
                    <div className="flex w-[90%] items-center">
                      <div className="text-sm">{isSelected ? <RiCheckboxFill style={{ height: "16px", width: "16px", color }} /> : <RiCheckboxBlankLine />}</div>
                      <span className="mx-2 block truncate text-sm font-normal">{o.label}</span>
                    </div>
                    {o.count && <span className="text-neutral-grey-500 text-sm">{o.count}</span>}
                  </button>
                );
              })
            )}
          </div>
          <div className="flex w-full items-center justify-between border-t border-gray-300 p-2">
            <button
              className="text-sm text-[#3633A1] hover:underline"
              onClick={() => {
                onChange([]);
                setIsOpen(false);
                plausible("Remote filter erased", { u: url });
              }}
              style={{ color }}
            >
              Réinitialiser
            </button>
            <button
              className={`p-2 text-sm text-white focus:outline-none ${!selectedOptions || selectedOptions.length === 0 ? "cursor-not-allowed opacity-50" : ""}`}
              style={{
                backgroundColor: color ? color : "",
              }}
              disabled={!selectedOptions || selectedOptions.length === 0}
              onClick={() => {
                setIsOpen(false);
                plausible(`Filters applied`, { u: url });
              }}
            >
              Appliquer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Filters;
