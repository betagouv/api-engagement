import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { RiCheckboxCircleFill, RiCloseCircleFill } from "react-icons/ri";
import { toast } from "react-toastify";

import Modal from "../../components/New-Modal";
import { TablePaginator } from "../../components/Table";
import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";

const Flux = () => {
  const { user, publisher, setPublisher } = useStore();
  const [filters, setFilters] = useState({
    size: 5,
    skip: 0,
  });
  const [imports, setImports] = useState([]);
  const [total, setTotal] = useState(0);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const query = new URLSearchParams();
        if (publisher._id) query.set("publisherId", publisher._id);
        if (filters.size) query.set("size", filters.size);
        if (filters.skip) query.set("skip", filters.skip);

        const res = await api.get(`/import?${query.toString()}`);

        if (!res.ok) throw res;
        setImports(res.data);
        setTotal(res.total);
        if (res.data.length > 0) {
          if (!lastSync || new Date(res.data[0].endedAt) > new Date(lastSync)) {
            setLastSync(new Date(res.data[0].endedAt).toISOString());
          }
        }
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
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
      <Helmet>
        <title>Flux de missions - Paramètres - API Engagement</title>
      </Helmet>
      <div className="border border-gray-border p-8 space-y-8">
        <h2 className="text-3xl font-bold">Configurer votre flux de missions</h2>

        <div className="flex justify-between gap-6 items-center">
          <label className="font-semibold flex-none w-[35%]">Lien du fichier XML à synchroniser</label>
          <div className="flex flex-1 gap-2">
            <input className="input disabled:opacity-80 w-full bg-[#F5F5FE] border border-[#E3E3FD]" value={publisher.feed} disabled={true} />
            {user.role === "admin" && <ModifyModal />}
          </div>
        </div>

        <div className="w-full h-px bg-gray-border" />

        <div className="flex justify-between gap-6 items-center">
          <label className="font-semibold w-[35%]">Dernière synchronisation</label>
          <div className="flex flex-1 gap-2">
            {imports.length > 0 && lastSync < new Date(Date.now() - 24 * 60 * 60 * 1000) ? (
              <div className="items-center">
                <p className="inline align-middle">{new Date(lastSync).toLocaleString("fr").replace(" ", " à ")}</p>
                <RiCloseCircleFill className="h-5 w-5 ml-2 align-middle text-red-500 inline" />
                <p className="text-xs">Dernière synchronisation il y a plus de 24h.</p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p>{imports.length > 0 && new Date(lastSync).toLocaleString("fr").replace(" ", " à ")}</p>
                <RiCheckboxCircleFill className="h-5 w-5 mr-1 text-green-700" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border border-gray-border p-6 space-y-6">
        <h2 className="text-3xl font-bold">Historique des synchronisations</h2>

        <TablePaginator
          data={imports}
          pageSize={filters.size}
          length={total}
          onPageChange={(page) => setFilters({ ...filters, skip: (page - 1) * filters.size })}
          renderHeader={() => (
            <>
              <h4 className="flex-1 pl-3">Date</h4>
              <h4 className="flex-1">Durée (en secondes)</h4>
              <h4 className="flex-1">Mise à jour</h4>
              <h4 className="flex-1">Création</h4>
              <h4 className="flex-1">Suppressions</h4>
            </>
          )}
          renderItem={(item) => (
            <>
              <span className="flex-1 pl-3">{new Date(item.endedAt).toLocaleString("fr").replace(" ", " • ")}</span>
              <span className="flex-1 pl-2">{buildDuration(new Date(item.startedAt), new Date(item.endedAt))}</span>
              <span className="flex-1 pl-2">{item.updatedCount}</span>
              <span className="flex-1 pl-2">{item.createdCount}</span>
              <span className="flex-1 pl-2">{item.deletedCount}</span>
            </>
          )}
        />
      </div>
    </div>
  );
};

const ModifyModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { publisher, setPublisher } = useStore();

  const handleFeedSubmit = async () => {
    try {
      const res = await api.put(`/publisher/${publisher._id}`, { feed: publisher.feed });

      if (!res.ok) throw res;

      toast.success("Flux mis à jour");
      setPublisher(res.data);
      setIsOpen(false);
    } catch (error) {
      captureError(error, "Erreur lors de la mise à jour du flux");
    }
  };

  return (
    <>
      <button className="flex cursor-pointer items-center bg-blue-dark hover:bg-blue-main py-2 px-4 border text-white" onClick={() => setIsOpen(!isOpen)}>
        Modifier
      </button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="p-10">
          <h2 className="text-lg font-bold mb-8">⚙️ Modifier votre flux de missions</h2>
          <div className="flex flex-col items-start gap-4 justify-between">
            <div>Lien du fichier XML à synchroniser</div>
            <input
              className="input w-full border-b-0 bg-gray-100 focus:ring-2 p-4"
              value={publisher.feed}
              disabled={false}
              onChange={(e) => setPublisher({ ...publisher, feed: e.target.value })}
            />
          </div>
          <div className="col-span-2 mt-8 flex justify-end gap-6">
            <button type="button" className="button border border-blue-dark text-blue-dark hover:bg-gray-hover" onClick={() => setIsOpen(false)}>
              Annuler
            </button>
            <button type="button" className="button bg-blue-dark text-white hover:bg-blue-main" onClick={handleFeedSubmit}>
              Enregister
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Flux;
