import { useEffect, useState } from "react";
import { RiCheckboxCircleFill } from "react-icons/ri";
import Loader from "../../../components/Loader";
import api from "../../../services/api";
import { captureError } from "../../../services/error";

const Bots = () => {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.post("/warning-bot/search");
        if (!res.ok) throw res;
        setBots(res.data);
      } catch (error) {
        captureError(error);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="mb-6 space-y-6">
      <h2 className="text-2xl font-bold">Bots</h2>
      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader />
        </div>
      ) : (
        <div className="space-y-4">
          {bots.map((bot) => (
            <BotRow key={bot._id} bot={bot} />
          ))}
        </div>
      )}
    </div>
  );
};

const STATS_LABELS = {
  print: "impressions",
  click: "redirections",
  apply: "candidatures",
  account: "comptes",
};

const BotRow = ({ bot }) => {
  const [statBot, setStatBot] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/warning-bot/${bot._id}/stat`);
        if (!res.ok) {
          if (res.code === "NOT_FOUND") {
            setStatBot(null);
            return;
          }
          throw res;
        }
        setStatBot(res.data || null);
        setStats(res.aggs || null);
      } catch (error) {
        captureError(error, { extra: { botId: bot._id } });
      }
    };
    fetchData();
  }, [bot.hash]);

  const handleBlock = async () => {
    try {
      setLoading(true);
      const res = await api.post(`/warning-bot/${bot._id}/block`);
      if (!res.ok) throw res;
      setStatBot(res.data);
    } catch (error) {
      captureError(error, { extra: { botId: bot._id } });
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async () => {
    try {
      setLoading(true);
      const res = await api.post(`/warning-bot/${bot._id}/unblock`);
      if (!res.ok) throw res;
      setStatBot(null);
    } catch (error) {
      captureError(error, { extra: { botId: bot._id } });
    } finally {
      setLoading(false);
    }
  };

  if (!stats) return null;
  return (
    <div className="bg-white p-6 shadow-sm">
      <p className="text-lg font-bold">Identifiant: {bot.hash}</p>
      <p className="text-sm">User Agent: {bot.userAgent}</p>
      <p className="mt-6 text-sm">
        <span className="font-bold">Statistiques:</span>{" "}
        {stats.type.length > 0 ? stats.type.map((b) => `${(b.doc_count || 0).toLocaleString("fr")} ${STATS_LABELS[b.key]}`).join(", ") : "Aucune statistique"}
      </p>
      <p className="mt-2 text-sm">
        <span className="font-bold">Partenaires diffuseurs:</span>{" "}
        {stats.publisherFrom.length > 0 ? stats.publisherFrom.map((b) => `${(b.doc_count || 0).toLocaleString("fr")} ${b.name}`).join(", ") : "Aucun partenaire diffuseur"}
      </p>
      <p className="mt-2 text-sm">
        <span className="font-bold">Partenaires annonceurs:</span>{" "}
        {stats.publisherTo.length > 0 ? stats.publisherTo.map((b) => `${(b.doc_count || 0).toLocaleString("fr")} ${b.name}`).join(", ") : "Aucun partenaire annonceur"}
      </p>

      <div className="mt-6 flex items-center justify-end gap-2">
        {statBot ? (
          <div className="flex flex-col items-end justify-end gap-2">
            <div className="flex items-center gap-2">
              <RiCheckboxCircleFill className="text-green-success" /> <p className="text-green-success">Marqué comme bots (les stats n'apparaîtront pas dans le dashboard)</p>
            </div>
            <button className="red-btn w-56" onClick={handleUnblock} disabled={loading}>
              {loading ? <Loader className="h-4 w-4 text-white" /> : "Démarquer comme bots"}
            </button>
          </div>
        ) : (
          <button className="primary-btn w-56" onClick={handleBlock} disabled={loading}>
            {loading ? <Loader className="h-4 w-4 text-white" /> : "Marquer comme bots"}
          </button>
        )}
      </div>
    </div>
  );
};

export default Bots;
