import { useEffect, useState } from "react";

import Table from "../../../components/NewTable";
import SearchInput from "../../../components/SearchInput";
import Toggle from "../../../components/Toggle";
import { PUBLISHER_CATEGORIES } from "../../../constants";
import api from "../../../services/api";
import { captureError } from "../../../services/error";

const DiffuseurCreation = ({ values, onChange, errors }) => {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.post("/publisher/search", {
          role: "annonceur",
        });
        if (!res.ok) throw res;

        setData(res.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des diffuseurs");
      }
    };
    fetchData();
  }, []);

  return (
    <div className="border border-gray-900 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Diffuseur</h3>
        <Toggle value={values.isDiffuseur} onChange={(e) => onChange({ ...values, isDiffuseur: e, hasApiRights: false, hasWidgetRights: false, hasCampaignRights: false })} />
      </div>
      {values.isDiffuseur && (
        <>
          <div className="w-full h-px bg-gray-900" />
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
          <div className="w-full h-px bg-gray-900" />
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
          <div className="w-full h-px bg-gray-900" />
          <p className="text-base">
            {values.name} diffuse les missions de {data.filter((item) => values.publishers.find((p) => p.publisherId === item._id)).length} annonceurs
          </p>
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un annonceur" timeout={0} />
          <Table header={[{ title: "Annonceurs" }]} className="max-h-96 h-full">
            {data
              .filter((item) => item._id !== values._id && item.name.toLowerCase().includes(search.toLowerCase()))
              .map((item, index) => (
                <tr key={index} className={`${index % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-item`}>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <input
                        id={item._id}
                        type="checkbox"
                        className="checkbox"
                        checked={values.publishers.find((p) => p.publisherId === item._id) || false}
                        onChange={(e) =>
                          e.target.checked
                            ? onChange({
                                ...values,
                                publishers: [
                                  ...values.publishers,
                                  { publisherId: item._id, publisherName: item.name, publisherLogo: item.logo, moderator: item.moderator, missionType: item.missionType },
                                ],
                              })
                            : onChange({ ...values, publishers: values.publishers.filter((p) => p.publisherId !== item._id) })
                        }
                      />

                      <label htmlFor={item._id}>{item.name}</label>
                    </div>
                  </td>
                </tr>
              ))}
          </Table>
        </>
      )}
    </div>
  );
};

export default DiffuseurCreation;
