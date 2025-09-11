import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { RiFileDownloadLine } from "react-icons/ri";
import { Link } from "react-router-dom";
import Pie, { COLORS } from "../../components/Chart";
import Loader from "../../components/Loader";
import DateRangePicker from "../../components/NewDateRangePicker";
import TablePagination from "../../components/NewTablePagination";
import { DOMAINS } from "../../constants";
import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";

const TABLE_MISSION_HEADER = [
  { title: "Missions et organisations", key: "title", position: "left", colSpan: 2 },
  { title: "Impressions", key: "print", position: "right" },
  { title: "Redirections", key: "click", position: "right" },
  { title: "Créations de compte", key: "account", position: "right" },
  { title: "Candidatures", key: "apply", position: "right" },
  { title: "Taux de conversion", key: "rate", position: "right" },
];

const TABLE_ORGANISATION_HEADER = [
  { title: "Organisations", key: "domain", position: "left", colSpan: 2 },
  { title: "Impressions", key: "printCount", position: "right" },
  { title: "Redirections", key: "clickCount", position: "right" },
  { title: "Créations de compte", key: "accountCount", position: "right" },
  { title: "Candidatures", key: "applyCount", position: "right" },
  { title: "Taux de conversion", key: "rate", position: "right" },
];

const TABLE_DOMAIN_HEADER = [
  { title: "Domaines", key: "domain", position: "left", colSpan: 2 },
  { title: "Impressions", key: "printCount", position: "right" },
  { title: "Redirections", key: "clickCount", position: "right" },
  { title: "Créations de compte", key: "accountCount", position: "right" },
  { title: "Candidatures", key: "applyCount", position: "right" },
  { title: "Taux de conversion", key: "rate", position: "right" },
];

const Mission = ({ filters, onFiltersChange }) => {
  return (
    <div className="space-y-12 p-12">
      <Helmet>
        <title>Missions - Performance - API Engagement</title>
      </Helmet>
      <div className="space-y-2">
        <label className="text-sm text-gray-425 uppercase font-semibold">Période</label>
        <DateRangePicker value={filters} onChange={(value) => onFiltersChange({ ...filters, ...value })} />
      </div>

      <div className="border-b border-b-gray-900" />

      <MissionTable filters={filters} />
      <OrganisationTable filters={filters} />
      <DomainTable filters={filters} />
      <DomainPie filters={filters} />
    </div>
  );
};

