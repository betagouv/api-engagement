import _ from "lodash";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import TrashSvg from "../../assets/svg/trash-icon.svg?react";
import Loader from "../../components/Loader";
import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";
import Administration from "./components/Administration";
import Informations from "./components/Informations";
import Members from "./components/Members";
import Settings from "./components/Settings";

const Edit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, publisher: sessionPublisher, setPublisher: setSessionPublisher } = useStore();
  const [publisher, setPublisher] = useState(null);
  const [values, setValues] = useState({
    publishers: [],
    excludedOrganizations: [],
    send_report_to: [],
    automated_report: false,
    role_promoteur: false,
    role_annonceur_api: false,
    role_annonceur_widget: false,
    role_annonceur_campagne: false,
    mission_type: "benevolat",
  });

  useEffect(() => {
    setValues({ ...values, ...publisher });
  }, [publisher]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/publisher/${id}`);
        if (!res.ok) throw res;
        setPublisher(res.publisher);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération du partenaire");
      }
    };
    fetchData();
  }, [id]);

  const handleFileChange = async (e) => {
    try {
      const formData = new FormData();
      formData.append("files", e.target.files[0]);
      const res = await api.postFormData(`/publisher/${id}/image`, formData);
      if (!res.ok) throw res;
      toast.success("Image mise à jour");
      setValues(res.data);
      setPublisher(res.data);
      if (sessionPublisher._id === values._id) setSessionPublisher(res.data);
    } catch (error) {
      captureError(error, "Erreur lors de la mise à jour de l'image");
    }
  };

  const handleDelete = async () => {
    const confirm = window.confirm("Etes vous sur ?");
    if (!confirm) return;

    try {
      const res = await api.delete(`/publisher/${values._id}`);
      if (!res.ok) throw res;
      toast.success("Partenaire supprimé");

      if (sessionPublisher._id === values._id) {
        const res = await api.get(`/publisher/${user.publishers[0]}`);
        if (!res.ok) throw res;
        setSessionPublisher(publisher);
      }
      navigate("/accounts?tab=publishers");
    } catch (error) {
      captureError(error, "Erreur lors de la suppression du partenaire");
    }
  };

  const handleSubmit = async () => {
    try {
      const res = await api.put(`/publisher/${id}`, values);
      if (!res.ok) throw res;
      toast.success("Partenaire mis à jour");
      setPublisher(res.data);
      if (sessionPublisher._id === values._id) setSessionPublisher(res.data);
    } catch (error) {
      captureError(error, "Erreur lors de la mise à jour du partenaire");
    }
  };

  const isChanged = (v) => !_.isEqual(v, publisher);

  if (!publisher)
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    );

  return (
    <div className="flex flex-col">
      <div className="mb-10 flex items-center">
        <label
          htmlFor="logo"
          className="h-24 w-32 flex cursor-pointer flex-col items-center justify-center hover:bg-gray-900/10 bg-white transition-all duration-500 p-2 shadow-lg"
        >
          <img src={`${[publisher.logo]}?${Date.now()}`} className="object-scale-down" />
        </label>
        <input id="logo" accept=".gif,.jpg,.jpeg,.png" type="file" hidden onChange={handleFileChange} />

        <div className="ml-8 pt-2">
          <h1 className="text-4xl font-bold">Compte partenaire de {values.name}</h1>
        </div>
      </div>
      <div className="bg-white p-12 space-y-12 shadow-lg">
        <Informations values={values} onChange={setValues} />
        <div className="w-full h-px bg-gray-border" />
        <Settings values={values} onChange={setValues} onSave={setPublisher} />
        <div className="w-full h-px bg-gray-border" />
        <Administration values={values} onChange={setValues} />
        <div className="w-full h-px bg-gray-border" />
        <Members values={values} onChange={setValues} />

        <div className="flex items-center justify-end gap-2">
          <button className="button border border-gray-400 flex items-center text-red-main" onClick={handleDelete}>
            <TrashSvg className="mr-2" />
            <span>Supprimer</span>
          </button>

          <button className="filled-button" disabled={!isChanged(values)} onClick={handleSubmit}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

export default Edit;
