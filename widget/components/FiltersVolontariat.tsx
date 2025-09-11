import { usePlausible } from "next-plausible";
import { useEffect, useRef, useState } from "react";
import { RiArrowDownSLine, RiArrowUpSLine } from "react-icons/ri";

import "react-day-picker/dist/style.css";
import { ACCESSIBILITIES, ACTIONS, BENEFICIARIES, DOMAINS, MINORS, SCHEDULES } from "../config";
import { AggregationData, ApiResponse, FilterOptions, Filters, Widget } from "../types";
import useStore from "../utils/store";
import DateFilter from "./DateFilter";
import DurationFilter from "./DurationFilter";
import LocationFilter from "./LocationFilter";
import SelectFilter from "./SelectFilter";

const getAPI = async (path: string): Promise<ApiResponse<AggregationData>> => {
  const response = await fetch(path, { method: "GET" });

  if (!response.ok) {
    throw response;
  }
  return response.json();
};

interface FiltersVolontariatProps {
  widget: Widget;
  apiUrl: string;
  values: Filters;
  onChange: (filters: Partial<Filters>) => void;
  show: boolean;
  onShow: (show: boolean) => void;
}

const FiltersVolontariat = ({ widget, apiUrl, values, onChange, show, onShow }: FiltersVolontariatProps) => {
  const { mobile } = useStore();
  const [options, setOptions] = useState<FilterOptions>({
    accessibility: [],
    action: [],
    beneficiary: [],
    country: [],
    domain: [],
    minor: [],
    schedule: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const searchParams = new URLSearchParams();

        if (values.accessibility && values.accessibility.length) {
          values.accessibility.forEach((o) => searchParams.append("accessibility", o.value.toString()));
        }
        if (values.action && values.action.length) {
          values.action.forEach((o) => searchParams.append("action", o.value.toString()));
        }
        if (values.beneficiary && values.beneficiary.length) {
          values.beneficiary.forEach((o) => searchParams.append("beneficiary", o.value.toString()));
        }
        if (values.country && values.country.length) {
          values.country.forEach((o) => searchParams.append("country", o.value.toString()));
        }
        if (values.domain && values.domain.length) {
          values.domain.forEach((o) => searchParams.append("domain", o.value.toString()));
        }
        if (values.duration) {
          searchParams.append("duration", values.duration.value.toString());
        }
        if (values.minor && values.minor.length) {
          values.minor.forEach((o) => searchParams.append("minor", o.value.toString()));
        }
        if (values.schedule && values.schedule.length) {
          values.schedule.forEach((o) => searchParams.append("schedule", o.value.toString()));
        }
        if (values.start) {
          searchParams.append("start", values.start.value.toISOString());
        }
        if (values.location && values.location.lat && values.location.lon) {
          searchParams.append("lat", values.location.lat.toString());
          searchParams.append("lon", values.location.lon.toString());
        }
        ["accessibility", "action", "beneficiary", "country", "domain", "minor", "schedule"].forEach((key) => searchParams.append("aggs", key));

        const { ok, data } = await getAPI(`${apiUrl}/iframe/${widget._id}/aggs?${searchParams.toString()}`);

        if (!ok) {
          throw Error("Error fetching aggs");
        }
        const france = data.country.reduce((acc, c) => acc + (c.key === "FR" ? c.doc_count : 0), 0);
        const abroad = data.country.reduce((acc, c) => acc + (c.key !== "FR" ? c.doc_count : 0), 0);
        const country = [];
        country.push({ value: "FR", count: france, label: "France" });
        country.push({ value: "NOT_FR", count: abroad, label: "Etranger" });

        const newOptions: FilterOptions = {
          accessibility: data.accessibility.map((b) => ({ value: b.key, count: b.doc_count, label: ACCESSIBILITIES[b.key] || b.key })),
          action: data.action.map((b) => ({ value: b.key, count: b.doc_count, label: ACTIONS[b.key] || b.key })),
          beneficiary: data.beneficiary.map((b) => ({ value: b.key, count: b.doc_count, label: BENEFICIARIES[b.key] || b.key })),
          country,
          domain: data.domain.map((b) => ({
            value: b.key,
            count: b.doc_count,
            label: DOMAINS[b.key] ? DOMAINS[b.key].label : b.key,
          })),
          minor: data.minor.map((b) => ({ value: b.key, count: b.doc_count, label: MINORS[b.key] || b.key })),
          schedule: data.schedule.map((b) => ({ value: b.key, count: b.doc_count, label: SCHEDULES[b.key] || b.key })),
        };
        setOptions(newOptions);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, [widget._id, values, apiUrl]);

  if (mobile) {
    return (
      <div className="w-full flex flex-col items-center gap-2">
        <MobileFiltersVolontariat
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
    <div className="w-full mb-2">
      <DesktopFiltersVolontariat options={options} values={values} onChange={(v) => onChange({ ...values, ...v })} disabledLocation={!!widget.location} />
    </div>
  );
};

interface MobileFiltersVolontariatProps {
  options: FilterOptions;
  values: Filters;
  onChange: (filters: Partial<Filters>) => void;
  show: boolean;
  onShow: (show: boolean) => void;
  disabledLocation?: boolean;
}

const MobileFiltersVolontariat = ({ options, values, onChange, show, onShow, disabledLocation = false }: MobileFiltersVolontariatProps) => {
  const { url, color } = useStore();

  const plausible = usePlausible();
  if (!Object.keys(options).length) {
    return null;
  }

  const handleReset = () => {
    onChange({
      accessibility: [],
      action: [],
      beneficiary: [],
      country: [],
      domain: [],
      minor: [],
      schedule: [],
      duration: null,
      location: null,
      start: null,
      page: 1,
    });
  };

  return (
    <>
      <div className="w-full">
        <LocationFilter selected={values.location} onChange={(l) => onChange({ ...values, location: l })} disabled={disabledLocation} width="w-full" />
      </div>
      <div className="w-full border-y border-[#DDD]">
        <button
          className="flex h-[40px] items-center justify-between w-full bg-white focus:outline-none focus-visible:ring focus-visible:ring-[#000091] px-4"
          onClick={() => {
            onShow(!show);
            plausible(show ? "Filters closed" : "Filters opened", { u: url || undefined });
          }}
        >
          Filtrer les missions
          {show ? <RiArrowUpSLine className="text-xl" /> : <RiArrowDownSLine className="font-semibold text-xl" />}
        </button>

        {show && (
          <div className="w-full flex flex-col mt-4 gap-4">
            <div className="w-full">
              <DateFilter selected={values.start || null} onChange={(f) => onChange({ ...values, start: f })} width="w-full" />
            </div>
            <div className="w-full">
              <DurationFilter selected={values.duration || null} onChange={(v) => onChange({ ...values, duration: v })} width="w-full" />
            </div>
            <div className="w-full">
              <SelectFilter
                id="domain"
                options={options.domain || []}
                selectedOptions={values.domain}
                onChange={(v) => onChange({ ...values, domain: v })}
                placeholder="Domaines"
                width="w-full"
              />
            </div>
            <div className="w-full ">
              <SelectFilter
                id="schedule"
                options={options.schedule || []}
                selectedOptions={values.schedule || []}
                onChange={(v) => onChange({ ...values, schedule: v })}
                placeholder="Horaires"
                width="w-full"
              />
            </div>
            <div className="w-full">
              <SelectFilter
                id="accessibility"
                options={options.accessibility || []}
                selectedOptions={values.accessibility || []}
                onChange={(v) => onChange({ ...values, accessibility: v })}
                placeholder="Accessibilité"
                width="w-full"
              />
            </div>
            <div className="w-full">
              <SelectFilter
                id="beneficiary"
                options={options.beneficiary || []}
                selectedOptions={values.beneficiary || []}
                onChange={(v) => onChange({ ...values, beneficiary: v })}
                placeholder="Public bénéficiaire"
                width="w-full"
              />
            </div>
            <div className="w-full">
              <SelectFilter
                id="action"
                options={options.action || []}
                selectedOptions={values.action || []}
                onChange={(v) => onChange({ ...values, action: v })}
                placeholder="Actions clés"
                width="w-full"
              />
            </div>
            <div className="w-full">
              <SelectFilter
                id="country"
                options={options.country || []}
                selectedOptions={values.country || []}
                onChange={(v) => onChange({ ...values, country: v })}
                placeholder="France / Etranger"
                width="w-full"
              />
            </div>
            <button
              aria-label="Voir les missions"
              className="w-full p-3 text-center border-none bg-black text-white focus:outline-none focus-visible:ring focus-visible:ring-[#000091] cursor-pointer"
              onClick={() => {
                onShow(false);
                plausible("Filters closed", { u: url || undefined });
              }}
              style={{
                backgroundColor: color,
                color: "white",
              }}
            >
              Voir les missions
            </button>
            <button
              className="w-full cursor-pointer p-3 text-center bg-transparent focus:outline-none focus-visible:ring focus-visible:ring-[#000091]"
              onClick={() => {
                handleReset();
                plausible("Filters reset", { u: url || undefined });
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

interface DesktopFiltersVolontariatProps {
  options: FilterOptions;
  values: Filters;
  onChange: (filters: Partial<Filters>) => void;
  disabledLocation?: boolean;
}

const DesktopFiltersVolontariat = ({ options, values, onChange, disabledLocation = false }: DesktopFiltersVolontariatProps) => {
  const { url, color } = useStore();
  const plausible = usePlausible();
  const [moreFilters, setMoreFilters] = useState(false);
  const missionsAbroad = useRef<boolean | null>(null);

  useEffect(() => {
    if (missionsAbroad.current === null && Array.isArray(options.country)) {
      missionsAbroad.current = options.country.some((o) => o.value === "NOT_FR" && (o.count || 0) > 0);
    }
  }, [options.country]);

  return (
    <div className="flex-1">
      <div className="grid grid-cols-5 gap-4 h-10">
        <LocationFilter selected={values.location} onChange={(l) => onChange({ ...values, location: l })} disabled={disabledLocation} />
        <DateFilter selected={values.start || null} onChange={(f) => onChange({ ...values, start: f })} />
        <DurationFilter selected={values.duration || null} onChange={(v) => onChange({ ...values, duration: v })} />
        <SelectFilter id="domain" options={options.domain || []} selectedOptions={values.domain} onChange={(v) => onChange({ ...values, domain: v })} placeholder="Thèmes" />
        {moreFilters ? (
          <SelectFilter
            id="minor"
            options={options.minor || []}
            selectedOptions={values.minor || []}
            onChange={(v) => onChange({ ...values, minor: v })}
            placeholder="Accès aux mineurs"
            position="right-0"
          />
        ) : (
          <button
            aria-label="plus de filtres"
            className="cursor-pointer border truncate w-full bg-white border-[#DDDDDD] py-2 px-4 h-[40px] focus:outline-none focus-visible:ring focus-visible:ring-[#000091] font-medium"
            onClick={() => {
              setMoreFilters(true);
              plausible("More filters", { u: url || undefined });
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
            selectedOptions={values.schedule || []}
            onChange={(v) => onChange({ ...values, schedule: v })}
            placeholder="Horaires"
          />
          <SelectFilter
            id="accessibility"
            options={options.accessibility || []}
            selectedOptions={values.accessibility || []}
            onChange={(v) => onChange({ ...values, accessibility: v })}
            placeholder="Accessibilité"
            width="w-96"
          />
          <SelectFilter
            id="beneficiary"
            options={options.beneficiary || []}
            selectedOptions={values.beneficiary || []}
            onChange={(v) => onChange({ ...values, beneficiary: v })}
            placeholder="Public bénéficiaire"
          />
          <SelectFilter
            id="action"
            options={options.action || []}
            selectedOptions={values.action || []}
            onChange={(v) => onChange({ ...values, action: v })}
            placeholder="Actions clés"
          />
          {missionsAbroad.current && (
            <SelectFilter
              id="country"
              options={options.country || []}
              selectedOptions={values.country || []}
              onChange={(v) => onChange({ ...values, country: v })}
              placeholder="France / Etranger"
              position="right-0"
            />
          )}

          <button
            aria-label="moins de filtres"
            className="border truncate w-full bg-white border-[#DDDDDD] py-2 px-4 h-[40px] focus:outline-none focus-visible:ring focus-visible:ring-[#000091] font-medium"
            onClick={() => {
              setMoreFilters(false);
              plausible("Less filters", { u: url || undefined });
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

export default FiltersVolontariat;
