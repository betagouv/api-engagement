import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import ExportSvg from "../../../assets/svg/export-icon.svg?react";
import Modal from "../../../components/New-Modal";
import Table from "../../../components/NewTable";
import RadioInput from "../../../components/RadioInput";
import Toggle from "../../../components/Toggle";
import { PUBLISHER_CATEGORIES } from "../../../constants";
import api from "../../../services/api";
import { captureError } from "../../../services/error";

const Settings = ({ values, onChange, onSave, errors, setErrors }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Paramètres</h2>
      {errors.settings && <p className="text-red-700">{errors.settings}</p>}
      <div className="flex items-start gap-6">
        <div className="flex-1">
          <Annonceur values={values} onChange={onChange} errors={errors} setErrors={setErrors} />
        </div>
        <div className="flex-1">
          <Diffuseurs values={values} onChange={onChange} onSave={onSave} errors={errors} setErrors={setErrors} />
        </div>
      </div>
    </div>
  );
};

const Annonceur = ({ values, onChange, errors, setErrors }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.post("/publisher/search", {
          partnerOf: values._id,
        });
        if (!res.ok) throw res;
        setData(res.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des diffuseurs");
      }
    };
    fetchData();
  }, [values.publishers]);

  return (
    <div className="border border-gray-border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Annonceur</h3>
        <Toggle
          value={values.annonceur}
          onChange={(e) => {
            onChange({ ...values, annonceur: e, missionType: null });
            setErrors({ ...errors, settings: null });
          }}
        />
      </div>
      {values.annonceur && (
        <>
          <div className="w-full h-px bg-gray-border" />
          {errors.missionType && <p className="text-red-700">{errors.missionType}</p>}
          <div className="space-y-4">
            <RadioInput
              id="mission-type-benevolat"
              name="mission-type"
              value="benevolat"
              label="Bénévolat"
              size={24}
              checked={values.missionType === "benevolat"}
              onChange={() => {
                onChange({ ...values, missionType: "benevolat" });
                setErrors({ ...errors, missionType: null });
              }}
            />

            <RadioInput
              id="mission-type-volontariat"
              name="mission-type"
              value="volontariat"
              label="Volontariat"
              size={24}
              checked={values.missionType === "volontariat"}
              onChange={() => {
                onChange({ ...values, missionType: "volontariat" });
                setErrors({ ...errors, missionType: null });
              }}
            />
          </div>
          <div className="w-full h-px bg-gray-border" />
          <p className="text-base">
            {data.length} diffuseurs diffusent les missions de {values.name}
          </p>
          <Table header={[{ title: "Partenaires" }]} className="h-96">
            {data.slice(0, 5).map((item, index) => (
              <tr key={index} className={`${index % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-item`}>
                <td className="p-4">{item.name}</td>
              </tr>
            ))}
          </Table>
          <DiffuseurModal data={data} />
        </>
      )}
    </div>
  );
};

const DiffuseurModal = ({ data }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-blue-dark border-b border-blue-dark flex items-center gap-2">
        <span>Tous les diffuseurs</span>
        <ExportSvg className="w-4 h-4" />
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)}>
        <div className="p-12 space-y-6">
          <h1 className="text-2xl font-bold">{data.length} diffuseurs</h1>

          <Table header={[{ title: "Partenaires" }]} className="h-96">
            {data.map((item, index) => (
              <tr key={index} className={`${index % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-item`}>
                <td className="p-4">{item.name}</td>
              </tr>
            ))}
          </Table>
        </div>
      </Modal>
    </>
  );
};

