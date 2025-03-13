import { useState } from "react";
import { TiDeleteOutline } from "react-icons/ti";

import Toggle from "../../../components/Toggle";

const Administration = ({ values, onChange }) => {
  const [text, setText] = useState("");
  return (
    <div className="flex items-center gap-6">
      <div className="flex-1 flex items-center gap-4">
        <label className="w-1/2 text-base" htmlFor="automated-report">
          Rapport automatisé
        </label>
        <div className="relative">
          <Toggle value={values.automated_report} onChange={(e) => onChange({ ...values, automated_report: e })} />
          {values.automated_report ? <p className="text-base text-blue-dark absolute top-8 right-0">Oui</p> : <p className="text-base text-gray-700 absolute top-8 right-0">Non</p>}
        </div>
      </div>
      <div className="flex-1 space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-base" htmlFor="excludedOrganisations">
            Exclure des organisations (par identifiant)
          </label>

          <div className="flex items-center gap-2">
            <input id="excludedOrganisations" className="input flex-1" type="text" name="excludedOrganisations" value={text} onChange={(e) => setText(e.target.value)} />
            <button
              className="filled-button"
              onClick={() => {
                onChange({ ...values, excludedOrganisations: [...values.excludedOrganisations, text] });
                setText("");
              }}
            >
              Ajouter
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {values.excludedOrganisations.map((item) => (
            <div key={item} className="bg-gray-100 px-2 py-1 rounded-md text-sm relative">
              {item}
              <button className="absolute -top-2 -right-2" onClick={() => onChange({ ...values, excludedOrganisations: values.excludedOrganisations.filter((id) => id !== item) })}>
                <TiDeleteOutline className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Administration;
