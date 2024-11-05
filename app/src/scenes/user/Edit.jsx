import _ from "lodash";
import { useEffect, useState } from "react";
import { RiCloseFill, RiErrorWarningFill, RiFileCopyFill } from "react-icons/ri";
import { TiDeleteOutline } from "react-icons/ti";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import validator from "validator";

import Modal from "../../components/Modal";
import { Table } from "../../components/Table";
import api from "../../services/api";
import { captureError } from "../../services/error";

const Edit = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [publishers, setPublishers] = useState([]);
  const [values, setValues] = useState({
    firstname: "",
    lastname: "",
    email: "",
    role: "user",
    publishers: [],
  });
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resU = await api.get(`/user/${id}`);
        if (!resU.ok) throw resU;
        setUser(resU.data);
        setValues(resU.data);

        const resP = await api.get("/publisher");
        if (!resP.ok) throw resP;
        setPublishers(resP.data.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        captureError(error, "Une erreur est survenue lors de la récupération des données");
        navigate("/accounts");
      }
    };
    fetchData();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValues({
      ...values,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handlePublisherChange = (id, checked) => {
    setValues((prevValues) => ({
      ...prevValues,
      publishers: checked ? [...prevValues.publishers, id] : prevValues.publishers.filter((pub) => pub !== id),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    if (validator.isEmpty(values.firstname)) errors.firstname = "Le prénom est requis";
    if (!validator.isEmail(values.email)) errors.email = "Adresse email invalide";
    if (values.role !== "admin" && values.role !== "user") errors.role = "Le rôle renseigné est invalide";
    if (values.publishers.length === 0) errors.publishers = "Veuillez sélectionner au moins un partenaire";

    setErrors(errors);

    if (Object.keys(errors).length > 0) return;

    try {
      const res = await api.put(`/user/${id}`, values);
      if (!res.ok) throw res;
      setUser(res.data);
      toast.success("Paramètres mis à jour");
    } catch (error) {
      captureError(error, "Erreur lors de la mise à jour de l'utilisateur");
    }
  };

  const handleInviteAgain = async () => {
    try {
      const res = await api.put(`/user/${id}/invite-again`);
      if (!res.ok) throw res;
      toast.success("Invitation envoyée");
    } catch (error) {
      captureError(error, "Erreur lors de l'envoi de l'invitation");
    }
  };

  const handleDelete = async () => {
    const confirm = window.confirm("Etes vous sur ?");
    if (!confirm) return;

    try {
      const res = await api.delete(`/user/${id}`);
      if (!res.ok) throw res;
      toast.success("Utilisateur supprimé");
      navigate("/accounts");
    } catch (error) {
      captureError(error, "Erreur lors de la suppression de l'utilisateur");
    }
  };

  const isChanged = () => !_.isEqual(values, user);
  const isErrors = () => errors.firstname || errors.email || errors.role;

  if (!user) return <h1 className="text-4xl font-bold">Chargement...</h1>;

  return (
    <div className="flex flex-col">
      <div className="mb-10">
        <h1 className="text-4xl font-bold">Compte utilisateur de {user.firstname}</h1>
      </div>
      <form className="flex flex-col bg-white p-16 shadow-lg" onSubmit={handleSubmit}>
        <div className="mb-6 flex justify-between">
          <h2 className="text-3xl font-bold">Les informations</h2>

          <div className="flex cursor-pointer items-center text-sm text-red-main" onClick={handleDelete}>
            <TiDeleteOutline className="mr-2" />
            <span>Supprimer</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-5">
          <div className="flex flex-col">
            <label className="mb-2 text-sm" htmlFor="firstname">
              Prénom
            </label>
            <input className={`input mb-2 ${errors.firstname ? "border-b-red-main" : "border-b-black"}`} name="firstname" value={values.firstname} onChange={handleChange} />
            {errors.firstname && (
              <div className="flex items-center text-sm text-red-main">
                <RiErrorWarningFill className="mr-2" />
                {errors.firstname}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-sm" htmlFor="lastname">
              Nom de famille
            </label>
            <input className={`input mb-2 ${errors.lastname ? "border-b-red-main" : "border-b-black"}`} name="lastname" value={values.lastname} onChange={handleChange} />
            {errors.lastname && (
              <div className="flex items-center text-sm text-red-main">
                <RiErrorWarningFill className="mr-2" />
                {errors.lastname}
              </div>
            )}
          </div>

          <div className="col-span-2 flex flex-col">
            <label className="mb-2 text-sm" htmlFor="email">
              E-mail
            </label>
            <input className={`input mb-2 ${errors.email ? "border-b-red-main" : "border-b-black"}`} name="email" value={values.email} onChange={handleChange} />
            {errors.email && (
              <div className="flex items-center text-sm text-red-main">
                <RiErrorWarningFill className="mr-2" />
                {errors.email}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <label className="mb-2 text-sm" htmlFor="role">
              Rôle
            </label>

            <select className={`input mb-2 ${errors.role ? "border-b-red-main" : "border-b-black"}`} value={values.role} onChange={handleChange} name="role">
              <option value="user">Utilisateur</option>
              <option value="admin">Admin</option>
            </select>
            {errors.role && (
              <div className="flex items-center text-sm text-red-main">
                <RiErrorWarningFill className="mr-2" />
                {errors.role}
              </div>
            )}
          </div>

          <div className="flex w-full justify-center pt-[1.625rem] text-right">
            <ResetPasswordModal user={user} />
          </div>

          <div className="col-span-2 flex flex-col">
            <label className="mb-2 text-sm" htmlFor="publishers">
              Partenaires
            </label>

            <input className="w-64 mb-4 input flex-1 bg-gray-light px-3 py-2 text-sm" placeholder="Rechercher" value={search} onChange={(e) => setSearch(e.target.value)} />

            {values.publishers.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {values.publishers.map((p, i) => (
                  <div key={i} className="flex items-center rounded bg-blue-light p-2">
                    <span className="text-xs">{publishers.find((pub) => pub._id === p)?.name}</span>
                    <button type="button" className="ml-2" onClick={() => handlePublisherChange(p, false)}>
                      <RiCloseFill className="text-xs" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Table
              data={publishers.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))}
              maxHeigth="max-h-96"
              renderHeader={() => (
                <>
                  <h4 className="w-24" />
                  <h4 className="flex-1">Nom</h4>
                  <h4 className="flex-1 text-center">Rôles</h4>
                </>
              )}
              renderItem={(item) => (
                <>
                  <div className="w-24 pl-3">
                    <input
                      type="checkbox"
                      className="checkbox"
                      onChange={(e) => handlePublisherChange(item._id.toString(), e.target.checked)}
                      checked={values.publishers.includes(item._id.toString())}
                    />
                  </div>
                  <div className="flex-1">{item.name}</div>
                  <div className="flex-1">
                    <div className="flex flex-wrap justify-center gap-2">
                      {item.role_promoteur && <span className="rounded bg-red-light p-2">Annonceur</span>}
                      {item.role_annonceur_api && <span className="rounded bg-green-light p-2">Diffuseur API</span>}
                      {item.role_annonceur_widget && <span className="rounded bg-green-light p-2">Diffuseur Widget</span>}
                      {item.role_annonceur_campagne && <span className="rounded bg-green-light p-2">Diffuseur Campagne</span>}
                    </div>
                  </div>
                </>
              )}
            />
          </div>

          <div className="col-span-2 flex justify-end gap-4">
            <Link to="/accounts?tab=users" className="button border border-black text-black hover:bg-gray-hover">
              Retour
            </Link>
            <button type="button" className="button bg-blue-dark text-white hover:bg-blue-main" onClick={handleInviteAgain}>
              Renvoyer l'invitation
            </button>
            <button type="submit" className="button bg-blue-dark text-white hover:bg-blue-main" disabled={!isChanged() || isErrors()}>
              Mettre à jour
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const ResetPasswordModal = ({ user }) => {
  const [open, setOpen] = useState(false);
  const [isConfirm, setIsConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (!open) {
      setIsConfirm(false);
      setNewPassword("");
    }
  }, [open]);

  const handleCopy = (value) => {
    navigator.clipboard.writeText(value);
    toast.success("Copié dans le presse-papier");
  };

  const handleConfirm = async () => {
    setIsConfirm(true);
    try {
      const res = await api.put(`/user/${user._id}/reset-password`);
      if (!res.ok) throw res;
      setNewPassword(res.data);
    } catch (error) {
      captureError(error, "Erreur lors de la réinitialisation du mot de passe");
    }
  };

  return (
    <div className="mb-2.5 text-right">
      <button type="button" className="button border border-blue-dark text-blue-dark" onClick={() => setOpen(true)}>
        Réinitialiser le mot de passe
      </button>
      <Modal className="w-full max-w-3xl" isOpen={open} onClose={() => setOpen(false)}>
        <div className="p-6">
          <h2 className="mb-12 text-center">Réinitialisation du mot de passe de {user.firstname}</h2>
          {isConfirm ? (
            <div>
              {newPassword ? (
                <>
                  <h4 className="mb-6 text-center">Voici le mot de passe temporaire</h4>
                  <div className="mb-12 flex items-center justify-center px-20">
                    <span className="input w-1/2">{newPassword}</span>
                    <button type="button" className="ml-2 border border-blue-dark p-2 text-blue-dark" onClick={() => handleCopy(newPassword)}>
                      <RiFileCopyFill className="text-lg" />
                    </button>
                  </div>
                  <div className="w-full pr-6 text-right">
                    <button className="button bg-blue-dark text-white" onClick={() => setOpen(false)}>
                      Fermer
                    </button>
                  </div>
                </>
              ) : (
                <h4>Chargement...</h4>
              )}
            </div>
          ) : (
            <>
              <h4 className="mb-6 text-center">Êtes-vous sûr de réinitialiser le mot de passe ?</h4>
              <div className="w-full pr-6 text-right">
                <button className="button bg-blue-dark text-white" onClick={handleConfirm}>
                  Confirmer
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Edit;