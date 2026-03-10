import Tooltip from "@/components/Tooltip";
import { useEffect, useState } from "react";
import { RiCloseFill, RiInformationLine } from "react-icons/ri";
import { Link } from "react-router-dom";

import JvaLogoPng from "@/assets/img/jva-logo.png";
import Loader from "@/components/Loader";
import Pie, { colors } from "@/components/Pie";
import SearchInput from "@/components/SearchInput";
import Select from "@/components/Select";
import Table from "@/components/Table";
import { DOMAINS } from "@/constants";
import { DEPARTMENT_LABELS, JVA_MODERATION_COMMENTS_LABELS, STATUS, STATUS_GRAPH_COLORS, STATUS_ICONS, STATUS_PLR } from "@/scenes/broadcast/moderation/components/Constants";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";

const COMMENTS_TABLE_HEADER = [{ title: "Motif de refus" }, { title: "Nombre", position: "center" }, { title: "Pourcentage", position: "center" }];

const MISSIONS_TABLE_HEADER = [{ title: "Mission", width: "30%" }, { title: "Organisation" }, { title: "Localisation" }, { title: "Postée le" }, { title: "Statut" }];

const FILTERS = {
  status: "Statut",
  domain: "Domaine",
  comment: "Motif de refus",
  organization: "Organisation",
  department: "Département",
  search: "Recherche",
};

