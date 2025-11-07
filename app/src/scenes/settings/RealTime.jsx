import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import Table from "../../components/NewTable";
import RadioInput from "../../components/RadioInput";
import api from "../../services/api";
import { API_URL } from "../../services/config";
import { captureError } from "../../services/error";
import useStore from "../../services/store";
import { timeSince } from "../../services/utils";

const TABLE_HEADER = [{ title: "Mission", colSpan: 2 }, { title: "Type" }, { title: "Source" }, { title: "Destination" }, { title: "Activité", position: "right" }];
const MAX_EVENTS = 25;

const RealTime = () => {
  const { publisher, flux } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [type, setType] = useState(searchParams.get("type") || "print");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const titleSuffix = useMemo(
    () => ({ apply: "des candidatures", click: "des redirections", print: "des impressions", account: "des créations de compte" })[type] || "des activités",
    [type],
  );

  const descriptionSuffix = useMemo(
    () =>
      ({
        apply: " des dernières candidatures",
        click: " des dernières redirections",
        print: " des dernières impressions",
      })[type] || " de toutes les dernières activités",
    [type],
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const query = {
          type,
          size: MAX_EVENTS,
        };

        if (flux === "from") query.fromPublisherId = publisher.id;
        if (flux === "to") query.toPublisherId = publisher.id;

        const res = await api.post("/stats/search", query);

        if (!res.ok) throw res;
        setEvents((res.data || []).slice(0, MAX_EVENTS));
        setSearchParams(type ? { type } : {});
      } catch (error) {
        captureError(error, "Une erreur est survenue lors de la récupération des données");
      }
      setLoading(false);
    };

    if (!publisher?._id) {
      return;
    }

    setLoading(true);
    fetchData();
  }, [flux, publisher, setSearchParams, type]);

  return (
    <div className="space-y-12 p-12">
      <title>Événements en temps réel - Paramètres - API Engagement</title>
      <div className="space-y-8 border border-gray-900 p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="w-[40%] space-y-2">
            <h2 className="text-3xl font-bold">Activité {titleSuffix} en temps réel</h2>
            <p className="text-gray-425 mb-4 text-xs">L'historique{descriptionSuffix}</p>
          </div>
          <div className="flex items-center gap-4">
            <RadioInput id="type-print" name="type" value="print" label="Impressions" checked={type === "print"} onChange={(e) => setType(e.target.value)} />
            <RadioInput id="type-click" name="type" value="click" label="Redirections" checked={type === "click"} onChange={(e) => setType(e.target.value)} />
            <RadioInput id="type-apply" name="type" value="apply" label="Candidatures" checked={type === "apply"} onChange={(e) => setType(e.target.value)} />
            <RadioInput id="type-account" name="type" value="account" label="Créations de compte" checked={type === "account"} onChange={(e) => setType(e.target.value)} />
          </div>
        </div>

        <Table header={TABLE_HEADER} total={events.length} loading={loading}>
          {events.map((item, i) => (
            <tr key={i} className={`${i % 2 === 0 ? "bg-gray-975" : "bg-gray-1000-active"} table-item`}>
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
              <td className="px-4 text-right">{timeSince(new Date(item.createdAt))}</td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
};

export default RealTime;
