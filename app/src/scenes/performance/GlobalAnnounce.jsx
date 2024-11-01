import { useEffect, useState } from "react";
import { RiAlertFill, RiInformationFill } from "react-icons/ri";

import EmptySVG from "../../assets/svg/empty-info.svg";
import { Pie, StackedBarchart } from "../../components/Chart";
import Loader from "../../components/Loader";
import DateRangePicker from "../../components/NewDateRangePicker";
import { MONTHS } from "../../constants";
import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";

const COLORS = ["rgba(250,117,117,255)", "rgba(252,205,109,255)", "rgba(251,146,107,255)", "rgba(110,213,197,255)", "rgba(114,183,122,255)", "rgba(146,146,146,255)"];
const TYPE = {
  print: "Impressions",
  click: "Redirections",
  account: "Créations de compte",
  apply: "Candidatures",
};

const GlobalAnnounce = ({ filters, onFiltersChange }) => {
  const { publisher } = useStore();
  const [data, setData] = useState({ totalMissionAvailable: 0, totalMissionClicked: 0, totalPrint: 0, totalClick: 0, totalAccount: 0, totalApply: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const queryP = new URLSearchParams();

        if (filters.from) queryP.append("from", filters.from.toISOString());
        if (filters.to) queryP.append("to", filters.to.toISOString());

        queryP.append("publisherId", publisher._id);

        const resP = await api.get(`/stats-global/announce-preview?${queryP.toString()}`);
        if (!resP.ok) throw resP;

        const queryM = {
          publisherId: publisher._id,
          availableFrom: filters.from,
          availableTo: filters.to,
          size: 0,
        };
        const resM = await api.post("/mission/search", queryM);
        if (!resM.ok) throw resM;

        setData({
          ...resP.data,
          totalMissionAvailable: resM.total,
        });
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
      setLoading(false);
    };
    fetchData();
  }, [filters, publisher]);

  return (
    <div className="space-y-12 p-12">
      <div className="space-y-2">
        <label className="text-sm text-gray-dark uppercase font-semibold">Période</label>
        <DateRangePicker value={filters} onChange={(value) => onFiltersChange({ ...filters, ...value })} />
      </div>
      <div className="w-full h-px bg-gray-border" />
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">Aperçu</h2>
          <p className="text-base text-gray-dark">Vos missions partagées et l’impact que vos diffuseurs ont généré pour vous</p>
        </div>
        {loading ? (
          <div className="w-full py-10 flex justify-center">
            <Loader />
          </div>
        ) : (
          <div className="grid gap-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="border p-6">
                <p className="font-bold text-[28px]">{data.totalMissionAvailable.toLocaleString("fr")}</p>
                <p className="text-base">{data.totalMissionAvailable > 1 ? "missions disponibles sur la période" : "mission disponible sur la période"}</p>
              </div>
              <div className="border p-6">
                <p className="font-bold text-[28px]">{data.totalMissionClicked.toLocaleString("fr")}</p>
                <p className="text-base">missions ayant généré au moins une candidature</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="border p-6 relative">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-[28px]">{data.totalPrint !== 0 ? data.totalPrint.toLocaleString("fr") : "N/A"}</p>
                  {data.totalPrint === 0 ? (
                    <div className="relative group">
                      <RiAlertFill className="text-2xl text-[#b34000] cursor-pointer" />
                      <div className="hidden group-hover:block absolute -translate-x-1/2 bottom-8 z-10 w-80 border border-gray-border bg-white p-4 shadow-lg">
                        <p className="text-xs">Ils semblerait que les impressions de vos campagnes ou missions ne soient pas comptabilisées</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group">
                      <RiInformationFill className="text-2xl text-[#666] cursor-pointer" />
                      <div className="hidden group-hover:block absolute -translate-x-1/2 bottom-8 z-10 w-80 border border-gray-border bg-white p-4 shadow-lg">
                        <p className="text-xs">Les impressions des liens situés dans des emails ou SMS ne sont pas comptabilisés dans ce total</p>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-base">impressions</p>
              </div>
              <div className="border p-6">
                <p className="font-bold text-[28px]">{data.totalClick?.toLocaleString("fr")}</p>
                <p className="text-base">redirections</p>
              </div>
              <div className="border p-6">
                <p className="font-bold text-[28px]">{data.totalAccount?.toLocaleString("fr")}</p>
                <p className="text-base">créations de compte</p>
              </div>
              <div className="border p-6">
                <p className="font-bold text-[28px]">{data.totalApply?.toLocaleString("fr")}</p>
                <p className="text-base">candidatures</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {!loading && (
        <>
          <Evolution filters={filters} defaultType={data.totalPrint !== 0 ? "print" : "click"} />
          <Announcers filters={filters} defaultType={data.totalPrint !== 0 ? "print" : "click"} />
        </>
      )}
    </div>
  );
};

const Evolution = ({ filters, defaultType = "print" }) => {
  const { publisher } = useStore();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState(defaultType);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();

        if (filters.from) query.append("from", filters.from.toISOString());
        if (filters.to) query.append("to", filters.to.toISOString());
        if (type) query.append("type", type);

        query.append("flux", "to");
        query.append("publisherId", publisher._id);

        const res = await api.get(`/stats-global/evolution?${query.toString()}`);
        if (!res.ok) throw res;
        setData(res.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
      setLoading(false);
    };
    fetchData();
  }, [filters, type, publisher]);

  const buildHistogram = (data, keys) => {
    const res = [];
    if (!data) return res;
    const diff = (filters.to.getTime() - filters.from.getTime()) / (1000 * 60 * 60 * 24);
    data.forEach((d) => {
      const date = new Date(d.key);
      const name = diff < 61 ? date.toLocaleDateString("fr") : `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
      const obj = { name, Impressions: 0, Redirections: 0, "Créations de compte": 0, Candidatures: 0, Autres: 0 };

      d.publishers.buckets.forEach((p) => {
        if (!keys.includes(p.key)) obj["Autres"] += p.doc_count;
        else obj[p.key] = p.doc_count;
      });
      res.push(obj);
    });
    return res;
  };

  const histogram = buildHistogram(data.histogram, data.topPublishers);
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Evolution</h2>
        <p className="text-base text-gray-dark">Trafic reçu grâce à vos partenaires diffuseurs</p>
      </div>
      <div className="border p-4">
        <div className="flex items-center text-sm gap-8 mb-8">
          <button onClick={() => setType("print")} className={`pb-1 ${type === "print" ? "border-b-2 border-blue-dark text-blue-dark font-semibold" : ""}`}>
            Impressions
          </button>

          <button onClick={() => setType("click")} className={`pb-1 ${type === "click" ? "border-b-2 border-blue-dark text-blue-dark font-semibold" : ""}`}>
            Redirections
          </button>

          <button onClick={() => setType("account")} className={`pb-1 ${type === "account" ? "border-b-2 border-blue-dark text-blue-dark font-semibold" : ""}`}>
            Créations de compte
          </button>

          <button onClick={() => setType("apply")} className={`pb-1 ${type === "apply" ? "border-b-2 border-blue-dark text-blue-dark font-semibold" : ""}`}>
            Candidatures
          </button>
        </div>
        {loading ? (
          <div className="flex h-[248px] items-center justify-center">
            <Loader />
          </div>
        ) : !histogram.length ? (
          <div className="w-full h-[248px] bg-[#f6f6f6] flex flex-col justify-center items-center border border-dashed border-[#ddddd]">
            <img src={EmptySVG} alt="empty" className="w-16 h-16" />
            <p className="text-base text-[#666]">Aucune donnée disponible pour la période</p>
          </div>
        ) : (
          <div className="w-full h-[424px]">
            <StackedBarchart data={histogram} dataKey={[...data.topPublishers, "Autres"]} />
          </div>
        )}
      </div>
    </div>
  );
};

const Announcers = ({ filters, defaultType = "print" }) => {
  const { publisher } = useStore();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState(defaultType);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();

        if (filters.from) query.append("from", filters.from.toISOString());
        if (filters.to) query.append("to", filters.to.toISOString());

        query.append("publisherId", publisher._id);
        query.append("flux", "to");
        query.append("type", type);

        const res = await api.get(`/stats-global/announce-publishers?${query.toString()}`);
        if (!res.ok) throw res;
        setData(res.data);
        setTotal(res.total);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
      setLoading(false);
    };
    fetchData();
  }, [filters, publisher, type]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Top partenaires diffuseurs</h2>
        <p className="text-base text-gray-dark">{total > 1 ? `${total} partenaires` : `${total} partenaire`} ont diffusé vos missions sur la période</p>
      </div>
      {loading ? (
        <div className="w-full py-10 flex justify-center">
          <Loader />
        </div>
      ) : (
        <div className="border p-6 space-y-4">
          <div className="flex items-center text-sm gap-8 mb-8">
            <button onClick={() => setType("print")} className={`pb-1 ${type === "print" ? "border-b-2 border-blue-dark text-blue-dark font-semibold" : ""}`}>
              Impressions
            </button>

            <button onClick={() => setType("click")} className={`pb-1 ${type === "click" ? "border-b-2 border-blue-dark text-blue-dark font-semibold" : ""}`}>
              Redirections
            </button>

            <button onClick={() => setType("account")} className={`pb-1 ${type === "account" ? "border-b-2 border-blue-dark text-blue-dark font-semibold" : ""}`}>
              Créations de compte
            </button>

            <button onClick={() => setType("apply")} className={`pb-1 ${type === "apply" ? "border-b-2 border-blue-dark text-blue-dark font-semibold" : ""}`}>
              Candidatures
            </button>
          </div>
          {!data.length ? (
            <div className="w-full h-[248px] bg-[#f6f6f6] flex flex-col justify-center items-center border border-dashed border-[#ddddd]">
              <img src={EmptySVG} alt="empty" className="w-16 h-16" />
              <p className="text-base text-[#666]">Aucune donnée disponible pour la période</p>
            </div>
          ) : (
            <div className="flex justify-between gap-4">
              <div className="w-2/3">
                <table className="w-full table-fixed">
                  <thead className="text-left">
                    <tr className="text-gray-500 text-xs uppercase">
                      <th colSpan={3} className="px-4">
                        Diffuseurs
                      </th>
                      <th className="px-4 text-right">{TYPE[type]}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.slice(0, 6).map((item, i) => (
                      <tr key={i}>
                        <td colSpan={3} className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-4 mr-2" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <div className="flex-1 text-sm font-semibold">{item.key}</div>
                          </div>
                        </td>
                        <td className="px-4 text-right text-sm">{(item.doc_count || 0).toLocaleString("fr")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="w-1/3 flex justify-center items-center ml-24 mr-8">
                <div className="w-full h-56">
                  <Pie
                    data={data?.slice(0, 6).map((d, i) => ({ name: d.key, value: d.doc_count || 0, color: COLORS[i % COLORS.length] }))}
                    innerRadius="0%"
                    unit={TYPE[type].toLowerCase()}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalAnnounce;
