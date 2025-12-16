import { useEffect, useState } from "react";
import DateRangePicker from "../../components/NewDateRangePicker";
import useStore from "../../services/store";

import JessicaSvg from "../../assets/svg/jessica.svg";
import NassimSvg from "../../assets/svg/nassim.svg";
import Loader from "../../components/Loader";
import Table from "../../components/NewTable";
import api from "../../services/api";
import { captureError } from "../../services/error";

const Mean = ({ filters, onFiltersChange }) => {
  const { publisher } = useStore();
  const [options, setOptions] = useState([]);
  const [source, setSource] = useState("");
  const [data, setData] = useState({ sources: [], graph: { printCount: 0, clickCount: 0, applyCount: 0, accountCount: 0 } });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const newOptions = [];
        let source = "";

        if (publisher.hasApiRights) {
          source = "publisher";
          newOptions.push({ label: "API", value: "publisher" });
        }

        if (publisher.hasCampaignRights) {
          const resC = await api.post("/campaign/search", { fromPublisherId: publisher.id, size: 0 });
          if (!resC.ok) throw resC;
          if (resC.total) {
            source = "campaign";
            newOptions.push({ label: "Campagnes", value: "campaign" });
          }
        }

        if (publisher.hasWidgetRights) {
          const resW = await api.post("/widget/search", { fromPublisherId: publisher.id, size: 0 });
          if (!resW.ok) throw resW;
          if (resW.total) {
            source = "widget";
            newOptions.push({ label: "Widgets", value: "widget" });
          }
        }

        setOptions(newOptions.reverse());
        setSource(source);
      } catch (error) {
        captureError(error, { extra: { publisherId: publisher.id } });
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!source) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (filters.from) query.append("from", filters.from);
        if (filters.to) query.append("to", filters.to);
        query.append("source", source);
        query.append("publisherId", publisher.id);
        const resP = await api.get(`/stats-mean?${query.toString()}`);
        if (!resP.ok) throw resP;

        setData(resP.data);
      } catch (error) {
        captureError(error, { extra: { source, filters, publisherId: publisher.id } });
      }
      setLoading(false);
    };
    fetchData();
  }, [source, filters, publisher]);

  if (!source)
    return (
      <div className="flex justify-center p-12">
        <Loader />
      </div>
    );

  return (
    <div className="space-y-12 p-12">
      <title>Moyens de diffusion - Performance - API Engagement</title>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <label className="text-gray-425 text-sm font-semibold uppercase">Période</label>
          <DateRangePicker value={filters} onChange={(value) => onFiltersChange({ ...filters, ...value })} />
        </div>
        {options.length > 1 && (
          <>
            <div className="mx-10 h-16 w-px bg-gray-900" />
            <div className="flex-1 space-y-2">
              <label htmlFor="mean-of-diffusion" className="text-gray-425 text-sm font-semibold uppercase">
                Moyen de diffusion
              </label>
              <select id="mean-of-diffusion" className="select w-full" value={source} onChange={(e) => setSource(e.target.value)}>
                {options.map((option, i) => (
                  <option key={i} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      <div className="border-b border-b-gray-900" />

      <div className="flex flex-col gap-4">
        <h2 className="text-[28px] font-bold">
          {
            {
              widget: data.sources.length > 1 ? `${data.sources.length} widgets actifs` : `${data.sources.length} widget actif`,
              campaign: data.sources.length > 1 ? `${data.sources.length} campagnes actives` : `${data.sources.length} campagne active`,
              publisher: "Statistiques de votre diffusion par API",
            }[source]
          }
        </h2>
        <div className="flex items-start gap-6 border border-gray-900 p-6">
          {loading ? (
            <div className="flex w-full justify-center py-10">
              <Loader />
            </div>
          ) : (
            <>
              <div className="h-full w-[20%] p-4">
                <h1 className="text-4xl font-bold">
                  {data.graph.clickCount ? (data.graph.applyCount / data.graph.clickCount).toLocaleString("fr-FR", { style: "percent", maximumFractionDigits: 2 }) : "-"}
                </h1>
                <p className="mt-2 text-base">taux de conversion de l'API</p>
                <p className="mt-4 text-sm text-[#666666]">
                  entre le nombre de <span className="font-semibold text-black">redirections</span> et le nombre de <span className="font-semibold text-black">candidatures</span>
                </p>
              </div>
              <div className="flex h-full flex-1 items-end gap-8">
                <div className="group flex h-full flex-1 flex-col justify-end gap-4 px-4">
                  <Bar value={100} height={BAR_HEIGHT} />
                  <div className="h-24">
                    <h4 className="text-3xl font-semibold text-gray-700 group-hover:text-black">{data.graph.clickCount.toLocaleString("fr")}</h4>
                    <p className="text-base text-gray-700 group-hover:text-black">redirections vers une mission</p>
                  </div>
                </div>
                <div className="group flex h-full flex-1 flex-col justify-end gap-4 px-4">
                  <Bar value={data.graph.clickCount ? (data.graph.applyCount * 100) / data.graph.clickCount : 100} height={BAR_HEIGHT} />
                  <div className="h-24">
                    <h4 className="text-3xl font-semibold text-gray-700 group-hover:text-black">{data.graph.applyCount.toLocaleString("fr")}</h4>
                    <p className="text-base text-gray-700 group-hover:text-black">candidatures</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-gray-900 p-6">
            <p className="text-[28px] font-bold">{data.graph.printCount.toLocaleString("fr")}</p>
            <p className="text-base">impressions</p>
          </div>
          <div className="border border-gray-900 p-6">
            <p className="text-[28px] font-bold">{data.graph.accountCount.toLocaleString("fr")}</p>
            <p className="text-base">créations de compte</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-8 border border-gray-900 bg-[#F5F5FE] p-8">
        <div className="relative h-full w-[128px]">
          <img src={JessicaSvg} alt="Jessica" className="absolute top-1/2 left-0 h-[72px] w-[72px] -translate-y-1/2 rounded-full" />
          <img src={NassimSvg} alt="Nassim" className="absolute top-1/2 right-0 h-[72px] w-[72px] -translate-y-1/2 rounded-full" />
        </div>
        <div className="space-y-8">
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold">Jessica et Nassim vous accompagnent</h3>
            <p className="text-[18px] text-[#3A3A3A]">Nous sommes là pour vous aider à optimiser votre parcours utilisateur et votre taux de conversion.</p>
          </div>

          <div>
            <a href={publisher.missionType === "benevolat" ? "mailto:nassim.merzouk@beta.gouv.fr" : "mailto:jessica.maitte@beta.gouv.fr"} className="secondary-btn">
              Nous contacter
            </a>
          </div>
        </div>
      </div>

      {(source === "widget" || source === "campaign") && !loading && <SourcePerformance data={data.sources} source={source} />}
    </div>
  );
};

const getLabelPosition = (value) => {
  if (value < 10) return "5%";
  if (value > 90) return "94%";
  return `${value - 4}%`;
};

const BAR_HEIGHT = 320;

const Bar = ({ value, height = BAR_HEIGHT }) => {
  if (value < 0) value = 0;
  if (value > 100) value = 100;

  return (
    <div className="relative w-full" style={{ height }}>
      <div className="absolute bottom-0 h-full w-full rounded bg-[#6A6AF4]/10" />
      <div className="absolute bottom-0 w-full rounded bg-[#ADADF9] transition-all duration-300 ease-in-out group-hover:bg-[#6A6AF4]" style={{ height: `${value}%` }} />
      <div className="absolute left-1/2 -translate-x-1/2 rounded border bg-white px-2 py-1 text-sm shadow-lg" style={{ bottom: getLabelPosition(value) }}>
        {value.toFixed(0)}%
      </div>
    </div>
  );
};

const TABLE_HEADER = (source) => [
  { title: `Nom ${source === "widget" ? "du widget" : "de la campagne"}`, key: "name", position: "left", colSpan: 2 },
  { title: "Impressions", key: "printCount", position: "right" },
  { title: "Redirections", key: "clickCount", position: "right" },
  { title: "Créations de compte", key: "accountCount", position: "right" },
  { title: "Candidatures", key: "applyCount", position: "right" },
  { title: "Taux de conversion", key: "rate", position: "right" },
];

const SourcePerformance = ({ data, source }) => {
  const [sortBy, setSortBy] = useState("applyCount");
  return (
    <div className="space-y-4 border border-gray-900 p-6">
      <h3 className="text-2xl font-semibold">Performance par {source === "widget" ? "widget" : "campagne"}</h3>
      <Table header={TABLE_HEADER(source)} total={data.length} sortBy={sortBy} onSort={setSortBy}>
        {data
          .sort((a, b) => (sortBy === "name" ? (a.name || "").localeCompare(b.name) : b[sortBy] - a[sortBy]))
          .map((item, i) => (
            <tr key={i} className={`${i % 2 === 0 ? "bg-gray-975" : "bg-gray-1000-active"} table-item`}>
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
      </Table>
    </div>
  );
};

export default Mean;
