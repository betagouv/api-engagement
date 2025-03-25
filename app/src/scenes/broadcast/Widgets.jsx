import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { RiAddFill, RiEditFill, RiEyeFill, RiSearchLine } from "react-icons/ri";
import { Link } from "react-router-dom";

import Loader from "../../components/Loader";
import TablePagination from "../../components/NewTablePagination";
import Toggle from "../../components/Toggle";
import api from "../../services/api";
import { BENEVOLAT_URL, VOLONTARIAT_URL } from "../../services/config";
import { captureError } from "../../services/error";
import useStore from "../../services/store";

const TABLE_HEADER = [{ title: "Nom", colSpan: 3 }, { title: "Diffuse des missions de", colSpan: 2 }, { title: "Crée le" }, { title: "Actions" }, { title: "Actif" }];

const Widgets = () => {
  const { user, publisher } = useStore();
  const [filters, setFilters] = useState({
    fromPublisherId: publisher?._id || "",
    active: true,
    page: 1,
    pageSize: 10,
    search: "",
  });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/widget/search`, filters);
      if (!res.ok) throw res;
      setData(res.data || []);
    } catch (error) {
      captureError(error, "Erreur lors du chargement des données");
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    setFilters({ ...filters, search: e.target.value, page: 1 });
  };

  const handleActivate = async (value, item) => {
    try {
      const res = await api.put(`/widget/${item._id}`, { active: value });
      if (!res.ok) throw res;
      setData((widgets) => widgets.map((w) => (w._id === res.data._id ? res.data : w)));
    } catch (error) {
      captureError(error, "Erreur lors de la mise à jour des données");
    }
  };

  return (
    <div className="space-y-6 p-12">
      <Helmet>
        <title>Widgets - Diffuser des missions - API Engagement</title>
      </Helmet>
      <div className="mb-10 flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <label htmlFor="widget-search" className="sr-only">
            Chercher par nom
          </label>
          <input id="widget-search" className="input w-full pl-4 pr-10 italic" name="widget-search" placeholder="Chercher par nom" onChange={handleSearch} />
          <RiSearchLine className="absolute right-3 top-1/2 transform -translate-y-1/2" />
        </div>
        {user.role === "admin" && (
          <Link to="/broadcast/widget/new" className="filled-button flex items-center">
            Créer un widget <RiAddFill className="ml-2" />
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex h-full items-center justify-center">
          <Loader />
        </div>
      ) : (
        <>
          <div className="flex justify-between">
            <p className="font-semibold text-lg">{data.length > 1 ? `${data.length} widgets` : `${data.length} widget`}</p>
            {user.role === "admin" && (
              <div className="relative flex items-center">
                <Toggle value={!filters.active} onChange={(checked) => setFilters({ ...filters, active: !checked, page: 1 })} />
                <label className="ml-2">Afficher les widgets désactivés</label>
              </div>
            )}
          </div>

          <TablePagination header={TABLE_HEADER} page={filters.page} pageSize={filters.pageSize} onPageChange={(page) => setFilters({ ...filters, page })} total={data.length}>
            {data.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize).map((item, i) => (
              <tr key={i} className={`${i % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-item`}>
                <td className="px-4" colSpan={3}>
                  <Link to={`/broadcast/widget/${item._id}`} className="text-blue-dark truncate">
                    {item.name}
                  </Link>
                </td>
                <td className={`px-4 ${!item.active ? "opacity-50" : "opacity-100"}`} colSpan={2}>
                  {item.publishers
                    .slice(0, 3)
                    .map((p) => p.name)
                    .join(", ")}
                  {item.publishers.length > 3 ? ` +${item.publishers.length - 3}` : ""}
                </td>
                <td className={`${!item.active ? "opacity-50" : "opacity-100"} px-4`}>{new Date(item.createdAt).toLocaleDateString("fr")}</td>
                <td className="px-4 flex gap-2 text-lg mt-3">
                  <Link className="cursor-pointer border border-blue-dark p-2" to={`/broadcast/widget/${item._id}`}>
                    <RiEditFill className="text-blue-dark" />
                  </Link>
                  <a
                    className="cursor-pointer border border-blue-dark p-2"
                    href={`${item.type === "volontariat" ? VOLONTARIAT_URL : BENEVOLAT_URL}?widget=${item._id}&notrack=true`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <RiEyeFill className="text-blue-dark" />
                  </a>
                </td>
                {user.role === "admin" && (
                  <td className="px-4">
                    <Toggle value={item.active} onChange={(v) => handleActivate(v, item)} />
                  </td>
                )}
              </tr>
            ))}
          </TablePagination>
        </>
      )}
    </div>
  );
};

export default Widgets;
