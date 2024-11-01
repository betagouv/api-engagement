import { useEffect, useState } from "react";
import { RiArrowLeftLine, RiCloseFill, RiInformationLine } from "react-icons/ri";
import { Link, useParams } from "react-router-dom";
import { Tooltip } from "react-tooltip";

import Loader from "../../components/Loader";
import Select from "../../components/NewSelect";
import Pie, { colors } from "../../components/Pie";
import SearchInput from "../../components/SearchInput";
import { Table, TablePaginator } from "../../components/Table";
import { DOMAINS } from "../../constants";
import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";
import { DEPARTMENT_LABELS, STATUS, STATUS_GRAPH_COLORS, STATUS_ICONS, STATUS_PLR } from "../broadcast/moderation/components/Constants";

const STATUS_COMMENT = [
  "La mission a déjà été publiée sur JeVeuxAider.gouv.fr",
  "Le contenu est insuffisant / non qualitatif",
  "La date de la mission n’est pas compatible avec le recrutement de bénévoles",
  "La mission ne respecte pas la charte de la Réserve Civique",
  "L'organisation est déjà inscrite sur JeVeuxAider.gouv.fr",
  "L’organisation n’est pas conforme à la charte de la Réserve Civique",
  "Les informations sont insuffisantes pour modérer l’organisation",
  "La mission est refusée car la date de création est trop ancienne (> 6 mois)",
];

const FILTERS = {
  status: "Statut",
  domain: "Domaine",
  comment: "Motif de refus",
  organization: "Organisation",
  department: "Département",
  search: "Recherche",
};

