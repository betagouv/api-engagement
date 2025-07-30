import { usePlausible } from "next-plausible";
import { useEffect, useState } from "react";
import { RiArrowDownSLine, RiArrowUpSLine } from "react-icons/ri";

import { DOMAINS } from "../config";
import useStore from "../utils/store";
import LocationFilter from "./LocationFilter";
import SelectFilter from "./SelectFilter";

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
        <LocationFilter selected={values.location} onChange={(l) => onChange({ ...values, location: l })} disabled={disabledLocation} width="w-full" />
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
              <SelectFilter
                id="remote"
                options={options.remote}
                selectedOptions={values.remote}
                onChange={(f) => onChange({ ...values, remote: f })}
                placeholder="Présentiel / Distance"
                width="w-full"
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
  return (
    <>
      <div className="w-[20%] pr-2">
        <LocationFilter selected={values.location} onChange={(l) => onChange({ ...values, location: l })} disabled={disabledLocation} />
      </div>
      <div className="w-[20%] px-2">
        <SelectFilter
          id="remote"
          options={options.remote}
          selectedOptions={values.remote}
          onChange={(f) => onChange({ ...values, remote: f })}
          placeholder="Présentiel / Distance"
        />
      </div>
      <div className="w-[20%] px-2">
        <SelectFilter id="domain" options={options.domains} selectedOptions={values.domain} onChange={(v) => onChange({ ...values, domain: v })} placeholder="Domaines" />
      </div>
      <div className="w-[20%] px-2">
        <SelectFilter
          id="department"
          options={options.departments}
          selectedOptions={values.department}
          onChange={(v) => onChange({ ...values, department: v })}
          placeholder="Départements"
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
          width="w-96"
        />
      </div>
    </>
  );
};

export default Filters;
