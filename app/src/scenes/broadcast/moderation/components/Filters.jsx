import { useEffect, useState } from "react";
import { RiCloseFill } from "react-icons/ri";

import ModerationManualIcon from "../../../../assets/svg/moderation-manual.svg";
import Select from "../../../../components/NewSelect";
import SearchInput from "../../../../components/SearchInput";
import SearchSelect from "../../../../components/SearchSelect";
import api from "../../../../services/api";
import { captureError } from "../../../../services/error";
import useStore from "../../../../services/store";
import STATUS, { DEPARTMENT_LABELS, JVA_MODERATION_COMMENTS_LABELS, STATUS_PLR } from "./Constants";

const Filters = ({ filters, onChange, reload }) => {
  const { publisher } = useStore();
  const [options, setOptions] = useState({
    status: [],
    comments: [],
    publishers: [],
    activities: [],
    domains: [],
    departments: [],
    organizations: [],
    cities: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      setLoading(true);
      try {
        const query = {
          moderatorId: publisher._id,
          status: filters.status,
          comment: filters.comment,
          publisherId: filters.publisherId,
          city: filters.city,
          domain: filters.domain,
          department: filters.department,
          organization: filters.organization,
          activity: filters.activity,
          search: filters.search,
        };

        const res = await api.post("/moderation/aggs", query);

        if (!res.ok) throw res;
        setOptions(res.data);
      } catch (error) {
        captureError(error, "Une erreur est survenue");
      } finally {
        setLoading(false);
      }
    };
    fetchOptions();
  }, [filters, reload]);

  return (
    <div className="mx-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={ModerationManualIcon} className="h-14 w-14" allt="Modération automatique" />
          <h2 className="text-xl font-semibold text-black">Modération manuelle</h2>
        </div>
      </div>
      <div className="mb-4 flex w-full justify-start">
        <SearchInput value={filters.search} onChange={(e) => onChange({ ...filters, search: e })} placeholder="Rechercher" className="w-[40%]" />
      </div>
      <div className="flex items-center gap-4 pb-4">
        <Select
          options={options.status.map((e) => ({ value: e.key, label: STATUS_PLR[e.key], count: e.doc_count }))}
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.value })}
          placeholder="Statut"
          loading={loading}
        />

        <Select
          options={options.publishers.map((e) => ({ value: e.key, label: e.label, count: e.doc_count }))}
          value={filters.publisherId}
          onChange={(e) => onChange({ ...filters, publisherId: e.value })}
          placeholder="Annonceur"
          loading={loading}
        />
        <Select
          options={options.domains.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseignée" : e.key, count: e.doc_count }))}
          value={filters.domain}
          onChange={(e) => onChange({ ...filters, domain: e.value })}
          placeholder="Domaine"
          loading={loading}
        />
        <SearchSelect
          placeholder="Organisation"
          options={options.organizations.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseignée" : e.key, count: e.doc_count }))}
          value={filters.organization}
          onChange={(e) => onChange({ ...filters, organization: e.value })}
          className="w-96 right-0"
          loading={loading}
        />
      </div>
      <div className="flex items-center gap-4 pb-6">
        <Select
          options={options.comments.map((e) => ({ value: e.key, label: JVA_MODERATION_COMMENTS_LABELS[e.key] || e.key, count: e.doc_count }))}
          value={filters.comment}
          onChange={(e) => onChange({ ...filters, comment: e.value })}
          placeholder="Motif de refus"
          className="w-[612px]"
          loading={loading}
        />
        <Select
          options={options.departments.map((e) => ({
            value: e.key === "" ? "none" : e.key,
            label: e.key === "" ? "Non renseigné" : DEPARTMENT_LABELS[e.key],
            count: e.doc_count,
          }))}
          value={filters.department}
          onChange={(e) => onChange({ ...filters, department: e.value })}
          placeholder="Département"
          loading={loading}
        />
        <SearchSelect
          placeholder="Ville"
          options={options.cities.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseignée" : e.key, count: e.doc_count }))}
          value={filters.city}
          onChange={(e) => onChange({ ...filters, city: e.value })}
          className="w-80 right-0"
          loading={loading}
        />
        <Select
          options={options.activities.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseignée" : e.key, count: e.doc_count }))}
          value={filters.activity}
          onChange={(e) => onChange({ ...filters, activity: e.value })}
          placeholder="Activité"
          className="w-80 right-0"
          loading={loading}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Badge label="Statut" value={STATUS[filters.status]} onDelete={() => onChange({ ...filters, status: "" })} />
        <Badge label="Annonceur" value={options.publishers.find((p) => p.key === filters.publisherId)?.label} onDelete={() => onChange({ ...filters, publisherId: "" })} />
        <Badge label="Organisation" value={filters.organization} onDelete={() => onChange({ ...filters, organization: "" })} />
        <Badge
          label="Département"
          value={filters.department === "none" ? "Non renseigné" : DEPARTMENT_LABELS[filters.department]}
          onDelete={() => onChange({ ...filters, department: "" })}
        />
        <Badge label="Ville" value={filters.city === "none" ? "Non renseignée" : filters.city} onDelete={() => onChange({ ...filters, city: "" })} />
        <Badge label="Motif de refus" value={JVA_MODERATION_COMMENTS_LABELS[filters.comment] || filters.comment} onDelete={() => onChange({ ...filters, comment: "" })} />
        <Badge label="Domaine" value={filters.domain} onDelete={() => onChange({ ...filters, domain: "" })} />
        <Badge label="Activité" value={filters.activity === "none" ? "Non renseignée" : filters.activity} onDelete={() => onChange({ ...filters, activity: "" })} />
        <Badge label="Recherche" value={filters.search} onDelete={() => onChange({ ...filters, search: "" })} />
      </div>
    </div>
  );
};

const Badge = ({ label, value, onDelete }) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 rounded bg-blue-light p-2">
      <p className="text-sm">{label}:</p>
      <p className="text-sm">{value}</p>
      <button className="text-sm text-black" onClick={onDelete}>
        <RiCloseFill />
      </button>
    </div>
  );
};

export default Filters;