const Moderation = () => {
  const { publisher } = useStore();
  const [data, setData] = useState();
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState();
  const [options, setOptions] = useState({
    status: [],
    comments: [],
    domains: [],
    departments: [],
    organizations: [],
  });
  const [filters, setFilters] = useState({
    status: "",
    comment: "",
    domain: "",
    department: "",
    organization: "",
    page: 1,
  });
  const pageSize = 25;

  useEffect(() => {
    const fetchData = async () => {
      const query = {
        publisherId: publisher.id,
        status: filters.status,
        comment: filters.comment,
        domain: filters.domain,
        department: filters.department,
        organizationName: filters.organization,
        search: filters.search,
        from: (filters.page - 1) * pageSize,
        size: pageSize,
      };

      try {
        const res = await api.post("/moderation/search", query);
        if (!res.ok) {
          throw res;
        }
        setData(res.data);

        setTotal(res.total);
        return;
      } catch (error) {
        captureError(error, { extra: { filters } });
      }
    };
    const fetchAggs = async () => {
      const query = {
        publisherId: publisher.id,
        status: filters.status,
        comment: filters.comment,
        domain: filters.domain,
        department: filters.department,
        organization: filters.organization,
        search: filters.search,
      };

      try {
        const res = await api.post("/moderation/aggs", query);
        if (!res.ok) {
          throw res;
        }
        setOptions(res.data);
        if (res.data) {
          buildStats(res.data);
        }
      } catch (error) {
        captureError(error, { extra: { filters } });
      }
    };

    fetchData();
    fetchAggs();
  }, [filters, publisher.id]);

  const buildStats = (options) => {
    const status = options.status.filter((s) => s.key !== undefined).map((s) => ({ key: STATUS_PLR[s.key], doc_count: s.doc_count, color: STATUS_GRAPH_COLORS[s.key] }));
    const refused = options.status.find((s) => s.key === "REFUSED")?.doc_count || 0;
    const comments = options.comments
      .filter((s) => s.key !== undefined)
      .map((s) => ({ key: JVA_MODERATION_COMMENTS_LABELS[s.key] || s.key, doc_count: s.doc_count, rate: s.doc_count / refused }));
    comments.sort((a, b) => b.rate - a.rate);
    setStats({ status, comments, refused });
  };

  if (!stats) {
    return (
      <div className="flex justify-center bg-white p-12">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-12 p-12">
      <title>API Engagement - Modération - Vos Missions</title>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Modération de JeVeuxAider.gouv.fr</h2>
          <p className="text-text-mention text-sm">
            Consultez les
            <a href="https://api-engagement.beta.gouv.fr/regles-de-moderation-de-jeveuxaider-gouv-fr/" target="_blank" className="text-text-mention ml-1 cursor-pointer underline">
              règles de modération
            </a>
          </p>
        </div>
        <img className="w-2/5" src={JvaLogoPng} alt="" aria-hidden="true" />
      </div>

      <div className="border-b border-b-gray-900 pb-8">
        <SearchInput value={filters.search} onChange={(search) => setFilters({ ...filters, search })} className="w-96" placeholder="Rechercher par mot-clé" />

        <div className="mt-4 flex flex-1 items-center gap-4">
          <Select
            options={options.status.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseigné" : STATUS[e.key], count: e.doc_count }))}
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.value })}
            placeholder="Statut"
          />
          <Select
            options={options.comments.map((e) => ({
              value: e.key === "" ? "none" : e.key,
              label: e.key === "" ? "Non renseigné" : JVA_MODERATION_COMMENTS_LABELS[e.key] || e.key,
              count: e.doc_count,
            }))}
            value={filters.comment}
            onChange={(e) => setFilters({ ...filters, comment: e.value })}
            placeholder="Motif de refus"
          />
          <Select
            options={options.domains.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseigné" : DOMAINS[e.key], count: e.doc_count }))}
            value={filters.domain}
            onChange={(e) => setFilters({ ...filters, domain: e.value })}
            placeholder="Domaine"
          />
          <Select
            options={options.departments.map((e) => ({
              value: e.key === "" ? "none" : e.key,
              label: e.key === "" ? "Non renseigné" : DEPARTMENT_LABELS[e.key],
              count: e.doc_count,
            }))}
            value={filters.department}
            onChange={(e) => setFilters({ ...filters, department: e.value })}
            placeholder="Département"
          />
          <Select
            options={options.organizations.map((e) => ({ value: e.key === "" ? "none" : e.key, label: e.key === "" ? "Non renseigné" : e.key, count: e.doc_count }))}
            value={filters.organization}
            onChange={(e) => setFilters({ ...filters, organization: e.value })}
            placeholder="Organisation"
          />
        </div>
      </div>

      {Object.keys(filters).filter((key) => filters[key] && key !== "page").length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.keys(filters)
            .filter((key) => filters[key] && key !== "page")
            .map((key, i) => {
              let label = filters[key] === "" ? "Non renseigné" : FILTERS[key] || key;

              if (key === "comment") {
                label = JVA_MODERATION_COMMENTS_LABELS[filters[key]] || filters[key];
              }
              if (key === "status") {
                label = STATUS[filters[key]];
              }
              if (key === "organization") {
                label = options.organizations.find((o) => o.key === filters[key])?.label || filters[key];
              }
              if (key === "department") {
                label = DEPARTMENT_LABELS[filters[key]];
              }
              if (key === "domain") {
                label = DOMAINS[filters[key]];
              }

              return (
                <div key={i} className="bg-blue-france-975 flex items-center gap-2 rounded p-2">
                  <p className="text-sm">{FILTERS[key] || key}:</p>
                  <p className="text-sm">{label}</p>
                  <button className="text-sm text-black" onClick={() => setFilters({ ...filters, [key]: "" })}>
                    <RiCloseFill aria-hidden="true" />
                  </button>
                </div>
              );
            })}
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        <div className="border-grey-border border p-4">
          <div className="flex items-start">
            <h2 className="flex-1 text-lg font-bold">Répartition des missions par statut</h2>
          </div>
          <div className="p-4">
            <Pie data={stats.status} backgroundColor={colors} legendPosition="right" />
          </div>
        </div>
        <div className="border-grey-border col-span-2 border p-4">
          <div className="flex items-start">
            <h2 className="flex-1 text-lg font-bold">Répartition des motifs de refus</h2>
          </div>
          {stats.refused === 0 ? (
            <div className="flex h-full items-center">
              <p className="ml-5 pb-10">
                <span aria-hidden="true">😎</span> Aucune mission n'a été refusée
              </p>
            </div>
          ) : (
            <div className="mt-6">
              <Table
                caption="Commentaires de modération"
                header={COMMENTS_TABLE_HEADER}
                total={stats.comments?.length || 0}
                pagination={false}
                auto
                className="max-h-64 overflow-y-auto"
              >
                {(stats.comments || []).map((item, i) => (
                  <tr key={i} className={`${i % 2 === 0 ? "bg-table-even" : "bg-table-odd"} table-row`}>
                    <td className="table-cell">{JVA_MODERATION_COMMENTS_LABELS[item.key] || item.key}</td>
                    <td className="table-cell text-center">{item.doc_count}</td>
                    <td className="table-cell text-center">{`${(item.rate * 100).toFixed(2)} %`}</td>
                  </tr>
                ))}
              </Table>
            </div>
          )}
        </div>
      </div>

      <div className="border-grey-border border p-6">
        <Table
          caption="Missions en modération"
          header={MISSIONS_TABLE_HEADER}
          total={total}
          loading={!data}
          page={filters.page}
          pageSize={pageSize}
          onPageChange={(page) => setFilters({ ...filters, page })}
          auto
        >
          {(data || []).map((item, i) => (
            <tr key={item.id} className={`${i % 2 === 0 ? "bg-table-even" : "bg-table-odd"} table-row`}>
              <td className="table-cell">
                <Link to={`/mission/${item.missionId}`} className="text-blue-france">
                  <p className="line-clamp-3">{item.missionTitle}</p>
                </Link>
              </td>
              <td className="table-cell">{item.missionOrganizationName}</td>
              <td className="table-cell">{`${item.missionCity || ""} ${item.missionDepartmentCode ? `(${item.missionDepartmentCode})` : ""}`}</td>
              <td className="table-cell">{item.missionPostedAt ? new Date(item.missionPostedAt).toLocaleDateString("fr") : ""}</td>
              <td className="table-cell">
                <div className="flex items-center text-lg">
                  <Tooltip
                    id={`${item.status}-${i}`}
                    ariaLabel={`Statut : ${STATUS[item.status] || item.status}`}
                    triggerClassName="text-lg"
                    tooltipClassName="text-xs"
                    content={STATUS[item.status] || item.status}
                  >
                    <span aria-hidden="true">{STATUS_ICONS[item.status]}</span>
                  </Tooltip>
                  {item.status === "REFUSED" && item.comment ? (
                    <Tooltip
                      ariaLabel="Voir le motif de refus"
                      triggerClassName="text-text-mention"
                      tooltipClassName="border-grey-border w-64 border bg-white p-4 text-sm shadow-lg"
                      content={JVA_MODERATION_COMMENTS_LABELS[item.comment] || item.comment}
                    >
                      <RiInformationLine className="text-text-mention" aria-hidden="true" />
                    </Tooltip>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
};

export default Moderation;
