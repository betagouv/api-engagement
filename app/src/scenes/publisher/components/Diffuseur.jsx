import { useEffect, useMemo, useState } from "react";
import { RiErrorWarningFill } from "react-icons/ri";

import Checkbox from "@/components/form/Checkbox";
import SearchInput from "@/components/SearchInput";
import Table from "@/components/Table";
import Toggle from "@/components/Toggle";
import { PUBLISHER_CATEGORIES } from "@/constants";
import api from "@/services/api";
import { captureError } from "@/services/error";
import { withLegacyPublishers } from "@/utils/publisher";

const resolvePublisherId = (publisher) => publisher?.publisherId ?? publisher?.id ?? null;

const normalizeSelectedPublishers = (items = []) =>
  (items || [])
    .map((publisher) => {
      const publisherId = resolvePublisherId(publisher);
      if (!publisherId) {
        return null;
      }
      return { ...publisher, publisherId };
    })
    .filter(Boolean);

const Diffuseur = ({ values, onChange, errors }) => {
  const [editing, setEditing] = useState(false);
  const [publishers, setPublishers] = useState([]);
  const [selectedPublishers, setSelectedPublishers] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSelectedPublishers(normalizeSelectedPublishers(values.publishers));
  }, [values.publishers]);

  const selectedPublisherIds = useMemo(() => new Set(selectedPublishers.map((publisher) => publisher.publisherId).filter(Boolean)), [selectedPublishers]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.post("/publisher/search", {
          role: "annonceur",
        });
        if (!res.ok) {
          throw res;
        }

        setPublishers(withLegacyPublishers(res.data));
      } catch (error) {
        captureError(error, { message: "Erreur lors du chargement des annonceurs", extra: { publisherId: values.id } });
      }
    };
    fetchData();
  }, []);

  return (
    <div className="border-grey-border flex flex-1 flex-col gap-6 border p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Diffuseur</h3>
        <Toggle
          aria-label={values.isDiffuseur ? "Désactiver le mode diffuseur" : "Activer le mode diffuseur"}
          value={values.isDiffuseur}
          onChange={(e) => onChange({ ...values, isDiffuseur: e, hasApiRights: false, hasWidgetRights: false, hasCampaignRights: false, category: null })}
        />
      </div>
      {values.isDiffuseur && (
        <>
          <div className="h-px w-full bg-gray-900" />
          <div className={`space-y-2 ${errors.category ? "before:bg-error relative before:absolute before:inset-y-0 before:-left-3 before:w-0.5" : ""}`}>
            <label className={`text-base ${errors.category ? "text-error" : ""}`} htmlFor="category">
              Catégorie
              <span className="text-error ml-1" aria-hidden="true">
                *
              </span>
            </label>
            <select
              id="category"
              className={`select w-full ${errors.category ? "border-b-error border-b-2" : "border-b-black"}`}
              name="category"
              required
              aria-required="true"
              aria-invalid={errors.category ? true : undefined}
              aria-describedby={errors.category ? "category-error" : undefined}
              value={values.category || ""}
              onChange={(e) => onChange({ ...values, category: e.target.value })}
            >
              <option value="">Sélectionner une catégorie de diffuseur</option>
              {Object.keys(PUBLISHER_CATEGORIES).map((key) => (
                <option key={key} value={key}>
                  {PUBLISHER_CATEGORIES[key]}
                </option>
              ))}
            </select>
            {errors.category && (
              <p id="category-error" className="text-error flex items-center text-sm" aria-live="polite">
                <RiErrorWarningFill className="mr-2" aria-hidden="true" />
                {errors.category}
              </p>
            )}
          </div>
          <div className="h-px w-full bg-gray-900" />
          <fieldset className={`flex flex-col gap-4 ${errors.mode ? "before:bg-error relative before:absolute before:inset-y-0 before:-left-3 before:w-0.5" : ""}`}>
            <legend className={`text-base ${errors.mode ? "text-error" : ""}`}>
              Moyens de diffusion
              <span className="text-error ml-1" aria-hidden="true">
                *
              </span>
            </legend>
            <p id="mode-hint" className="text-text-mention text-sm">
              Sélectionner au moins un moyen de diffusion.
            </p>
            <Checkbox
              id="api"
              aria-describedby={errors.mode ? "mode-hint mode-error" : "mode-hint"}
              label="API"
              value={values.hasApiRights}
              onChange={(e) => onChange({ ...values, hasApiRights: e.target.checked })}
            />
            <Checkbox
              id="widget"
              aria-describedby={errors.mode ? "mode-hint mode-error" : "mode-hint"}
              label="Widgets"
              value={values.hasWidgetRights}
              onChange={(e) => onChange({ ...values, hasWidgetRights: e.target.checked })}
            />
            <Checkbox
              id="campagne"
              aria-describedby={errors.mode ? "mode-hint mode-error" : "mode-hint"}
              label="Campagnes"
              value={values.hasCampaignRights}
              onChange={(e) => onChange({ ...values, hasCampaignRights: e.target.checked })}
            />
            {errors.mode && (
              <p id="mode-error" className="text-error flex items-center text-sm" aria-live="polite">
                <RiErrorWarningFill className="mr-2" aria-hidden="true" />
                {errors.mode}
              </p>
            )}
          </fieldset>
          <div className="h-px w-full bg-gray-900" />
          <p className="text-base">
            {values.name} diffuse les missions de {selectedPublisherIds.size} annonceurs
          </p>
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un annonceur" timeout={0} />
          <Table caption="Liste des annonceurs" header={[{ title: "Annonceurs" }]} className="h-full max-h-96">
            {publishers
              .filter((item) => {
                if (!item?.name) {
                  return false;
                }
                const matchesSelection = editing ? item.id !== values.id : selectedPublisherIds.has(item.id);
                if (!matchesSelection) {
                  return false;
                }
                return item.name.toLowerCase().includes(search.toLowerCase());
              })
              .map((item, index) => (
                <tr key={index} className={`${index % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-row`}>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {editing && (
                        <input
                          id={item.id}
                          type="checkbox"
                          className="checkbox"
                          checked={selectedPublisherIds.has(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPublishers((prev) => {
                                if (prev.some((publisher) => publisher.publisherId === item.id)) {
                                  return prev;
                                }
                                return [
                                  ...prev,
                                  {
                                    publisherId: item.id,
                                    publisherName: item.name,
                                    publisherLogo: item.logo,
                                    moderator: item.moderator,
                                    missionType: item.missionType,
                                  },
                                ];
                              });
                            } else {
                              setSelectedPublishers((prev) => prev.filter((publisher) => publisher.publisherId !== item.id));
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
                  setSelectedPublishers(normalizeSelectedPublishers(values.publishers));
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