const Diffuseurs = ({ values, onChange, onSave, errors, setErrors }) => {
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.post("/publisher/search", {
          role_promoteur: true,
        });
        if (!res.ok) throw res;

        setData(res.data);
        setSelected(values.publishers.map((p) => p.publisher));
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des diffuseurs");
      }
    };
    fetchData();
  }, [values.publishers, values.diffuseur]);

  const handleSave = async () => {
    try {
      const errors = {};
      if (values.diffuseur && !values.category) errors.category = "Le partenaire est “Diffuseur”. Veuillez sélectionner la catégorie dans le formulaire.";
      if (values.diffuseur && !values.api && !values.widget && !values.campaign)
        errors.mode = "Le partenaire est “Diffuseur”. Veuillez sélectionner au moins un “moyen de diffusion” dans le formulaire.";
      if (Object.keys(errors).length > 0) {
        toast.error(errors.category || errors.mode);
        setErrors(errors);
        return;
      }
      const publishers = data.filter((item) => selected.includes(item._id));

      const res = await api.put(`/publisher/${values._id}`, {
        ...values,
        publishers: publishers.map((p) => ({
          publisherId: p._id,
          publisherName: p.name,
          publisherLogo: p.logo,
          moderator: p.moderator,
          missionType: p.missionType,
        })),
      });

      if (!res.ok) throw res;

      toast.success("Diffuseurs mis à jour avec succès");
      setEditing(false);
      onSave(res.data);
    } catch (error) {
      captureError(error, "Erreur lors de la mise à jour des diffuseurs");
    }
  };

  return (
    <div className="border border-gray-border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Diffuseurs</h3>
        <Toggle value={values.diffuseur} onChange={(e) => onChange({ ...values, diffuseur: e, api: false, widget: false, campaign: false })} />
      </div>
      {values.diffuseur && (
        <>
          <div className="w-full h-px bg-gray-border" />
          {errors.category && <p className="text-red-700">{errors.category}</p>}
          {errors.mode && <p className="text-red-700">{errors.mode}</p>}
          <div className="space-y-2">
            <label className="text-base" htmlFor="category">
              Catégorie <span className="text-red-500">*</span>
            </label>
            <select id="category" className="select w-full" name="category" value={values.category} onChange={(e) => onChange({ ...values, category: e.target.value })}>
              <option value="">Sélectionner une catégorie de diffuseur</option>
              {Object.keys(PUBLISHER_CATEGORIES).map((key) => (
                <option key={key} value={key}>
                  {PUBLISHER_CATEGORIES[key]}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full h-px bg-gray-border" />
          <div className="space-y-4">
            <label className="text-base" htmlFor="category">
              Moyens de diffusion <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="checkbox"
                id="role-annonceur-api"
                name="role-annonceur-api"
                onChange={(e) => onChange({ ...values, api: e.target.checked })}
                checked={values.api}
              />
              <label htmlFor="role-annonceur-api">API</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="checkbox"
                id="role-annonceur-widget"
                name="role-annonceur-widget"
                onChange={(e) => onChange({ ...values, widget: e.target.checked })}
                checked={values.widget}
              />
              <label htmlFor="role-annonceur-widget">Widgets</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="checkbox"
                id="role-annonceur-campagne"
                name="role-annonceur-campagne"
                onChange={(e) => onChange({ ...values, campaign: e.target.checked })}
                checked={values.campaign}
              />
              <label htmlFor="role-annonceur-campagne">Campagnes</label>
            </div>
          </div>
          <div className="w-full h-px bg-gray-border" />
          <p className="text-base">
            {values.name} diffuse les missions de {data.filter((item) => values.publishers.find((p) => p.publisherId === item._id)).length} annonceurs
          </p>
          <Table header={[{ title: "Annonceurs" }]} className="max-h-96 h-full">
            {data
              .filter((item) => (editing ? item._id !== values._id : values.publishers.find((p) => p.publisherId === item._id)))
              .map((item, index) => (
                <tr key={index} className={`${index % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-item`}>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {editing && (
                        <input
                          id={item._id}
                          type="checkbox"
                          className="checkbox"
                          checked={selected.includes(item._id)}
                          onChange={(e) => (e.target.checked ? setSelected([...selected, item._id]) : setSelected(selected.filter((id) => id !== item._id)))}
                        />
                      )}
                      <label htmlFor={item._id}>{item.name}</label>
                    </div>
                  </td>
                </tr>
              ))}
          </Table>

          {editing ? (
            <div className="flex items-center gap-2">
              <button className="empty-button" onClick={() => setEditing(false)}>
                Annuler
              </button>
              <button className="filled-button" onClick={handleSave}>
                Enregistrer
              </button>
            </div>
          ) : (
            <button className="empty-button" onClick={() => setEditing(true)}>
              Modifier les annonceurs
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default Settings;
