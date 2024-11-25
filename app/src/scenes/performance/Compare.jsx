import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { DateInput } from "../../components/NewDateRangePicker";
import Table from "../../components/NewTable";
import TablePagination from "../../components/NewTablePagination";
import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";

const TABLE_GLOBAL_HEADER = [
  { title: "Données", key: "name", position: "left", colSpan: 2 },
  { title: "", key: "data1", position: "right" },
  { title: "", key: "data2", position: "right" },
  { title: "Total depuis le début", key: "dataT", position: "right" },
];

const buildHeader = (filters1, filters2) => {
  const header = [...TABLE_GLOBAL_HEADER];
  header[1].title = filters1.from.toLocaleDateString("fr") + " au " + filters1.to.toLocaleDateString("fr");
  header[2].title = filters2.from.toLocaleDateString("fr") + " au " + filters2.to.toLocaleDateString("fr");
  return header;
};

const Compare = () => {
  const { publisher, flux } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters1, setFilters1] = useState({
    from: searchParams.has("from_1") ? new Date(searchParams.get("from_1")) : new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate()),
    to: searchParams.has("to_1") ? new Date(searchParams.get("to_1")) : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1, 0, 0, 0, -1),
  });
  const [filters2, setFilters2] = useState({
    from: searchParams.has("from_2") ? new Date(searchParams.get("from_2")) : new Date(new Date().getFullYear() - 2, new Date().getMonth(), new Date().getDate()),
    to: searchParams.has("to_2") ? new Date(searchParams.get("to_2")) : new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate() + 1, 0, 0, 0, -1),
  });
  const [type, setType] = useState("printCount");
  const [data1, setData1] = useState({ performance: { printCount: 0, clickCount: 0, applyCount: 0, accountCount: 0, rate: 0 }, publishers: [] });
  const [data2, setData2] = useState({ performance: { printCount: 0, clickCount: 0, applyCount: 0, accountCount: 0, rate: 0 }, publishers: [] });
  const [dataT, setDataT] = useState({ performance: { printCount: 0, clickCount: 0, applyCount: 0, accountCount: 0, rate: 0 }, publishers: [] });
  const [loading, setLoading] = useState(false);
  const [tableSettings, setTableSettings] = useState({ page: 1, pageSize: 12, sortBy: "name" });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          publisherId: publisher._id,
          flux,
        });
        const resP = await api.get(`/stats-compare?${query.toString()}`);
        if (!resP.ok) throw resP;
        setDataT(resP.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
      setLoading(false);
    };
    fetchData();
  }, [publisher]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          from: filters1.from.toISOString(),
          to: filters1.to.toISOString(),
          publisherId: publisher._id,
          flux,
        });
        const resP = await api.get(`/stats-compare?${query.toString()}`);
        if (!resP.ok) throw resP;
        setData1(resP.data);
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set("from_1", filters1.from.toISOString());
        newSearchParams.set("to_1", filters1.to.toISOString());
        setSearchParams(newSearchParams);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
      setLoading(false);
    };
    fetchData();
  }, [filters1, publisher]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          from: filters2.from.toISOString(),
          to: filters2.to.toISOString(),
          publisherId: publisher._id,
          flux,
        });

        const resP = await api.get(`/stats-compare?${query.toString()}`);
        if (!resP.ok) throw resP;
        setData2(resP.data);

        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set("from_2", filters2.from.toISOString());
        newSearchParams.set("to_2", filters2.to.toISOString());
        setSearchParams(newSearchParams);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
      setLoading(false);
    };
    fetchData();
  }, [filters2, publisher]);

  const buildTableData = (data1, data2, dataT) => {
    if (!dataT || !data1 || !data2) return [];
    const d = {};
    dataT.publishers.forEach((item) => (d[item.id] ? (d[item.id].dataT = item[type] || 0) : (d[item.id] = { name: item.name, dataT: item[type] || 0, data1: 0, data2: 0 })));
    data1.publishers.forEach((item) => (d[item.id] ? (d[item.id].data1 = item[type] || 0) : (d[item.id] = { name: item.name, dataT: 0, data1: item[type] || 0, data2: 0 })));
    data2.publishers.forEach((item) => (d[item.id] ? (d[item.id].data2 = item[type] || 0) : (d[item.id] = { name: item.name, dataT: 0, data1: 0, data2: item[type] || 0 })));
    return Object.values(d);
  };

  return (
    <div className="space-y-12 p-12">
      <Helmet>
        <title>Comparer des périodes - Performance - API Engagement</title>
      </Helmet>
      <div className="flex items-center gap-8">
        <div className="space-y-2">
          <label className="text-sm text-[#666] uppercase font-semibold">Comparer la période</label>
          <DateInput value={filters1} onChange={setFilters1} />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[#666] uppercase font-semibold">à la période</label>
          <DateInput value={filters2} onChange={setFilters2} />
        </div>
      </div>

      <div className="border-b border-b-gray-border" />

      <div className="border p-6 space-y-4">
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold">Performance globale</h3>
          <p className="text-sm text-[#666]">{flux === "to" ? "Trafic reçu grâce à vos partenaires diffuseurs" : "Trafic généré pour vos partenaires annonceurs"}</p>
        </div>
        <Table header={buildHeader(filters1, filters2)} loading={loading}>
          <tr className="bg-gray-100 table-item">
            <td colSpan={2} className="px-4">
              Impressions
            </td>
            <td className="px-4 text-right">{(data1.performance.printCount || 0).toLocaleString("fr")}</td>
            <td className="px-4 text-right">{(data2.performance.printCount || 0).toLocaleString("fr")}</td>
            <td className="px-4 text-right">{(dataT.performance.printCount || 0).toLocaleString("fr")}</td>
          </tr>
          <tr className="bg-gray-50 table-item">
            <td colSpan={2} className="px-4">
              Redirections
            </td>
            <td className="px-4 text-right">{(data1.performance.clickCount || 0).toLocaleString("fr")}</td>
            <td className="px-4 text-right">{(data2.performance.clickCount || 0).toLocaleString("fr")}</td>
            <td className="px-4 text-right">{(dataT.performance.clickCount || 0).toLocaleString("fr")}</td>
          </tr>
          <tr className="bg-gray-100 table-item">
            <td colSpan={2} className="px-4">
              Créations de compte
            </td>
            <td className="px-4 text-right">{(data1.performance.accountCount || 0).toLocaleString("fr")}</td>
            <td className="px-4 text-right">{(data2.performance.accountCount || 0).toLocaleString("fr")}</td>
            <td className="px-4 text-right">{(dataT.performance.accountCount || 0).toLocaleString("fr")}</td>
          </tr>
          <tr className="bg-gray-50 table-item">
            <td colSpan={2} className="px-4">
              Candidatures
            </td>
            <td className="px-4 text-right">{(data1.performance.applyCount || 0).toLocaleString("fr")}</td>
            <td className="px-4 text-right">{(data2.performance.applyCount || 0).toLocaleString("fr")}</td>
            <td className="px-4 text-right">{(dataT.performance.applyCount || 0).toLocaleString("fr")}</td>
          </tr>
        </Table>
      </div>

      <div className="border p-6 space-y-4">
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold">Vos partenaires {flux === "to" ? "diffuseurs" : "annonceurs"}</h3>
          <p className="text-sm text-[#666]">{flux === "to" ? "Trafic reçu par partenaire diffuseur" : "Trafic généré pour vos partenaires annonceurs, par partenaire"}</p>
        </div>
        <div className="flex items-center text-sm gap-8 mb-8">
          <button onClick={() => setType("printCount")} className={`pb-1 ${type === "printCount" ? "border-b-2 border-blue-dark text-blue-dark font-semibold" : ""}`}>
            Impressions
          </button>

          <button onClick={() => setType("clickCount")} className={`pb-1 ${type === "clickCount" ? "border-b-2 border-blue-dark text-blue-dark font-semibold" : ""}`}>
            Redirections
          </button>

          <button onClick={() => setType("accountCount")} className={`pb-1 ${type === "accountCount" ? "border-b-2 border-blue-dark text-blue-dark font-semibold" : ""}`}>
            Créations de compte
          </button>

          <button onClick={() => setType("applyCount")} className={`pb-1 ${type === "applyCount" ? "border-b-2 border-blue-dark text-blue-dark font-semibold" : ""}`}>
            Candidatures
          </button>
          <button onClick={() => setType("rate")} className={`pb-1 ${type === "rate" ? "border-b-2 border-blue-dark text-blue-dark font-semibold" : ""}`}>
            Taux de conversion
          </button>
        </div>
        <TablePagination
          header={buildHeader(filters1, filters2)}
          total={dataT.publishers.length}
          page={tableSettings.page}
          pageSize={12}
          loading={loading}
          onPageChange={(page) => setTableSettings({ ...tableSettings, page })}
          sortBy={tableSettings.sortBy}
          onSort={(sortBy) => setTableSettings({ ...tableSettings, sortBy })}
        >
          {buildTableData(data1, data2, dataT)
            .sort((a, b) => (tableSettings.sortBy === "name" ? a.name.localeCompare(b.name) : b[tableSettings.sortBy] - a[tableSettings.sortBy]))
            .slice((tableSettings.page - 1) * tableSettings.pageSize, tableSettings.page * tableSettings.pageSize)
            .map((item, i) => (
              <tr key={i} className={`${i % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-item`}>
                <td className="px-4" colSpan={2}>
                  {item.name}
                </td>
                <td className="px-4 text-right">{type === "rate" ? (item.data1 || 0).toLocaleString("fr", { style: "percent" }) : (item.data1 || 0).toLocaleString("fr")}</td>
                <td className="px-4 text-right">{type === "rate" ? (item.data2 || 0).toLocaleString("fr", { style: "percent" }) : (item.data2 || 0).toLocaleString("fr")}</td>
                <td className="px-4 text-right">{type === "rate" ? (item.dataT || 0).toLocaleString("fr", { style: "percent" }) : (item.dataT || 0).toLocaleString("fr")}</td>
              </tr>
            ))}
        </TablePagination>
      </div>
    </div>
  );
};

export default Compare;
