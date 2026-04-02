import { toast } from "@/services/toast";
import _ from "lodash";
import { useEffect, useState } from "react";
import { RiCloseFill, RiFileCopyFill } from "react-icons/ri";
import { TiDeleteOutline } from "react-icons/ti";
import { Link, useNavigate, useParams } from "react-router-dom";

import LabelledInput from "@/components/form/LabelledInput";
import LabelledSelect from "@/components/form/LabelledSelect";
import Loader from "@/components/Loader";
import Modal from "@/components/Modal";
import Table from "@/components/Table";
import api from "@/services/api";
import { captureError } from "@/services/error";
import { isValidEmail } from "@/services/utils";
import { withLegacyPublishers } from "@/utils/publisher";

const TABLE_HEADER = [{ title: "" }, { title: "Nom" }, { title: "Rôles", position: "center" }];

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

  const filteredPublishers = publishers.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resU = await api.get(`/user/${id}`);
        if (!resU.ok) {
          throw resU;
        }
        setUser(resU.data);
        setValues(resU.data);

        const resP = await api.post("/publisher/search", {});
        if (!resP.ok) {
          throw resP;
        }
        setPublishers(withLegacyPublishers(resP.data).sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        captureError(error, { extra: { id } });
      }
    };
    fetchData();
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!values.firstname) {
      errors.firstname = "Le prénom est requis";
    }
    if (!isValidEmail(values.email)) {
      errors.email = "Adresse email invalide";
    }
    if (values.role !== "admin" && values.role !== "user") {
      errors.role = "Le rôle renseigné est invalide";
    }
    if (values.publishers.length === 0) {
      errors.publishers = "Veuillez sélectionner au moins un partenaire";
    }

    setErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      const res = await api.put(`/user/${id}`, values);
      if (!res.ok) {
        throw res;
      }
      setUser(res.data);
      toast.success("Paramètres mis à jour");
    } catch (error) {
      captureError(error, { extra: { id, values } });
    }
  };

  const handleInviteAgain = async () => {
    try {
      const res = await api.put(`/user/${id}/invite-again`);
      if (!res.ok) {
        throw res;
      }
      toast.success("Invitation envoyée");
    } catch (error) {
      captureError(error, { extra: { id } });
    }
  };

  const handleDelete = async () => {
    const confirm = window.confirm("Etes vous sur ?");
    if (!confirm) {
      return;
    }

    try {
      const res = await api.delete(`/user/${id}`);
      if (!res.ok) {
        throw res;
      }
      toast.success("Utilisateur supprimé");
      navigate("/accounts");
    } catch (error) {
      captureError(error, { extra: { id } });
    }
  };

  const isChanged = () => !_.isEqual(values, user);
  const isErrors = () => errors.firstname || errors.email || errors.role;

  if (!user) {
    return <p className="text-4xl font-bold">Chargement...</p>;
  }

  return (
    <div className="flex flex-col">
      <div className="mb-10">
        <title>{`API Engagement - Compte utilisateur - ${user.firstname}`}</title>
        <h1 className="text-4xl font-bold">Compte utilisateur de {user.firstname}</h1>
      </div>
      <form className="flex flex-col gap-6 bg-white p-16 shadow-lg" onSubmit={handleSubmit}>
        <div className="flex justify-between">
          <h2 className="text-3xl font-bold">Les informations</h2>
          <button type="button" className="text-error flex cursor-pointer items-center text-sm" onClick={handleDelete}>
            <TiDeleteOutline className="mr-2" aria-hidden="true" />
            <span>Supprimer</span>
          </button>
        </div>
        <div className="grid grid-cols-1 gap-x-10 gap-y-5 lg:grid-cols-2">
          <LabelledInput id="firstname" label="Prénom" error={errors.firstname} value={values.firstname} onChange={(e) => setValues({ ...values, firstname: e.target.value })} />
          <LabelledInput
            id="lastname"
            label="Nom de famille"
            error={errors.lastname}
            value={values.lastname}
            onChange={(e) => setValues({ ...values, lastname: e.target.value })}
          />
          <LabelledInput id="email" label="E-mail" error={errors.email} value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />
          <LabelledSelect
            id="role"
            label="Rôle"
            options={[
              { value: "user", label: "Utilisateur" },
              { value: "admin", label: "Admin" },
            ]}
            error={errors.role}
            value={values.role}
            onChange={(e) => setValues({ ...values, role: e.target.value })}
            placeholder="Sélectionner un rôle"
          />
        </div>

        <div role="search" className="flex flex-col gap-4">
          <label className="text-sm" htmlFor="publishers">
            Partenaires
          </label>

          <input
            id="publishers"
            className="input mb-4 w-64 flex-1 bg-gray-950 px-3 py-2 text-sm"
            placeholder="Rechercher"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {values.publishers.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {values.publishers.map((p, i) => (
                <div key={i} className="bg-blue-france-975 flex items-center rounded p-2">
                  <span className="text-xs">{publishers.find((pub) => pub.id === p || pub._id === p)?.name}</span>
                  <button type="button" className="ml-2" onClick={() => setValues({ ...values, publishers: values.publishers.filter((pub) => pub !== p) })}>
                    <RiCloseFill className="text-xs" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Table caption="Partenaires de l'utilisateur" header={TABLE_HEADER} total={filteredPublishers.length} pagination={false} auto className="max-h-96 overflow-y-auto">
            {filteredPublishers.map((item, i) => (
              <tr key={item.id || item._id} className={`${i % 2 === 0 ? "bg-table-even" : "bg-table-odd"} table-row`}>
                <td className="table-cell">
                  <input
                    type="checkbox"
                    className="checkbox"
                    onChange={(e) =>
                      setValues({
                        ...values,
                        publishers: e.target.checked
                          ? [...values.publishers, (item.id || item._id).toString()]
                          : values.publishers.filter((pub) => pub !== (item.id || item._id).toString()),
                      })
                    }
                    checked={values.publishers.includes((item.id || item._id).toString())}
                  />
                </td>
                <td className="table-cell">{item.name}</td>
                <td className="table-cell">
                  <div className="flex flex-wrap justify-center gap-2">
                    {item.isAnnonceur && <span className="bg-red-marianne-950 rounded p-2">Annonceur</span>}
                    {item.hasApiRights && <span className="bg-success-950 rounded p-2">Diffuseur API</span>}
                    {item.hasWidgetRights && <span className="bg-success-950 rounded p-2">Diffuseur Widget</span>}
                    {item.hasCampaignRights && <span className="bg-success-950 rounded p-2">Diffuseur Campagne</span>}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </div>

        <div className="flex justify-end gap-4">
          <Link to="/admin-account" className="tertiary-btn">
            Retour
          </Link>
          <ResetPasswordModal user={user} />
          <button type="button" className="primary-btn" onClick={handleInviteAgain}>
            Renvoyer l'invitation
          </button>
          <button type="submit" className="primary-btn" disabled={!isChanged() || isErrors()}>
            Mettre à jour
          </button>
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
      const res = await api.put(`/user/${user.id}/reset-password`);
      if (!res.ok) {
        throw res;
      }
      setNewPassword(res.data);
    } catch (error) {
      captureError(error, { extra: { userId: user.id } });
      setIsConfirm(false);
      setNewPassword("");
      setOpen(false);
    }
  };

  return (
    <>
      <button type="button" className="tertiary-btn" onClick={() => setOpen(true)}>
        Réinitialiser le mot de passe
      </button>
      <Modal
        className="min-w-2xl"
        open={open}
        onClose={() => setOpen(false)}
        title={!newPassword ? `Réinitialisation du mot de passe de ${user.firstname}` : "Voici le mot de passe temporaire"}
      >
        {isConfirm ? (
          newPassword ? (
            <>
              <div className="flex items-center justify-center">
                <span className="input w-full">{newPassword}</span>
                <button type="button" className="secondary-btn ml-2" onClick={() => handleCopy(newPassword)}>
                  <RiFileCopyFill className="text-lg" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-6 w-full text-right">
                <button className="primary-btn" onClick={() => setOpen(false)}>
                  Fermer
                </button>
              </div>
            </>
          ) : (
            <Loader className="h-6 w-6" />
          )
        ) : (
          <>
            <p className="text-base text-black">Êtes-vous sûr de réinitialiser le mot de passe ?</p>
            <div className="mt-6 w-full text-right">
              <button className="primary-btn" onClick={handleConfirm}>
                Confirmer
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
};

export default Edit;