const MissionTable = ({ filters }) => {
  const { publisher, flux } = useStore();
  const [tableSettings, setTableMissionSettings] = useState({ page: 1, pageSize: 5, sort: "apply" });
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          flux,
          from: filters.from.toISOString(),
          to: filters.to.toISOString(),
          publisherId: publisher._id,
          sort: tableSettings.sort,
        });

        const res = await api.get(`/stats-mission/mission-performance?${query.toString()}`);
        if (!res.ok) throw res;
        setData(res.data);
        setTotal(res.total);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
      setLoading(false);
    };
    fetchData();
  }, [tableSettings, filters, publisher, flux]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const query = new URLSearchParams({
        flux,
        from: filters.from.toISOString(),
        to: filters.to.toISOString(),
        publisherId: publisher._id,
      });

      const res = await api.get(`/stats-mission/mission-performance?${query.toString()}`);
      if (!res.ok) throw res;

      const csv =
        "Id; Client Id;Missions;Organisations;Impressions;Redirections;Créations de compte;Candidatures;Taux de conversion\n" +
        res.data
          .map(
            (item) =>
              `${item._id};${item.clientId};${item.title};${item.organizationName};${item.printCount};${item.clickCount};${item.accountCount};${item.applyCount};${item.rate}`,
          )
          .join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "performance_mission.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      captureError(error, "Erreur lors de l'export des données");
    }
    setExporting(false);
  };

  return (
    <div className="border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold">Vos 50 missions les plus performantes</h3>
        <button className="py-2 px-4 text-sm flex items-center text-blue-france hover:bg-gray-975 border transition delay-50" onClick={handleExport} disabled={exporting}>
          {exporting ? (
            <>
              <Loader size="small" /> Export en cours
            </>
          ) : (
            <>
              <RiFileDownloadLine className="inline align-middle mr-2" /> Exporter
            </>
          )}
        </button>
      </div>
      {loading ? (
        <div className="w-full py-10 flex justify-center">
          <Loader />
        </div>
      ) : (
        <TablePagination
          header={TABLE_MISSION_HEADER}
          page={tableSettings.page}
          pageSize={tableSettings.pageSize}
          onPageChange={(page) => setTableMissionSettings({ ...tableSettings, page })}
          total={total}
          sortBy={tableSettings.sort}
          onSort={(sort) => setTableMissionSettings({ ...tableSettings, sort })}
        >
          {data.slice((tableSettings.page - 1) * tableSettings.pageSize, tableSettings.page * tableSettings.pageSize).map((item, i) => (
            <tr key={i} className={`${i % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-item`}>
              <td colSpan={2} className="p-4">
                <Link to={`/mission/${item._id}`} className="text-blue-france hover:underline">
                  {item.title}
                </Link>
                {item.organizationName && <p>{item.organizationName}</p>}
              </td>
              <td className="px-4 text-right">{(item.printCount || 0).toLocaleString("fr")}</td>
              <td className="px-4 text-right">{(item.clickCount || 0).toLocaleString("fr")}</td>
              <td className="px-4 text-right">{(item.accountCount || 0).toLocaleString("fr")}</td>
              <td className="px-4 text-right">{(item.applyCount || 0).toLocaleString("fr")}</td>
              <td className="px-4 text-right">{(item.rate || 0).toLocaleString("fr", { style: "percent", minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </TablePagination>
      )}
    </div>
  );
};

const OrganisationTable = ({ filters }) => {
  const { publisher, flux } = useStore();
  const [tableSettings, setTableDomainSettings] = useState({ page: 1, pageSize: 5, sortBy: "applyCount" });
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          flux,
          from: new Date(filters.from).toISOString(),
          to: new Date(filters.to).toISOString(),
          publisherId: publisher._id,
          sort: tableSettings.sortBy,
          size: tableSettings.pageSize,
          skip: (tableSettings.page - 1) * tableSettings.pageSize,
        });

        const res = await api.get(`/stats-mission/organisation-performance?${query.toString()}`);
        if (!res.ok) throw res;
        setData(res.data);
        setTotal(res.total);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
      setLoading(false);
    };
    fetchData();
  }, [tableSettings, filters, publisher]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const query = new URLSearchParams({
        flux,
        from: filters.from.toISOString(),
        to: filters.to.toISOString(),
        publisherId: publisher._id,
        size: 1000,
      });

      const res = await api.get(`/stats-mission/organisation-performance?${query.toString()}`);
      if (!res.ok) throw res;

      const csv =
        "Organisations;Impressions;Redirections;Créations de compte;Candidatures;Taux de conversion\n" +
        res.data.map((item) => `${item.name};${item.printCount};${item.clickCount};${item.accountCount};${item.applyCount};${item.rate}`).join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "performance_organisation.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      captureError(error, "Erreur lors de l'export des données");
    }
    setExporting(false);
  };

  return (
    <div className="border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold">Performance par organisation</h3>
        <button className="py-2 px-4 text-sm flex items-center text-blue-france hover:bg-gray-975 border transition delay-50" onClick={handleExport} disabled={exporting}>
          {exporting ? (
            <>
              <Loader size="small" /> Export en cours
            </>
          ) : (
            <>
              <RiFileDownloadLine className="inline align-middle mr-2" /> Exporter
            </>
          )}
        </button>
      </div>
      {loading ? (
        <div className="w-full py-10 flex justify-center">
          <Loader />
        </div>
      ) : (
        <TablePagination
          header={TABLE_ORGANISATION_HEADER}
          page={tableSettings.page}
          pageSize={tableSettings.pageSize}
          onPageChange={(page) => setTableDomainSettings({ ...tableSettings, page })}
          total={total}
          sortBy={tableSettings.sortBy}
          onSort={(sortBy) => setTableDomainSettings({ ...tableSettings, sortBy })}
        >
          {data.map((item, i) => (
            <tr key={i} className={`${i % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-item`}>
              <td colSpan={2} className="px-4">
                {item.name}
              </td>
              <td className="px-4 text-right">{(item.printCount || 0).toLocaleString("fr")}</td>
              <td className="px-4 text-right">{(item.clickCount || 0).toLocaleString("fr")}</td>
              <td className="px-4 text-right">{(item.accountCount || 0).toLocaleString("fr")}</td>
              <td className="px-4 text-right">{(item.applyCount || 0).toLocaleString("fr")}</td>
              <td className="px-4 text-right">{(item.rate || 0).toLocaleString("fr", { style: "percent", minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </TablePagination>
      )}
    </div>
  );
};

const DomainTable = ({ filters }) => {
  const { publisher, flux } = useStore();
  const [tableSettings, setTableDomainSettings] = useState({ page: 1, sortBy: "applyCount" });
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          flux,
          from: new Date(filters.from).toISOString(),
          to: new Date(filters.to).toISOString(),
          publisherId: publisher._id,
        });

        const res = await api.get(`/stats-mission/domain-performance?${query.toString()}`);
        if (!res.ok) throw res;
        setData(res.data);
        setTotal(res.total);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
      setLoading(false);
    };
    fetchData();
  }, [filters, publisher, flux]);

  return (
    <div className="border p-6 space-y-4">
      <h3 className="text-2xl font-semibold">Performance par domaine d'action</h3>
      {loading ? (
        <div className="w-full py-10 flex justify-center">
          <Loader />
        </div>
      ) : (
        <TablePagination
          header={TABLE_DOMAIN_HEADER}
          page={tableSettings.page}
          pageSize={5}
          onPageChange={(page) => setTableDomainSettings({ ...tableSettings, page })}
          total={total}
          sortBy={tableSettings.sortBy}
          onSort={(sortBy) => setTableDomainSettings({ ...tableSettings, sortBy })}
        >
          {data
            .sort((a, b) => (tableSettings.sortBy === "name" ? (a.name || "").localeCompare(b.name) : b[tableSettings.sortBy] - a[tableSettings.sortBy]))
            .slice((tableSettings.page - 1) * 5, tableSettings.page * 5)
            .map((item, i) => (
              <tr key={i} className={`${i % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-item`}>
                <td colSpan={2} className="px-4">
                  {DOMAINS[item.name] || item.name}
                </td>
                <td className="px-4 text-right">{(item.printCount || 0).toLocaleString("fr")}</td>
                <td className="px-4 text-right">{(item.clickCount || 0).toLocaleString("fr")}</td>
                <td className="px-4 text-right">{(item.accountCount || 0).toLocaleString("fr")}</td>
                <td className="px-4 text-right">{(item.applyCount || 0).toLocaleString("fr")}</td>
                <td className="px-4 text-right">{(item.rate || 0).toLocaleString("fr", { style: "percent", minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
        </TablePagination>
      )}
    </div>
  );
};

const DomainPie = ({ filters }) => {
  const { publisher, flux } = useStore();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          flux,
          from: new Date(filters.from).toISOString(),
          to: new Date(filters.to).toISOString(),
          publisherId: publisher._id,
        });

        const resDD = await api.get(`/stats-mission/domain-distribution?${query.toString()}`);
        if (!resDD.ok) throw resDD;
        setData(resDD.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
      setLoading(false);
    };
    fetchData();
  }, [filters, publisher, flux]);

  const buildPieData = (data) => {
    const other = { name: "Autres", value: 0, color: "rgba(0,0,0,0.5)" };
    const top = data.slice(0, 5).map((d, i) => ({ name: DOMAINS[d.key], value: d.doc_count, color: COLORS[i % COLORS.length] }));
    data.slice(5).forEach((d) => (other.value += d.doc_count));
    return [...top, other];
  };

  return (
    <div className="border p-6 space-y-4">
      <h3 className="text-2xl font-semibold">Répartition par domaine d'action</h3>
      {loading ? (
        <div className="w-full py-10 flex justify-center">
          <Loader />
        </div>
      ) : (
        <div className="flex justify-between gap-4">
          <div className="w-2/3">
            <table className="w-full table-fixed">
              <thead className="text-left">
                <tr className="text-gray-500 text-xs uppercase">
                  <th colSpan={3} className="px-4">
                    Domaine d'action
                  </th>
                  <th className="px-4 text-right">Nombre de missions</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 5).map((item, i) => (
                  <tr key={i}>
                    <td colSpan={3} className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-4 mr-2" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <div className="flex-1 text-sm font-semibold">{DOMAINS[item.key] || item.key}</div>
                      </div>
                    </td>
                    <td className="px-4 text-right text-sm">{item.doc_count.toLocaleString("fr")}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-4 mr-2" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} />
                      <div className="flex-1 text-sm font-semibold">Autres</div>
                    </div>
                  </td>
                  <td className="px-4 text-right text-sm">
                    {data
                      .slice(5)
                      .reduce((acc, item) => acc + item.doc_count, 0)
                      .toLocaleString("fr")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="w-1/3 flex justify-center items-center ml-24 mr-8">
            <div className="w-full h-56">
              <Pie data={buildPieData(data)} innerRadius={0} unit="missions" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mission;
