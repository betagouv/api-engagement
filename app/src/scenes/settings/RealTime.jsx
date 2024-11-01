import { useEffect, useState } from "react";

import { useSearchParams } from "react-router-dom";
import TablePagination from "../../components/NewTablePagination";
import RadioInput from "../../components/RadioInput";
import api from "../../services/api";
import { API_URL } from "../../services/config";
import { captureError } from "../../services/error";
import useStore from "../../services/store";
import { timeSince } from "../../services/utils";

const TABLE_HEADER = [{ title: "Mission", colSpan: 2 }, { title: "Type" }, { title: "Source" }, { title: "Destination" }, { title: "Activité", position: "right" }];

const RealTime = () => {
  const { publisher, flux } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    type: searchParams.get("type") || "print",
    page: searchParams.get("page") || 1,
    pageSize: searchParams.get("pageSize") || 25,
  });
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const query = {
          type: filters.type,
          size: filters.pageSize,
          skip: (filters.page - 1) * filters.pageSize,
        };

        if (flux === "from") query.fromPublisherId = publisher._id;
        if (flux === "to") query.toPublisherId = publisher._id;

        const res = await api.post("/stats/search", query);

        if (!res.ok) throw res;
        setData(res.data);
        setTotal(res.total);
        setSearchParams({ type: filters.type });
      } catch (error) {
        captureError(error, "Une erreur est survenue lors de la récupération des données");
      }
    };
    fetchData();
  }, [filters, flux, publisher]);

  if (!data) return <h2 className="p-3">Chargement...</h2>;

  return (
    <div className="space-y-12 p-12">
      <div className="border border-gray-border p-8 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2 w-[40%]">
            <h2 className="text-3xl font-bold">
              Activité {{ apply: "des candidatures", click: "des redirections", print: "des impressions", account: "des créations de compte" }[filters.type]} en temps réel
            </h2>
            <p className="mb-4 text-xs text-gray-dark">
              L'historique
              {{ apply: " des dernières candidatures", click: " des dernières redirections", impressions: " des dernières impressions" }[filters.type] ||
                " de toutes les dernières activités"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <RadioInput id="type-print" name="type" value="print" label="Impressions" checked={filters.type === "print"} onChange={(e) => setFilters({ type: e.target.value })} />
            <RadioInput id="type-click" name="type" value="click" label="Redirections" checked={filters.type === "click"} onChange={(e) => setFilters({ type: e.target.value })} />
            <RadioInput id="type-apply" name="type" value="apply" label="Candidatures" checked={filters.type === "apply"} onChange={(e) => setFilters({ type: e.target.value })} />
            <RadioInput
              id="type-account"
              name="type"
              value="account"
              label="Créations de compte"
              checked={filters.type === "account"}
              onChange={(e) => setFilters({ type: e.target.value })}
            />
          </div>
        </div>

        <TablePagination header={TABLE_HEADER} page={filters.page} total={total} pageSize={filters.pageSize} onPageChange={(page) => setFilters({ ...filters, page })}>
          {data.map((item, i) => (
            <tr key={i} className={`${i % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-item`}>
              <td colSpan={2} className="px-4">
                {item.missionId && item.missionTitle ? (
                  <a href={`${API_URL}/r/notrack/${item.missionId}`} target="_blank">
                    {item.missionTitle}
                  </a>
                ) : (
                  `Campagne: ${item.sourceName}`
                )}
              </td>
              <td className="px-4">{item.type === "apply" ? "Candidature" : item.type === "click" ? "Redirection" : "Impression"}</td>
              <td className="px-4">{item.fromPublisherName}</td>
              <td className="px-4">{item.toPublisherName}</td>
              <td className="px-4 text-right">{timeSince(new Date(item.created_at || item.createdAt))}</td>
            </tr>
          ))}
        </TablePagination>
      </div>
    </div>
  );
};

export default RealTime;
