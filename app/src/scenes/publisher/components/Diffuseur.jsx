import { useEffect, useState } from "react";

import Table from "../../../components/NewTable";
import SearchInput from "../../../components/SearchInput";
import Toggle from "../../../components/Toggle";
import { PUBLISHER_CATEGORIES } from "../../../constants";
import api from "../../../services/api";
import { captureError } from "../../../services/error";

const Diffuseur = ({ values, onChange, errors, setErrors }) => {
  const [editing, setEditing] = useState(false);
  const [publishers, setPublishers] = useState([]);
  const [selectedPublishers, setSelectedPublishers] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSelectedPublishers(values.publishers);
  }, [values.publishers]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.post("/publisher/search", {
          role: "annonceur",
        });
        if (!res.ok) throw res;

        setPublishers(res.data);
        setErrors({});
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des diffuseurs");
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6 border border-gray-900 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Diffuseur</h3>
        <Toggle
          value={values.isDiffuseur}
          onChange={(e) => onChange({ ...values, isDiffuseur: e, hasApiRights: false, hasWidgetRights: false, hasCampaignRights: false, category: null })}
        />
      </div>
      {values.isDiffuseur && (
        <>
          <div className="h-px w-full bg-gray-900" />
          {errors.category && <p className="text-red-700">{errors.category}</p>}
          {errors.mode && <p className="text-red-700">{errors.mode}</p>}
          <div className="space-y-2">
            <label className="text-base" htmlFor="category">
              Catégorie <span className="text-red-500">*</span>
            </label>
            <select id="category" className="select w-full" name="category" value={values.category || ""} onChange={(e) => onChange({ ...values, category: e.target.value })}>
              <option value="">Sélectionner une catégorie de diffuseur</option>
              {Object.keys(PUBLISHER_CATEGORIES).map((key) => (
                <option key={key} value={key}>
                  {PUBLISHER_CATEGORIES[key]}
                </option>
              ))}
            </select>
          </div>
          <div className="h-px w-full bg-gray-900" />
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
                id="campagne"
                name="campagne"
                onChange={(e) => onChange({ ...values, hasCampaignRights: e.target.checked })}
                checked={values.hasCampaignRights}
              />
              <label htmlFor="campagne">Campagnes</label>
            </div>
          </div>
          <div className="h-px w-full bg-gray-900" />
          <p className="text-base">
            {values.name} diffuse les missions de {publishers.filter((item) => values.publishers.find((p) => p.publisherId === item.id)).length} annonceurs
          </p>
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un annonceur" timeout={0} />
          <Table header={[{ title: "Annonceurs" }]} className="h-full max-h-96">
            {publishers
              .filter((item) => (editing ? item.id !== values.id : values.publishers.find((p) => p.publisherId === item.id)))
              .filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
              .map((item, index) => (
                <tr key={index} className={`${index % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-item`}>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {editing && (
                        <input
                          id={item.id}
                          type="checkbox"
                          className="checkbox"
                          checked={selectedPublishers.find((p) => p.publisherId === item.id) || false}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPublishers([
                                ...selectedPublishers,
                                { publisherId: item.id, publisherName: item.name, publisherLogo: item.logo, moderator: item.moderator, missionType: item.missionType },
                              ]);
                            } else {
                              setSelectedPublishers(selectedPublishers.filter((p) => p.publisherId !== item.id));
                            }
                          }}
                        />
                      )}
                      <label htmlFor={item.id}>{item.name}</label>
                    </div>
                  </td>
                </tr>
              ))}
          </Table>

          {editing ? (
            <div className="flex items-center gap-2">
              <button
                className="secondary-btn"
                onClick={() => {
                  setEditing(false);
                  setSelectedPublishers(values.publishers);
                }}
              >
                Annuler
              </button>
              <button
                className="primary-btn"
                onClick={() => {
                  setEditing(false);
                  onChange({ ...values, publishers: selectedPublishers });
                }}
              >
                Terminer
              </button>
            </div>
          ) : (
            <button className="secondary-btn" onClick={() => setEditing(true)}>
              Modifier les annonceurs
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default Diffuseur;
