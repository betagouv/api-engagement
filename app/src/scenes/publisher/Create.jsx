import { useState } from "react";
import { AiFillWarning } from "react-icons/ai";
import { RiErrorWarningFill } from "react-icons/ri";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import validator from "validator";

import api from "../../services/api";
import { captureError } from "../../services/error";

const Create = () => {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    name: "",
    email: "",
    url: "",
    documentation: "",
    description: "",
    role_annonceur_api: false,
    role_annonceur_campagne: false,
    role_annonceur_widget: false,
    role_promoteur: false,
    mission_type: null,
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValues({
      ...values,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (validator.isEmpty(values.name || "")) {
      errors.name = "Le nom est requis";
    }
    setErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      const res = await api.post(`/publisher/`, values);
      if (!res.ok) throw res;
      toast.success("Partenaire créé avec succès");
      navigate(`/publisher/${res.data._id}`);
    } catch (error) {
      captureError(error, "Erreur lors de la création du partenaire");
    }
  };

  return (
    <div className="flex flex-col">
      <div className="mb-10 flex items-center">
        <div className="ml-8 pt-2">
          <h1 className="text-4xl font-bold">Nouveau compte partenaire</h1>
        </div>
      </div>
      <form className="flex flex-col bg-white p-16 shadow-lg" onSubmit={handleSubmit}>
        <div className="mb-6 flex justify-between">
          <h2 className="text-3xl font-bold">Les informations</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-5">
          <div className="flex flex-col">
            <label className="mb-2 flex items-center text-sm" htmlFor="name">
              Nom
              <span className="ml-3 flex items-center text-xs text-gray-dark">
                <AiFillWarning className="mr-2 text-orange-warning" />
                Le nom ne peut pas être modifié une fois le compte créé
              </span>
            </label>
            <input id="name" className={`input mb-2 ${errors.name ? "border-b-red-main" : "border-b-black"}`} name="name" value={values.name} onChange={handleChange} />
            {errors.name && (
              <div className="flex items-center text-sm text-red-main">
                <RiErrorWarningFill className="mr-2" />
                {errors.name}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-sm" htmlFor="email">
              Email de contact
            </label>
            <input id="email" className="input mb-2" name="email" value={values.email} onChange={handleChange} />
          </div>
          <div className="flex flex-col">
            <label className="mb-2 text-sm" htmlFor="url">
              URL
            </label>
            <input id="url" className="input mb-2" name="url" value={values.url} onChange={handleChange} />
          </div>
          <div className="flex flex-col">
            <label className="mb-2 text-sm" htmlFor="documentation">
              Documentation
            </label>
            <input id="documentation" className="input mb-2" name="documentation" value={values.documentation} onChange={handleChange} />
          </div>

          <div className="row-span-2 flex flex-col">
            <label className="mb-2 text-sm" htmlFor="description">
              Description
            </label>
            <textarea id="description" rows={4} className="input mb-2" name="description" value={values.description} onChange={handleChange} />
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-sm" htmlFor="role-promoteur">
              Annonceur
            </label>
            <div className="mb-2 flex items-center gap-12">
              <div className="flex items-center gap-3">
                <input id="role-promoteur" type="checkbox" className="checkbox" name="role_promoteur" onChange={handleChange} checked={values.role_promoteur} />
                <span>Annonceur</span>
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="mission-type-benevolat" className="sr-only">
                  Bénévolat
                </label>
                <input
                  id="mission-type-benevolat"
                  type="radio"
                  className="checkbox"
                  name="mission-type-benevolat"
                  value="benevolat"
                  onChange={handleChange}
                  checked={values.mission_type === "benevolat"}
                />
                <span>Bénévolat</span>
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="mission-type-volontariat" className="sr-only">
                  Volontariat
                </label>
                <input
                  id="mission-type-volontariat"
                  type="radio"
                  className="checkbox"
                  name="mission-type-volontariat"
                  value="volontariat"
                  onChange={handleChange}
                  checked={values.mission_type === "volontariat"}
                />
                <span>Volontariat</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-sm">Diffuseur</label>
            <div className="mb-2 flex items-center gap-12">
              <div className="flex items-center gap-3">
                <label htmlFor="role-annonceur-api" className="sr-only">
                  API
                </label>
                <input id="role-annonceur-api" type="checkbox" className="checkbox" name="role-annonceur-api" onChange={handleChange} checked={values.role_annonceur_api} />
                <span>API</span>
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="role-annonceur-widget" className="sr-only">
                  Widget
                </label>
                <input
                  id="role-annonceur-widget"
                  type="checkbox"
                  className="checkbox"
                  name="role-annonceur-widget"
                  onChange={handleChange}
                  checked={values.role_annonceur_widget}
                />
                <span>Widget</span>
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="role-annonceur-campagne" className="sr-only">
                  Campagne
                </label>
                <input
                  id="role-annonceur-campagne"
                  type="checkbox"
                  className="checkbox"
                  name="role-annonceur-campagne"
                  onChange={handleChange}
                  checked={values.role_annonceur_campagne}
                />
                <span>Campagne</span>
              </div>
            </div>
          </div>

          <div className="col-span-2 flex justify-end gap-6">
            <Link to="/accounts?tab=publishers" className="button border border-blue-dark bg-white text-blue-dark hover:bg-gray-hover">
              Annuler
            </Link>
            <button type="submit" className="button bg-blue-dark text-white hover:bg-blue-main" disabled={Object.keys(errors).length > 0}>
              Créer
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Create;
