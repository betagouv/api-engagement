import { useEffect, useState } from "react";
import { RiAddFill, RiEditFill, RiFileCopyLine, RiLink } from "react-icons/ri";
import { Link } from "react-router-dom";
import { toast } from "../../services/toast";

import Table from "../../components/Table";
import Toggle from "../../components/Toggle";
import api from "../../services/api";
import { API_URL } from "../../services/config";
import { captureError } from "../../services/error";
import useStore from "../../services/store";

const TABLE_HEADER = [
  { title: "Nom", colSpan: 3 },
  { title: "Diffuse des missions de", colSpan: 2 },
  { title: "Crée le", colSpan: 1 },
  { title: "Actions", colSpan: 2 },
  { title: "Actif", colSpan: 1 },
];

const Campaigns = () => {
  const { user, publisher } = useStore();
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({
    fromPublisherId: publisher?.id || "",
    toPublisherId: "",
    search: "",
    page: 1,
    active: true,
    pageSize: 10,
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      const res = await api.post(`/campaign/search`, filters);
      if (!res.ok) throw res;
      setData(res.data || []);
    } catch (error) {
      captureError(error, { extra: { filters } });
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const res = await api.post(`/campaign/${id}/duplicate`);
      if (!res.ok) throw res;

      setData([res.data, ...data]);
      toast.success("Campagne dupliquée");
    } catch (error) {
      captureError(error, { extra: { id } });
    }
  };

  const handleCopy = (id) => {
    navigator.clipboard.writeText(`${API_URL}/r/campaign/${id}`);
    toast.success("Lien copié");
  };

  const handleActivate = async (value, item) => {
    try {
      const res = await api.put(`/campaign/${item.id}`, { active: value });
      if (!res.ok) throw res;
      setData((campaigns) => campaigns.map((c) => (c.id === res.data.id ? res.data : c)));
    } catch (error) {
      captureError(error, { extra: { item } });
    }
  };

  if (!data) return <h2 className="p-3">Chargement...</h2>;

  return (
    <div className="space-y-12 p-12">
      <title>API Engagement - Campagnes - Diffuser des missions</title>
      <div className="flex items-center justify-between gap-32">
        <div role="search" className="flex flex-1 items-center gap-4">
          <label htmlFor="campaign-search" className="sr-only">
            Chercher par nom
          </label>
          <input
            id="campaign-search"
            className="input flex-1"
            name="campaign-search"
            placeholder="Chercher par nom"
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
          />
          <label htmlFor="campaign-to-publisher" className="sr-only">
            Filtrer par annonceur
          </label>
          <select
            id="campaign-to-publisher"
            className="select flex-1"
            value={filters.toPublisherId}
            onChange={(e) => setFilters({ ...filters, toPublisherId: e.target.value, page: 1 })}
          >
            <option className="px-2" value="">
              Tous les annonceurs
            </option>
            {data
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
            <Link to="/broadcast/campaign/new" className="primary-btn flex items-center">
              Nouvelle campagne <RiAddFill className="ml-2" />
            </Link>
          )}
        </div>
      </div>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{data.length > 1 ? `${data.length} campagnes` : `${data.length} campagne`} </h2>
          <div>
            {user.role === "admin" && (
              <div className="mt-3 flex items-center">
                <Toggle aria-label="Afficher les campagnes désactivées" value={!filters.active} onChange={(checked) => setFilters({ ...filters, active: !checked, page: 1 })} />
                <label className="ml-2">Afficher les campagnes désactivées</label>
              </div>
            )}
          </div>
        </div>

        <Table header={TABLE_HEADER} pagination page={filters.page} pageSize={filters.pageSize} onPageChange={(page) => setFilters({ ...filters, page })} total={data.length}>
          {data.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize).map((item, i) => (
            <tr key={i} className={`${i % 2 === 0 ? "bg-gray-975" : "bg-gray-1000-active"} table-item`}>
              <td className="truncate px-4" colSpan={3}>
                <Link to={`/broadcast/campaign/${item.id}`} className="text-blue-france">
                  {item.name}
                </Link>
              </td>
              <td className={`px-4 ${!item.active ? "opacity-50" : "opacity-100"}`} colSpan={2}>
                {item.toPublisherName}
              </td>
              <td className={`px-4 ${!item.active ? "opacity-50" : "opacity-100"}`}>{new Date(item.createdAt).toLocaleDateString("fr")}</td>
              <td colSpan={2} className="px-4">
                <div className="flex gap-2 text-lg">
                  <Link className="secondary-btn flex items-center" to={`/broadcast/campaign/${item.id}`}>
                    <RiEditFill className="text-lg" role="img" aria-label="Modifier la campagne" />
                  </Link>
                  <button className="secondary-btn flex items-center" onClick={() => handleCopy(item.id)}>
                    <RiLink className="text-lg" role="img" aria-label="Copier le lien de la campagne" />
                  </button>
                  <button className="secondary-btn flex items-center" onClick={() => handleDuplicate(item.id)}>
                    <RiFileCopyLine className="text-lg" role="img" aria-label="Dupliquer la campagne" />
                  </button>
                </div>
              </td>
              {user.role === "admin" && (
                <td className="px-4">
                  <Toggle
                    aria-label={`${item.active ? "Désactiver" : "Activer"} la campagne ${item.name || ""}`.trim()}
                    value={item.active}
                    onChange={(v) => handleActivate(v, item)}
                  />
                </td>
              )}
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
};

export default Campaigns;
