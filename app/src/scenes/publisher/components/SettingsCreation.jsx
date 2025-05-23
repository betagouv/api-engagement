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
        <Toggle value={values.isAnnonceur} onChange={(e) => onChange({ ...values, isAnnonceur: e, missionType: null })} />
      </div>
      {values.isAnnonceur && (
        <>
          <div className="w-full h-px bg-gray-border" />
          <div className="space-y-4">
            <RadioInput
              id="mission-type-benevolat"
              name="mission-type"
              value="benevolat"
              label="Bénévolat"
              size={24}
              checked={values.missionType === "benevolat"}
              onChange={() => onChange({ ...values, missionType: "benevolat" })}
            />

            <RadioInput
              id="mission-type-volontariat"
              name="mission-type"
              value="volontariat"
              label="Volontariat"
              size={24}
              checked={values.missionType === "volontariat"}
              onChange={() => onChange({ ...values, missionType: "volontariat" })}
            />
          </div>
        </>
      )}
    </div>
  );
};

const Diffuseurs = ({ values, onChange }) => {
  return (
    <div className="border border-gray-border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Diffuseurs</h3>
        <Toggle
          value={values.isDiffuseur}
          onChange={(e) => onChange({ ...values, isDiffuseur: e, category: null, hasApiRights: false, hasWidgetRights: false, hasCampaignRights: false })}
        />
      </div>
      {values.isDiffuseur && (
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
                id="api"
                name="api"
                onChange={(e) => onChange({ ...values, hasApiRights: e.target.checked })}
                checked={values.hasApiRights}
              />
              <label htmlFor="api">API</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="checkbox"
                id="widget"
                name="widget"
                onChange={(e) => onChange({ ...values, hasWidgetRights: e.target.checked })}
                checked={values.hasWidgetRights}
              />
              <label htmlFor="widget">Widgets</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="checkbox"
                id="campaign"
                name="campaign"
                onChange={(e) => onChange({ ...values, hasCampaignRights: e.target.checked })}
                checked={values.hasCampaignRights}
              />
              <label htmlFor="campaign">Campagnes</label>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SettingsCreation;
