import { useEffect, useState } from "react";
import { RiCheckboxCircleFill, RiCloseCircleFill } from "react-icons/ri";
import { toast } from "react-toastify";

import Loader from "../../components/Loader";
import Modal from "../../components/New-Modal";

import Table from "../../components/NewTable";
import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";

const TABLE_HEADER = [
  { title: "Date", key: "endedAt", position: "left" },
  { title: "Durée (en secondes)", key: "duration", position: "center" },
  { title: "Mise à jour", key: "updatedCount", position: "center" },
  { title: "Création", key: "createdCount", position: "center" },
  { title: "Suppressions", key: "deletedCount", position: "center" },
  { title: "Total des missions", key: "missionCount", position: "center" },
];

const Flux = () => {
  const { user, publisher } = useStore();
  const [filters, setFilters] = useState({
    page: 1,
    size: 5,
  });
  const [imports, setImports] = useState([]);
  const [total, setTotal] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const query = {
          publisherId: publisher.id,
          size: filters.size,
          skip: (filters.page - 1) * filters.size,
        };

        const res = await api.post(`/import/search`, query);

        if (!res.ok) throw res;
        setImports(res.data);
        setTotal(res.total);
        if (res.data.length > 0) {
          if (!lastSync || new Date(res.data[0].finishedAt) > new Date(lastSync)) {
            setLastSync(new Date(res.data[0].finishedAt).toISOString());
          }
        }
      } catch (error) {
        captureError(error, { extra: { publisherId: publisher.id, filters } });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [publisher, filters]);

  const buildDuration = (d1, d2) => {
    const diff = Math.abs(d1 - d2);
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor(((diff % 360000) % 60000) / 1000);
    if (hours === 0 && minutes === 0) return `${seconds}s`;
    if (hours === 0) return `${minutes}min ${seconds}s`;
    return `${hours}h ${minutes}min ${seconds}s`;
  };

  return (
    <div className="space-y-12 p-12">
      <title>Flux de missions - Paramètres - API Engagement</title>
      <div className="space-y-8 border border-gray-900 p-8">
        <h2 className="text-3xl font-bold">Configurer votre flux de missions</h2>

        <div className="flex items-center justify-between gap-6">
          <label className="w-[35%] flex-none font-semibold">Lien du fichier XML à synchroniser</label>
          <div className="flex flex-1 gap-2">
            <input className="input w-full border border-[#E3E3FD] bg-[#F5F5FE] read-only:opacity-80" value={publisher.feed} readOnly />
            {user.role === "admin" && <ModifyModal />}
          </div>
        </div>

        <div className="h-px w-full bg-gray-900" />

        <div className="flex items-center justify-between gap-6">
          <label className="w-[35%] font-semibold">Dernière synchronisation</label>
          <div className="flex flex-1 gap-2">
            {imports.length > 0 && lastSync < new Date(Date.now() - 24 * 60 * 60 * 1000) ? (
              <div className="items-center">
                <p className="inline align-middle">{new Date(lastSync).toLocaleString("fr").replace(" ", " à ")}</p>
                <RiCloseCircleFill className="text-red-error ml-2 inline h-5 w-5 align-middle" />
                <p className="text-xs">Dernière synchronisation il y a plus de 24h.</p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p>{imports.length > 0 && new Date(lastSync).toLocaleString("fr").replace(" ", " à ")}</p>
                <RiCheckboxCircleFill className="mr-1 h-5 w-5 text-green-700" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6 border border-gray-900 p-6">
        <h2 className="text-3xl font-bold">Historique des synchronisations</h2>

        <Table
          header={TABLE_HEADER}
          pagination
          page={filters.page}
          pageSize={filters.size}
          onPageChange={(page) => setFilters({ ...filters, page })}
          total={total}
          loading={loading}
        >
          {imports.map((item, i) => (
            <tr key={i} className={`${i % 2 === 0 ? "bg-gray-975" : "bg-gray-1000-active"} table-item`}>
              <td className="px-2">{new Date(item.finishedAt).toLocaleString("fr").replace(" ", " • ")}</td>
              <td className="px-4 text-center">{buildDuration(new Date(item.startedAt), new Date(item.finishedAt))}</td>
              <td className="px-4 text-center">{item.updatedCount?.toLocaleString("fr") || "-"}</td>
              <td className="px-4 text-center">{item.createdCount?.toLocaleString("fr") || "-"}</td>
              <td className="px-4 text-center">{item.deletedCount?.toLocaleString("fr") || "-"}</td>
              <td className="px-4 text-center">{item.missionCount?.toLocaleString("fr") || "-"}</td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
};

const ModifyModal = () => {
  const { publisher, setPublisher } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [feed, setFeed] = useState(publisher.feed);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFeed(publisher.feed);
  }, [publisher.feed]);

  const handleFeedSubmit = async () => {
    try {
      setLoading(true);
      const res = await api.put(`/publisher/${publisher.id}`, { feed });

      if (!res.ok) throw res;

      toast.success("Flux mis à jour");
      setPublisher(res.data);
      setIsOpen(false);
    } catch (error) {
      captureError(error, { extra: { publisherId: publisher.id, feed } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="primary-btn" onClick={() => setIsOpen(!isOpen)}>
        Modifier
      </button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="p-10">
          <h2 className="mb-8 text-lg font-bold">
            <span aria-hidden="true">⚙️</span> Modifier votre flux de missions
          </h2>
          <div className="flex flex-col items-start justify-between gap-4">
            <div>Lien du fichier XML à synchroniser</div>
            <input className="input w-full border-b-0 bg-gray-100 p-4 focus:ring-2" value={feed} onChange={(e) => setFeed(e.target.value)} />
          </div>
          <div className="col-span-2 mt-8 flex justify-end gap-6">
            <button type="button" className="tertiary-btn" onClick={() => setIsOpen(false)}>
              Annuler
            </button>
            <button type="button" className="primary-btn" onClick={handleFeedSubmit} disabled={loading}>
              {loading ? <Loader className="mr-2" /> : "Enregister"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Flux;
