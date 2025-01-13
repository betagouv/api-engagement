import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";

import { RiDownload2Line } from "react-icons/ri";
import Select from "../../components/NewSelect";
import TablePagination from "../../components/NewTablePagination";
import SearchSelect from "../../components/SearchSelect";
import { MONTHS, REPORT_STATUS, YEARS } from "../../constants";
import api from "../../services/api";
import { captureError } from "../../services/error";

const TABLE_HEADER = [{ title: "Partenaire", key: "publisherName" }, { title: "Statut", key: "status" }, { title: "Stat" }];

const AdminReport = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    publisherId: searchParams.get("publisherId") || "",
    year: parseInt(searchParams.get("year")) || null,
    month: parseInt(searchParams.get("month")) || null,
    size: 25,
    page: parseInt(searchParams.get("page")) || 1,
    sortBy: searchParams.get("sortBy") || "createdAt",
  });
  const [options, setOptions] = useState({
    publishers: [],
    status: [],
  });
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = {};
        if (filters.status) query.status = filters.status;
        if (filters.publisherId) query.publisherId = filters.publisherId;
        if (filters.year) query.year = filters.year;
        if (filters.month) query.month = filters.month;
        query.size = filters.size;
        query.from = (filters.page - 1) * filters.size;
        query.sortBy = filters.sortBy;
        setSearchParams(new URLSearchParams(query));

        const res = await api.post("/admin-report/search", query);
        if (!res.ok) throw res;
        setData(res.data);
        setOptions(res.aggs);
        setTotal(res.total);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
      setLoading(false);
    };
    fetchData();
  }, [filters]);

  return (
    <div className="bg-white shadow-lg p-12 space-y-12">
      <Helmet>
        <title>Rapports d'impacts - Administration - API Engagement</title>
      </Helmet>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold flex-1">{total.toLocaleString("fr")} rapports d'impacts</h2>
      </div>

      <div className="border border-gray-border p-6 space-y-6">
        <p className="font-bold">Filtrer les resultats</p>
        <div className="flex items-center gap-4 border-b border-b-gray-border pb-6">
          <SearchSelect
            options={options.publishers.sort((a, b) => b.count - a.count).map((e) => ({ value: e._id, label: e.name, count: e.count }))}
            value={filters.publisherId}
            onChange={(e) => setFilters({ ...filters, publisherId: e.value })}
            placeholder="Partenaire"
            loading={loading}
          />
          <Select
            options={MONTHS.map((e, i) => ({ value: i, label: e }))}
            value={filters.month}
            onChange={(e) => setFilters({ ...filters, month: e.value, year: filters.year || new Date().getFullYear() })}
            placeholder="Mois"
          />
          <Select options={YEARS.map((e) => ({ value: e, label: e }))} value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.value })} placeholder="Année" />
          <SearchSelect
            options={options.status.sort((a, b) => b.count - a.count).map((e) => ({ value: e._id, label: REPORT_STATUS[e._id] || e._id, count: e.count }))}
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.value })}
            placeholder="Statut"
            loading={loading}
          />
        </div>
        <TablePagination
          header={TABLE_HEADER}
          page={filters.page}
          pageSize={filters.size}
          onPageChange={(page) => setFilters({ ...filters, page })}
          total={total}
          loading={loading}
          sortBy={filters.sortBy}
          onSort={(sortBy) => setFilters({ ...filters, sortBy })}
        >
          {data.map((item, i) => (
            <tr key={i} className={`${i % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-item`}>
              <td className="p-4 space-y-1">
                <Link className="font-bold text-base link" to={`/publisher/${item.publisherId}`}>
                  {item.publisherName}
                </Link>
                <div className="flex items-center gap-2">
                  <span className="text-gray-700 rounded-xl bg-[#dae6fd] px-2 py-1" style={{ fontSize: 12 }}>
                    {MONTHS[item.month]}
                  </span>
                  <span className="text-gray-700 rounded-xl bg-[#dae6fd] px-2 py-1" style={{ fontSize: 12 }}>
                    {item.year}
                  </span>
                </div>
              </td>
              <td className="px-4">
                {item.status === "SENT" ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                      <p className="flex-1 text-sm font-bold">Envoyé le {new Date(item.sentAt).toLocaleDateString("fr")}</p>
                    </div>
                    <p className="text-xs">{item.sentTo.length ? item.sentTo.join(", ") : "Aucun destinataire"}</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-red-500 rounded-full" />
                      <p className="flex-1 text-sm font-bold">Non envoyé</p>
                    </div>
                    <p className="flex-1 text-xs">{REPORT_STATUS[item.status] || item.status}</p>
                  </>
                )}
              </td>

              <td className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    {item.data?.receive !== undefined && item.data?.receive.general !== undefined && <p className="text-xs"> Pas de statistiques disponibles</p>}
                    {item.data?.receive !== undefined && (
                      <>
                        <label className="text-xs">Redirections reçues</label>
                        <span className="text-xs font-bold">{(item.data.receive.general?.traffic || item.data.receive.click || 0).toLocaleString("fr")}</span>
                        <label className="text-xs">Candidatures reçues</label>
                        <span className="text-xs font-bold">{(item.data.receive.general?.apply || item.data.receive.apply || 0).toLocaleString("fr")}</span>
                      </>
                    )}
                    {item.data?.send !== undefined && (
                      <>
                        <label className="text-xs">Redirections envoyées</label>
                        <span className="text-xs font-bold">{(item.data.send.general?.traffic || item.data.send.click || 0).toLocaleString("fr")}</span>
                        <label className="text-xs">Candidatures envoyées</label>
                        <span className="text-xs font-bold">{(item.data.send.general?.apply || item.data.send.apply || 0).toLocaleString("fr")}</span>
                      </>
                    )}
                  </div>
                  {item.url !== null && (
                    <a className="border border-blue-dark p-2 text-blue-dark" href={item.url} target="_blank" rel="noreferrer">
                      <RiDownload2Line className="text-blue-800" />
                    </a>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </TablePagination>
      </div>
    </div>
  );
};

export default AdminReport;
