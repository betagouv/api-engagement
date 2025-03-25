import { useState } from "react";

import RadioInput from "../../../components/RadioInput";
import Toggle from "../../../components/Toggle";
import { PUBLISHER_CATEGORIES } from "../../../constants";

const SettingsCreation = ({ values, onChange }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Paramètres</h2>
      <div className="flex items-start gap-6">
        <div className="flex-1">
          <Annonceur values={values} onChange={onChange} />
        </div>
        <div className="flex-1">
          <Diffuseurs values={values} onChange={onChange} />
        </div>
      </div>
    </div>
  );
};

const Annonceur = ({ values, onChange }) => {
  return (
    <div className="border border-gray-border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Annonceur</h3>
        <Toggle value={values.role_promoteur} onChange={(e) => onChange({ ...values, role_promoteur: e })} />
      </div>
      {values.role_promoteur && (
        <>
          <div className="w-full h-px bg-gray-border" />
          <div className="space-y-4">
            <RadioInput
              id="mission-type-benevolat"
              name="mission-type"
              value="benevolat"
              label="Bénévolat"
              size={24}
              checked={values.mission_type === "benevolat"}
              onChange={() => onChange({ ...values, mission_type: "benevolat" })}
            />

            <RadioInput
              id="mission-type-volontariat"
              name="mission-type"
              value="volontariat"
              label="Volontariat"
              size={24}
              checked={values.mission_type === "volontariat"}
              onChange={() => onChange({ ...values, mission_type: "volontariat" })}
            />
          </div>
        </>
      )}
    </div>
  );
};

const Diffuseurs = ({ values, onChange }) => {
  const [open, setOpen] = useState(values.role_annonceur_api || values.role_annonceur_widget || values.role_annonceur_campagne);
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState([]);

  return (
    <div className="border border-gray-border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Diffuseurs</h3>
        <Toggle
          value={open}
          onChange={(e) => {
            setOpen(e);
            if (!e) onChange({ ...values, role_annonceur_api: false, role_annonceur_widget: false, role_annonceur_campagne: false });
          }}
        />
      </div>
      {open && (
        <>
          <div className="w-full h-px bg-gray-border" />
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
                onChange={(e) => onChange({ ...values, role_annonceur_api: e.target.checked })}
                checked={values.role_annonceur_api}
              />
              <label htmlFor="role-annonceur-api">API</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="checkbox"
                id="role-annonceur-widget"
                name="role-annonceur-widget"
                onChange={(e) => onChange({ ...values, role_annonceur_widget: e.target.checked })}
                checked={values.role_annonceur_widget}
              />
              <label htmlFor="role-annonceur-widget">Widgets</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="checkbox"
                id="role-annonceur-campagne"
                name="role-annonceur-campagne"
                onChange={(e) => onChange({ ...values, role_annonceur_campagne: e.target.checked })}
                checked={values.role_annonceur_campagne}
              />
              <label htmlFor="role-annonceur-campagne">Campagnes</label>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SettingsCreation;
