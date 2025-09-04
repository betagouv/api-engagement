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
        captureError(error, "Erreur lors de la récupération des données");
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="mb-6 space-y-6">
      <h2 className="text-2xl font-bold">Bots</h2>
      {loading ? (
        <div className="flex justify-center items-center h-96">
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
          console.log(res);
          if (res.code === "NOT_FOUND") {
            setStatBot(null);
          } else {
            captureError(res, "Erreur lors de la récupération des données");
          }
        }
        setStatBot(res.data || null);
        setStats(res.aggs || null);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
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
      captureError(error, "Erreur lors de la récupération des données");
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
      captureError(error, "Erreur lors de la récupération des données");
    } finally {
      setLoading(false);
    }
  };

  if (!stats) return null;
  return (
    <div className="bg-white shadow-sm p-6">
      <p className="text-lg font-bold">Identifiant: {bot.hash}</p>
      <p className="text-sm">User Agent: {bot.userAgent}</p>
      <p className="mt-6 text-sm">
        <span className="font-bold">Statistiques:</span> {stats.type.map((b) => `${(b.doc_count || 0).toLocaleString("fr")} ${STATS_LABELS[b.key]}`).join(", ")}
      </p>
      <p className="mt-6 text-sm">
        <span className="font-bold">Partenaires:</span> {stats.publisherTo.map((b) => `${(b.doc_count || 0).toLocaleString("fr")} ${b.name}`).join(", ")}
      </p>

      <div className="mt-6 flex items-center justify-end gap-2">
        {statBot ? (
          <div className="flex flex-col justify-end gap-2">
            <div className="flex items-center gap-2">
              <RiCheckboxCircleFill className="text-green-main" /> <p className="text-green-main">Marquer comme bots</p>
            </div>
            <button className="red-button" onClick={handleUnblock} disabled={loading}>
              {loading ? <Loader className="w-4 h-4 text-white" /> : "Démarquer comme bots"}
            </button>
          </div>
        ) : (
          <button className="filled-button" onClick={handleBlock} disabled={loading}>
            {loading ? <Loader className="w-4 h-4 text-white" /> : "Marquer comme bots"}
          </button>
        )}
      </div>
    </div>
  );
};

export default Bots;
