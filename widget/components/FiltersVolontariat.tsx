import { usePlausible } from "next-plausible";
import { useEffect, useMemo, useRef, useState } from "react";
import { RiArrowDownSLine, RiArrowUpSLine } from "react-icons/ri";

import { ACCESSIBILITIES, ACTIONS, BENEFICIARIES, DOMAINS, MINORS, SCHEDULES } from "@/config";
import { FilterOptions, Filters, MissionBrowseFacets, Widget } from "@/types";
import useStore from "@/utils/store";
import ComboboxFilter from "./ComboxFilter";
import DateFilter from "./DateFilter";
import LocationFilter from "./LocationFilter";
import SelectFilter from "./SelectFilter";

interface FiltersVolontariatProps {
  widget: Widget;
  facets: MissionBrowseFacets;
  values: Filters;
  total: number;
  onChange: (filters: Partial<Filters>) => void;
  show: boolean;
  onShow: (show: boolean) => void;
}

const hasFilters = (filters: Filters, disabledLocation: boolean) => {
  return (
    filters.accessibility?.value ||
    filters.duration?.value ||
    filters.minor?.value ||
    filters.schedule?.value ||
    filters.action?.length ||
    filters.beneficiary?.length ||
    filters.country?.length ||
    filters.domain?.length ||
    filters.start?.value ||
    (filters.location && !disabledLocation)
  );
};

const FiltersVolontariat = ({ widget, facets, values, total, onChange, show, onShow }: FiltersVolontariatProps) => {
  const { mobile, url, color } = useStore();
  const plausible = usePlausible();
  const options = useMemo<FilterOptions>(() => {
    const countries = facets.country ?? [];
    const france = countries.reduce((total, bucket) => total + (bucket.key === "FR" ? bucket.count : 0), 0);
    const abroad = countries.reduce((total, bucket) => total + (bucket.key !== "FR" ? bucket.count : 0), 0);

    return {
      accessibility: (facets.accessibility ?? []).map((bucket) => ({ value: bucket.key, count: bucket.count, label: ACCESSIBILITIES[bucket.key] || bucket.key })),
      action: (facets.action ?? []).map((bucket) => ({ value: bucket.key, count: bucket.count, label: ACTIONS[bucket.key] || bucket.key })),
      beneficiary: (facets.beneficiary ?? []).map((bucket) => ({ value: bucket.key, count: bucket.count, label: BENEFICIARIES[bucket.key] || bucket.key })),
      country: [
        { value: "FR", count: france, label: "France" },
        { value: "NOT_FR", count: abroad, label: "Etranger" },
      ],
      domain: (facets.domain ?? []).map((bucket) => ({
        value: bucket.key,
        count: bucket.count,
        label: DOMAINS[bucket.key] ? DOMAINS[bucket.key].label : bucket.key,
      })),
      minor: (facets.minor ?? []).map((bucket) => ({ value: bucket.key, count: bucket.count, label: MINORS[bucket.key] || bucket.key })),
      schedule: (facets.schedule ?? []).map((bucket) => ({ value: bucket.key, count: bucket.count, label: SCHEDULES[bucket.key] || bucket.key })),
    };
  }, [facets]);

  const handleReset = () => {
    onChange({
      domain: [],
      location: widget.location || null,
      page: 1,
      start: null,
      duration: null,
      schedule: null,
      minor: null,
      accessibility: null,
      action: [],
      beneficiary: [],
      country: [],
    });
    plausible("Filters reset", { u: url || undefined });
  };

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
          onReset={handleReset}
        />
      </div>
    );
  }

  return (
    <div className={`w-full ${mobile ? "flex flex-col items-center gap-2" : ""}`}>
      <DesktopFiltersVolontariat total={total} options={options} values={values} onChange={(v) => onChange({ ...values, ...v })} disabledLocation={!!widget.location} />
      <div className="flex justify-between items-center mt-8">
        <p className="text-base text-[#666666]">{total > 1 ? `${total.toLocaleString("fr")} missions` : `${total} mission`}</p>
        {hasFilters(values, !!widget.location) && (
          <button className="text-base font-medium underline cursor-pointer hover:no-underline" onClick={handleReset} style={{ color }}>
            Réinitialiser
          </button>
        )}
      </div>
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
  onReset: () => void;
}

