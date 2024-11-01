import { useEffect, useState } from "react";
import { HiLink } from "react-icons/hi";
import { RiAddFill, RiFileCopyLine } from "react-icons/ri";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Tooltip } from "react-tooltip";

import { TablePaginator } from "../../components/Table";
import Toggle from "../../components/Toggle";
import api from "../../services/api";
import { API_URL } from "../../services/config";
import { captureError } from "../../services/error";
import useStore from "../../services/store";

const Campaigns = () => {
  const pageSize = 25;
  const { user, publisher } = useStore();
  const [campaigns, setCampaigns] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [filters, setFilters] = useState({
    fromPublisherId: publisher?._id || "",
    toPublisherId: "",
    search: "",
    active: !showAll,
    page: 1,
  });

  useEffect(() => {
    fetchData();
  }, [filters, showAll]);

  const fetchData = async () => {
    try {
      const res = await api.post(`/campaign/search`, {
        ...filters,
        active: showAll ? undefined : true,
      });
      if (!res.ok) throw res;
      setCampaigns(res.data || []);
    } catch (error) {
      captureError(error, "Erreur lors du chargement des données");
    }
  };

  const handleSearch = (e) => {
    setFilters({ ...filters, search: e.target.value, page: 1 });
  };

  const handlePageChange = (page) => {
    setFilters({ ...filters, page });
  };

  const handleDuplicate = async (id) => {
    try {
      const res = await api.post(`/campaign/${id}/duplicate`);
      if (!res.ok) throw res;

      setCampaigns([res.data, ...campaigns]);
      toast.success("Campagne dupliquée");
    } catch (error) {
      captureError(error, "Erreur lors de la duplication de la campagne");
    }
  };

  const handleCopy = (id) => {
    navigator.clipboard.writeText(`${API_URL}/r/campaign/${id}`);
    toast.success("Lien copié");
  };

  const handleActivate = async (value, item) => {
    try {
      const res = await api.put(`/campaign/${item._id}`, { active: value });
      if (!res.ok) throw res;
      setCampaigns((campaigns) => campaigns.map((c) => (c._id === res.data._id ? res.data : c)));
    } catch (error) {
      captureError(error, "Erreur lors de la mise à jour des données");
    }
  };

  if (!campaigns) return <h2 className="p-3">Chargement...</h2>;

  return (
    <div className="space-y-12 p-12">
      <div className="flex items-center gap-32 justify-between">
        <div className="flex items-center gap-4 flex-1">
          <input className="input flex-1" placeholder="Chercher par nom" onChange={handleSearch} />
          <select className="select flex-1" value={filters.toPublisherId} onChange={(e) => setFilters({ ...filters, toPublisherId: e.target.value, page: 1 })}>
            <option className="px-2" value="">
              Tous les annonceurs
            </option>
            {campaigns
              .map((c) => ({ id: c.toPublisherId, name: c.toPublisherName }))
              .filter((c, i, s) => s.findIndex((e) => e.id === c.id) === i)
              .sort((a, b) => (a.name || "").localeCompare(b.name))
              .map((c, i) => (
                <option key={i} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>
        <div className="flex items-center gap-4">
          {user.role === "admin" && (
            <Link to="/campaign/new" className="button flex items-center bg-blue-dark text-white hover:bg-blue-main">
              Nouvelle campagne <RiAddFill className="ml-2" />
            </Link>
          )}
        </div>
      </div>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{campaigns.length > 1 ? `${campaigns.length} campagnes` : `${campaigns.length} campagne`} </h2>
          <div>
            {user.role === "admin" && (
              <div className="mt-3 flex items-center">
                <Toggle
                  checked={showAll}
                  setChecked={(checked) => {
                    setShowAll(checked);
                    setFilters({ ...filters, active: !checked, page: 1 });
                  }}
                />
                <label className="ml-2">Afficher les campagnes désactivées</label>
              </div>
            )}
          </div>
        </div>

        <TablePaginator
          data={campaigns.slice((filters.page - 1) * pageSize, filters.page * pageSize)}
          length={campaigns.length}
          onPageChange={handlePageChange}
          pageSize={pageSize}
          renderHeader={() => (
            <>
              <h4 className="flex-1 pl-3">Nom</h4>
              <h4 className="w-1/6">Type</h4>
              <h4 className="w-1/5">Diffuse des missions de</h4>
              <h4 className="w-1/6">Créée le</h4>
              <h4 className="w-1/6 text-center">Actions</h4>
              {user.role === "admin" && <h4 className="w-[8%] text-center">Active</h4>}
            </>
          )}
          renderItem={(item) => (
            <>
              {user.role === "admin" ? (
                <Link to={`/campaign/${item._id}`} className={`flex-1 px-3 text-blue-dark ${item.active ? "opacity-100" : "opacity-50"}`}>
                  {item.name}
                </Link>
              ) : (
                <span className={`flex-1 px-3 ${item.active ? "opacity-100" : "opacity-50"}`}>{item.name}</span>
              )}
              <span className={`w-1/6 ${item.active ? "opacity-100" : "opacity-50"}`}>{item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1).toLowerCase() : ""}</span>{" "}
              <span className={`w-1/5 ${item.active ? "opacity-100" : "opacity-50"}`}>{item.toPublisherName}</span>
              <span className={`w-1/6 ${item.active ? "opacity-100" : "opacity-50"}`}>{new Date(item.createdAt).toLocaleDateString("fr")}</span>
              <div className={`flex justify-center w-1/6 gap-3 text-lg ${item.active ? "opacity-100" : "opacity-50"}`}>
                <button data-tooltip-id="copy-link-btn" className="border border-blue-dark p-2 text-blue-dark" onClick={() => handleCopy(item._id)}>
                  <HiLink />
                </button>
                <Tooltip id="copy-link-btn" className="text-sm">
                  Copier le lien
                </Tooltip>
                <button data-tooltip-id="duplicate-btn" className="border border-blue-dark p-2 text-blue-dark" onClick={() => handleDuplicate(item._id)}>
                  <RiFileCopyLine />
                </button>
                <Tooltip id="duplicate-btn" className="text-sm">
                  Dupliquer la campagne
                </Tooltip>
              </div>
              {user.role === "admin" && (
                <div className="flex w-[8%] items-center justify-center">
                  <Toggle checked={item.active} setChecked={(v) => handleActivate(v, item)} />
                </div>
              )}
            </>
          )}
        />
      </div>
    </div>
  );
};

export default Campaigns;
