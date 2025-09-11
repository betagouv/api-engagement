import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";

import Pie from "../../components/Chart";
import Loader from "../../components/Loader";
import DateRangePicker from "../../components/NewDateRangePicker";
import Table from "../../components/NewTable";
import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";

const TABLE_HEADER = [{ title: "#" }, { title: "Motifs", colSpan: 4 }, { title: "#" }];

const StatsModeration = () => {
  const { publisher } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    from: searchParams.has("from") ? new Date(searchParams.get("from")) : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 30),
    to: searchParams.has("to") ? new Date(searchParams.get("to")) : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1, 0, 0, 0, -1),
  });
  const [data, setData] = useState({
    rate: 0.9,
    comments: [],
  });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(false);
      try {
        const query = new URLSearchParams({
          publisherId: publisher._id,
          from: filters.from.toISOString(),
          to: filters.to.toISOString(),
        });

        const res = await api.get(`/stats-mission/moderation?${query.toString()}`);
        if (!res.ok) throw res;
        setData(res.data);
        setTotal(res.total);

        setSearchParams({
          from: filters.from.toISOString(),
          to: filters.to.toISOString(),
        });
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
      setLoading(false);
    };

    fetchData();
  }, [filters]);

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="space-y-12 p-12">
      <Helmet>
        <title>Statistiques de modération - Vos Missions - API Engagement</title>
      </Helmet>
      <div className="space-y-2">
        <label className="text-sm text-gray-425 uppercase font-semibold">Période</label>
        <DateRangePicker value={filters} onChange={(value) => setFilters({ ...filters, ...value })} />
      </div>
      <div className="h-px w-full bg-gray-900" />
      {loading ? (
        <Loader />
      ) : total === 0 ? (
        <div className="p-6">
          <p className="text-center">Aucune mission partagée sur cette période</p>
        </div>
      ) : (
        <div className="flex gap-6 items-start">
          <div className="w-1/3 border border-gray-900 p-6 space-y-6">
            <h2 className="text-3xl font-bold">
              {data.rate === 1
                ? `😎 Aucune mission n'a été refusée par l'API Engagement`
                : data.rate > 0.9
                  ? `${data.rate.toLocaleString("fr", { style: "percent", minimumFractionDigits: 2 })} de vos missions ont été acceptées 😎`
                  : `${(1 - data.rate).toLocaleString("fr", { style: "percent", minimumFractionDigits: 2 })} de vos missions ont été refusées 😞`}
            </h2>
            <div className="w-full h-56">
              <Pie
                data={[
                  { name: "Acceptées", value: data.accepted, color: "#6ED5C5" },
                  { name: "Refusées", value: data.refused, color: "#FA7575" },
                ]}
                innerRadius="0%"
              />
            </div>
          </div>
          <div className="flex-1 border border-gray-900 p-6 space-y-6">
            <h2 className="text-3xl font-bold">Top des motifs de refus</h2>

            <Table header={TABLE_HEADER}>
              {data.comments.map((item, i) => (
                <tr key={i} className={`${i % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-item`}>
                  <td className="px-4">{i + 1}</td>
                  <td className="px-4" colSpan={4}>
                    {item.comment}
                  </td>
                  <td className="px-4">{item.rate.toLocaleString("fr", { style: "percent", minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsModeration;