const Moderation = () => {
  const { id: moderatorId } = useParams();
  const { publisher } = useStore();
  const [moderator, setModerator] = useState();
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
      try {
        const res = await api.get(`/publisher/${moderatorId}`);
        if (!res.ok) throw res;
        setModerator(res.publisher);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des informations du modérateur");
      }
    };

    fetchData();
  }, [moderatorId]);

  useEffect(() => {
    const fetchData = async () => {
      const timeout = setTimeout(async () => {
        const query = {
          moderatorId,
          publisherId: publisher._id,
          status: filters.status?.key,
          comment: filters.comment?.key,
          domain: filters.domain?.key,
          department: filters.department?.key,
          organization: filters.organization?.key,
          search: filters.search,
          from: (filters.page - 1) * pageSize,
          size: pageSize,
        };

        try {
          const res = await api.post("/moderation/search", query);
          if (!res.ok) throw res;
          setData(res.data);
          setOptions(res.aggs);

          setTotal(res.total);
          buildStats(res.aggs);
          return;
        } catch (error) {
          captureError(error, "Erreur lors de la récupération des missions");
        }
      }, 500);

      return () => clearTimeout(timeout);
    };

    fetchData();
  }, [filters, moderatorId, publisher._id]);

  const buildStats = (options) => {
    const status = options.status.filter((s) => s.key !== undefined).map((s) => ({ key: STATUS_PLR[s.key], doc_count: s.doc_count, color: STATUS_GRAPH_COLORS[s.key] }));
    const refused = options.status.find((s) => s.key === "REFUSED")?.doc_count || 0;
    const comments = [];
    options.comments.forEach((s) => {
      if (STATUS_COMMENT.includes(s.key)) comments.push({ ...s, rate: s.doc_count / refused });
    });
    comments.sort((a, b) => b.rate - a.rate);
    setStats({ status, comments, refused });
  };

  if (!moderator || !stats)
    return (
      <div className="bg-white p-12 flex justify-center">
        <Loader />
      </div>
    );

  return (
    <div className="space-y-12 p-12">
      <div className="mb-6 flex items-center justify-between">
        <Link className="empty-button flex w-56 items-center" to="/my-missions/partners">
          <RiArrowLeftLine className="mr-2" />
          Retour aux partenaires
        </Link>
        <img className="w-1/5" src={moderator.logo} />
      </div>

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Modération de {moderator.name}</h2>
          <p className="text-sm text-gray-dark">
            Consultez les
            <a href={moderator.moderatorLink} target="_blank" className="ml-1 cursor-pointer text-gray-dark underline">
              règles de modération du partenaire
            </a>
          </p>
        </div>
        <SearchInput value={filters.search} onChange={(search) => setFilters({ ...filters, search })} className="w-1/4" placeholder="Rechercher par mot-clé" />
      </div>

      <div className="flex items-center gap-4 border-b border-b-gray-border pb-6">
        <p className="font-bold">Filtrer les résultats</p>

        <div className="flex items-center gap-4 flex-1">
          <Select
            options={options.status.map((e) => ({ value: e.key, label: STATUS[e.key], count: e.doc_count }))}
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.value })}
            placeholder="Statut"
          />
          <Select
            options={options.comments.map((e) => ({ value: e.key, label: e.key, count: e.doc_count }))}
            value={filters.comment}
            onChange={(e) => setFilters({ ...filters, comment: e.value })}
            placeholder="Motif de refus"
          />
          <Select
            options={options.domains.map((e) => ({ value: e.key, label: DOMAINS[e.key], count: e.doc_count }))}
            value={filters.domain}
            onChange={(e) => setFilters({ ...filters, domain: e.value })}
            placeholder="Domaine"
          />
          <Select
            options={options.departments.map((e) => ({ value: e.key, label: DEPARTMENT_LABELS[e.key], count: e.doc_count }))}
            value={filters.department}
            onChange={(e) => setFilters({ ...filters, department: e.value })}
            placeholder="Département"
          />
          <Select
            options={options.organizations.map((e) => ({ value: e.key, label: e.key, count: e.doc_count }))}
            value={filters.organization}
            onChange={(e) => setFilters({ ...filters, organization: e.value })}
            placeholder="Organisation"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {Object.keys(filters).filter((key) => filters[key] && key !== "page").length > 0 &&
          Object.keys(filters)
            .filter((key) => filters[key] && key !== "page")
            .map((key, i) => {
              return (
                <div key={i} className="flex items-center gap-2 rounded bg-blue-light p-2">
                  <p className="text-sm">{FILTERS[key] || key}:</p>
                  <p className="text-sm">{filters[key].label || filters[key]}</p>
                  <button className="text-sm text-black" onClick={() => setFilters({ ...filters, [key]: "" })}>
                    <RiCloseFill />
                  </button>
                </div>
              );
            })}
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="border border-gray-border p-4">
          <div className="flex items-start">
            <h2 className="flex-1 text-lg">Répartition des missions par statut</h2>
          </div>
          <div className="p-4">
            <Pie data={stats.status} backgroundColor={colors} legendPosition="right" />
          </div>
        </div>
        <div className="col-span-2 border border-gray-border p-4">
          <div className="flex items-start">
            <h2 className="flex-1 text-lg">Répartition des motifs de refus</h2>
          </div>
          {stats.refused === 0 ? (
            <div className="flex h-full items-center">
              <p className="ml-5 pb-10">😎 Aucune mission n’a été refusée</p>
            </div>
          ) : (
            <div className="mt-6">
              <Table
                maxHeigth="max-h-64"
                data={stats.comments || []}
                renderHeader={() => (
                  <>
                    <h4 className="flex-1">Motif de refus</h4>
                    <h4 className="w-[15%] text-center">Nombre</h4>
                    <h4 className="w-[15%] text-center">Pourcentage</h4>
                  </>
                )}
                itemHeight={"h-12"}
                renderItem={(item) => (
                  <>
                    <span className="flex-1">{item.key}</span>
                    <span className="w-[15%] text-center">{item.doc_count}</span>
                    <span className="w-[15%] text-center">{`${(item.rate * 100).toFixed(2)} %`}</span>
                  </>
                )}
              />
            </div>
          )}
        </div>
      </div>

      <div className="border border-gray-border p-6">
        <TablePaginator
          data={data}
          pageSize={pageSize}
          length={total}
          onPageChange={(page) => setFilters({ ...filters, page })}
          renderHeader={() => (
            <>
              <h4 className="flex-1 pl-3">Mission</h4>
              <h4 className="w-[25%]">Organisation</h4>
              <h4 className="w-[25%]">Localisation</h4>
              <h4 className="w-[10%]">Postée le</h4>
              <h4 className="w-[8%]">Statut</h4>
            </>
          )}
          renderItem={(item, i) => (
            <>
              <Link to={`/mission/${item._id}`} className="max-w-xl flex-1 px-2 text-blue-dark">
                <p className="line-clamp-3">{item.title}</p>
              </Link>
              <span className="w-[25%] pr-2">{item.organizationName}</span>
              <span className="w-[25%]">{`${item.city} ${item.country ? "- " + item.country : ""}`}</span>
              <span className="w-[10%]">{new Date(item.postedAt).toLocaleDateString("fr")}</span>
              <div className="flex w-[8%] items-center pl-2 text-lg">
                <a data-tooltip-id={`${item.status}-${i}`}>{STATUS_ICONS[item.status]}</a>
                <Tooltip id={`${item.status}-${i}`} className="text-xs">
                  {STATUS[item.status] || item.status}
                </Tooltip>
                {item.status === "REFUSED" && item.comment && (
                  <div className="relative group">
                    <RiInformationLine className="text-gray-dark" />

                    <div className="hidden group-hover:block absolute right-8 -translate-y-1/2 -top-1/2 z-10 w-64 border border-gray-border bg-white p-4 shadow-lg">
                      <p className="text-sm">{item.comment}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        />
      </div>
    </div>
  );
};

const Option = ({ option, active, selected, getLabel }) => (
  <div
    className={`${active ? "bg-gray-hover" : "bg-transparent"} ${
      selected ? "border-r-2 border-r-blue-dark text-blue-dark" : "border-none text-black"
    } select-none list-none flex items-center justify-between px-3 py-2`}
  >
    <p>{getLabel(option)}</p>
    <span>{option.doc_count}</span>
  </div>
);

export default Moderation;