const MobileFiltersVolontariat = ({ options, values, onChange, show, onShow, onReset, disabledLocation = false }: MobileFiltersVolontariatProps) => {
  const { url, color } = useStore();
  const plausible = usePlausible();

  if (!Object.keys(options).length) {
    return null;
  }

  return (
    <>
      <div className="w-full">
        <LocationFilter selected={values.location} onChange={(l) => onChange({ ...values, location: l })} disabled={disabledLocation} className="w-full" />
      </div>
      <div className="w-full border-y border-[#DDDDDD]">
        <button
          className="flex h-[40px] items-center justify-between w-full bg-white focus:outline-2 focus:outline-[#0a76f6] focus:outline-offset-2 px-4"
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
              <SelectFilter
                id="duration"
                options={[
                  { label: "6 mois", value: "6" },
                  { label: "7 mois", value: "7" },
                  { label: "8 mois", value: "8" },
                  { label: "9 mois", value: "9" },
                  { label: "10 mois", value: "10" },
                  { label: "11 mois", value: "11" },
                  { label: "12 mois", value: "12" },
                ]}
                value={values.duration || null}
                onChange={(v) => onChange({ ...values, duration: v })}
                placeholder="Durée maximale"
              />
            </div>
            <div className="w-full">
              <ComboboxFilter
                id="domain"
                options={options.domain || []}
                values={values.domain || []}
                onChange={(v) => onChange({ ...values, domain: v })}
                placeholder="Thèmes"
                className="w-full"
              />
            </div>
            <div className="w-full ">
              <SelectFilter
                id="schedule"
                options={options.schedule || []}
                value={values.schedule || null}
                onChange={(v) => onChange({ ...values, schedule: v })}
                placeholder="Horaires"
                className="w-full"
              />
            </div>
            <div className="w-full">
              <SelectFilter
                id="accessibility"
                options={options.accessibility || []}
                value={values.accessibility || null}
                onChange={(v) => onChange({ ...values, accessibility: v })}
                placeholder="Accessibilité"
                className="w-full"
              />
            </div>
            <div className="w-full">
              <ComboboxFilter
                id="beneficiary"
                options={options.beneficiary || []}
                values={values.beneficiary || []}
                onChange={(v) => onChange({ ...values, beneficiary: v })}
                placeholder="Public bénéficiaire"
                className="w-full"
              />
            </div>
            <div className="w-full">
              <ComboboxFilter
                id="action"
                options={options.action || []}
                values={values.action || []}
                onChange={(v) => onChange({ ...values, action: v })}
                placeholder="Actions clés"
                className="w-full"
              />
            </div>
            <div className="w-full">
              <ComboboxFilter
                id="country"
                options={options.country || []}
                values={values.country || []}
                onChange={(v) => onChange({ ...values, country: v })}
                placeholder="France / Etranger"
                className="w-full"
              />
            </div>
            <button
              aria-label="Voir les missions"
              className="w-full p-3 text-center border-none bg-black text-white focus:outline-2 focus:outline-[#0a76f6] focus:outline-offset-2 cursor-pointer"
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
              className="w-full cursor-pointer p-3 text-center bg-transparent focus:outline-2 focus:outline-[#0a76f6] focus:outline-offset-2"
              onClick={onReset}
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
  total: number;
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

  const handleReset = () => {
    onChange({
      domain: [],
      location: null,
      page: 1,
      size: 40,
      start: null,
      duration: null,
      schedule: null,
      minor: null,
      accessibility: null,
      action: [],
      beneficiary: [],
      country: [],
    });
  };

  return (
    <div className="flex-1">
      <div className="grid grid-cols-5 gap-4 h-10">
        <LocationFilter selected={values.location} onChange={(l) => onChange({ ...values, location: l })} disabled={disabledLocation} />
        <DateFilter selected={values.start || null} onChange={(f) => onChange({ ...values, start: f })} />
        <SelectFilter
          id="duration"
          options={[
            { label: "6 mois", value: "6" },
            { label: "7 mois", value: "7" },
            { label: "8 mois", value: "8" },
            { label: "9 mois", value: "9" },
            { label: "10 mois", value: "10" },
            { label: "11 mois", value: "11" },
            { label: "12 mois", value: "12" },
          ]}
          value={values.duration || null}
          onChange={(v) => onChange({ ...values, duration: v })}
          placeholder="Durée maximale"
        />

        <ComboboxFilter id="domain" options={options.domain || []} values={values.domain || []} onChange={(v) => onChange({ ...values, domain: v })} placeholder="Thèmes" />

        {moreFilters ? (
          <SelectFilter
            id="minor"
            options={options.minor || []}
            value={values.minor || null}
            onChange={(v) => onChange({ ...values, minor: v })}
            placeholder="Accès aux mineurs"
            position="right-0"
          />
        ) : (
          <button
            aria-label="plus de filtres"
            className="cursor-pointer border truncate w-full bg-white border-[#DDDDDD] py-2 px-4 h-[40px] focus:outline-2 focus:outline-[#0a76f6] focus:outline-offset-2 font-medium"
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
            value={values.schedule || null}
            onChange={(v) => onChange({ ...values, schedule: v })}
            placeholder="Horaires"
          />
          <SelectFilter
            id="accessibility"
            options={options.accessibility || []}
            value={values.accessibility || null}
            onChange={(v) => onChange({ ...values, accessibility: v })}
            placeholder="Accessibilité"
            className="w-96"
          />
          <ComboboxFilter
            id="beneficiary"
            options={options.beneficiary || []}
            values={values.beneficiary || []}
            onChange={(v) => onChange({ ...values, beneficiary: v })}
            placeholder="Public bénéficiaire"
          />
          <ComboboxFilter id="action" options={options.action || []} values={values.action || []} onChange={(v) => onChange({ ...values, action: v })} placeholder="Actions clés" />
          {missionsAbroad.current && (
            <ComboboxFilter
              id="country"
              options={options.country || []}
              values={values.country || []}
              onChange={(v) => onChange({ ...values, country: v })}
              placeholder="France / Etranger"
              position="right-0"
            />
          )}

          <button
            aria-label="moins de filtres"
            className="cursor-pointer border truncate w-full bg-white border-[#DDDDDD] py-2 px-4 h-[40px] focus:outline-2 focus:outline-[#0a76f6] focus:outline-offset-2 font-medium"
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
