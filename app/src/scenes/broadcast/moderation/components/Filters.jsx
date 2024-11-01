import { RiCloseFill, RiSearchLine } from "react-icons/ri";

import ModerationManualIcon from "../../../../assets/svg/moderation-manual.svg";
import Select from "../../../../components/NewSelect";
import SearchSelect from "../../../../components/SearchSelect";
import STATUS, { DEPARTMENT_LABELS, STATUS_PLR } from "./Constants";

const Filters = ({ filters, onChange, options }) => {
  return (
    <div className="mx-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={ModerationManualIcon} className="h-14 w-14" allt="Modération automatique" />
          <h2 className="text-xl font-semibold text-black">Modération manuelle</h2>
        </div>
      </div>
      <div className="mb-4 flex w-full justify-start">
        <div className="flex w-[40%] overflow-hidden rounded-t border-b border-b-blue-dark">
          <div className="flex items-center w-full bg-gray-light px-3 py-2 text-sm">
            <input
              className="flex-1 bg-gray-light focus:outline-none"
              placeholder="Rechercher"
              value={(filters.search || "").toString()}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
            />
            <RiSearchLine className="text-disabled-grey-700" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 pb-4">
        <Select
          options={options.status.map((e) => ({ value: e.key, label: STATUS_PLR[e.key], count: e.doc_count }))}
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.value })}
          placeholder="Statut"
        />

        <Select
          options={options.publishers.map((e) => ({ value: e.key, label: e.label, count: e.doc_count }))}
          value={filters.publisher}
          onChange={(e) => onChange({ ...filters, publisher: e.value })}
          placeholder="Annonceur"
        />
        <Select
          options={options.domains.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseignée" : e.key, count: e.doc_count }))}
          value={filters.domain}
          onChange={(e) => onChange({ ...filters, domain: e.value })}
          placeholder="Domaine"
        />
        <SearchSelect
          placeholder="Organisation"
          options={options.organizations.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseignée" : e.key, count: e.doc_count }))}
          value={filters.organization}
          onChange={(e) => onChange({ ...filters, organization: e.value })}
          className="w-80 right-0"
        />
      </div>
      <div className="flex items-center gap-4 pb-6">
        <Select
          options={options.comments.map((e) => ({ value: e.key, label: e.key, count: e.doc_count }))}
          value={filters.comment}
          onChange={(e) => onChange({ ...filters, comment: e.value })}
          placeholder="Motif de refus"
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
        />
        <SearchSelect
          placeholder="Ville"
          options={options.cities.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseignée" : e.key, count: e.doc_count }))}
          value={filters.city}
          onChange={(e) => onChange({ ...filters, city: e.value })}
          className="w-80 right-0"
        />
        <Select
          options={options.activities.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseignée" : e.key, count: e.doc_count }))}
          value={filters.activity}
          onChange={(e) => onChange({ ...filters, activity: e.value })}
          placeholder="Activité"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Badge label="Statut" value={STATUS[filters.status]} onDelete={() => onChange({ ...filters, status: "" })} />
        <Badge label="Annonceur" value={options.publishers.find((p) => p.key === filters.publisher)?.label} onDelete={() => onChange({ ...filters, publisher: "" })} />
        <Badge label="Organisation" value={filters.organization} onDelete={() => onChange({ ...filters, organization: "" })} />
        <Badge
          label="Département"
          value={filters.department === "none" ? "Non renseigné" : DEPARTMENT_LABELS[filters.department]}
          onDelete={() => onChange({ ...filters, department: "" })}
        />
        <Badge label="Ville" value={filters.city === "none" ? "Non renseignée" : filters.city} onDelete={() => onChange({ ...filters, city: "" })} />
        <Badge label="Motif de refus" value={filters.comment} onDelete={() => onChange({ ...filters, comment: "" })} />
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
