import { useEffect, useState } from "react";
import { HiEye } from "react-icons/hi";
import { RiAddFill } from "react-icons/ri";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import Loader from "../../components/Loader";
import Modal from "../../components/Modal";
import { TablePaginator } from "../../components/Table";
import Toggle from "../../components/Toggle";
import api from "../../services/api";
import { BENEVOLAT_URL, VOLONTARIAT_URL } from "../../services/config";
import { captureError } from "../../services/error";
import useStore from "../../services/store";

const Widgets = () => {
  const pageSize = 25;
  const { user, publisher } = useStore();
  const [filters, setFilters] = useState({
    fromPublisherId: publisher?._id || "",
    active: true,
    page: 1,
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

  const handlePageChange = (page) => {
    setFilters({ ...filters, page });
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

  if (loading)
    return (
      <div className="py-12 flex items-center justify-center">
        <Loader />
      </div>
    );

  return (
    <div className="space-y-12 p-12">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">Diffuser des missions partenaires par Widget</h2>
          <p>Configurez des widgets pour diffuser les missions de vos partenaires</p>
        </div>
        <div>
          {user.role === "admin" && (
            <div className="relative mt-3 flex items-center">
              <Toggle checked={!filters.active} setChecked={(checked) => setFilters({ ...filters, active: !checked, page: 1 })} />
              <label className="ml-2">Afficher les widgets désactivés</label>
            </div>
          )}
        </div>
      </div>
      <div className="border border-gray-border p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="font-semibold">{data.length > 1 ? `${data.length} widgets` : `${data.length} widget`} </p>
          <input className="input flex-1" placeholder="Chercher par nom" onChange={handleSearch} />
          {user.role === "admin" && <Create />}
        </div>
        <TablePaginator
          data={data.slice((filters.page - 1) * pageSize, filters.page * pageSize)}
          length={data.length}
          onPageChange={handlePageChange}
          pageSize={pageSize}
          renderHeader={() => (
            <>
              <h4 className="flex-1 pl-3">Nom</h4>
              <h4 className="w-1/3">Diffuse des missions de</h4>
              <h4 className="w-1/6">Crée le</h4>
              <h4 className="w-1/6">Action</h4>
              {user.role === "admin" && <h4 className="w-[8%] text-center">Actif</h4>}
            </>
          )}
          renderItem={(item) => (
            <>
              <Link to={`/widget/${item._id}`} className={`flex-1 px-3 text-blue-dark truncate ${!item.active ? "opacity-50" : "opacity-100"}`}>
                {item.name}
              </Link>
              <span className={`w-1/3 ${!item.active ? "opacity-50" : "opacity-100"}`}>
                {item.publishers
                  .slice(0, 3)
                  .map((p) => p.name)
                  .join(", ")}
                {item.publishers.length > 3 ? ` +${item.publishers.length - 3}` : ""}
              </span>
              <span className={`w-1/6 ${!item.active ? "opacity-50" : "opacity-100"}`}>{new Date(item.createdAt).toLocaleDateString("fr")}</span>
              <div className={`flex w-1/6 gap-3 text-lg ${!item.active ? "opacity-50" : "opacity-100"}`}>
                <a
                  className="cursor-pointer border border-black p-2 text-black"
                  href={`${item.type === "volontariat" ? VOLONTARIAT_URL : BENEVOLAT_URL}?widget=${item._id}`}
                  target="_blank"
                >
                  <HiEye />
                </a>
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

const Create = () => {
  const { publisher } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState({ name: "" });
  const [error, setError] = useState({});

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues({ ...values, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!values.name) {
        setError({ name: "Le nom est requis" });
        return;
      }

      const res = await api.post(`/widget`, { name: values.name, color: "#000091", publisherId: publisher._id });
      if (!res.ok) {
        if (res.code === "RESSOURCE_ALREADY_EXIST") {
          setLoading(false);
          return setError({ name: "Ce nom est déjà utilisé" });
        }
        throw res;
      }
      toast.success(`Ajout du widget ${values.name}`);
      navigate(`/widget/${res.data._id}`);
      setIsOpen(false);
    } catch (error) {
      captureError(error, "Erreur lors de la création du widget");
    }
    setLoading(false);
  };

  const onClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <button className="filled-button h-10 flex items-center justify-center" onClick={() => setIsOpen(true)}>
        Nouveau widget <RiAddFill className="ml-2" />
      </button>

      <Modal isOpen={isOpen} onClose={onClose}>
        <form className="p-10 space-y-6" onSubmit={handleSubmit}>
          <h2 className="text-3xl font-bold">Créer un nouveau widget</h2>

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-semibold">
              Nom
            </label>
            <input className="input w-full" id="name" name="name" value={values.name} onChange={handleChange} />
            {error.name && <p className="text-red-500 text-sm">{error.name}</p>}
          </div>
          <div className="flex justify-end gap-4">
            <button type="button" className="empty-button" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="filled-button" disabled={values.name === "" || loading}>
              {loading ? <Loader className="w-6 h-6" /> : "Valider"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default Widgets;
