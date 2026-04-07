import { useEffect, useMemo, useState } from "react";
import { BiSolidInfoSquare } from "react-icons/bi";

import JvaLogoSvg from "@/assets/svg/jva-logo.svg";
import LocationCombobox from "@/components/combobox/LocationCombobox";
import RadioInput from "@/components/form/RadioInput";
import Toggle from "@/components/Toggle";
import QueryBuilder from "@/scenes/widget/components/QueryBuilder";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";

const JVA_ID = "5f5931496c7ea514150a818f";

const MISSION_TYPE_LABELS = {
  benevolat: "Bénévolat",
  volontariat: "Service Civique",
  volontariat_sapeurs_pompiers: "Sapeurs-pompiers",
  volontariat_reserve_operationnelle: "Réserve opérationnelle",
};

const toWidgetType = (missionType) => {
  if (missionType === "volontariat_service_civique") return "volontariat";
  return missionType || "benevolat";
};

const Settings = ({ widget, values, onChange, loading }) => {
  const { publisher } = useStore();
  const [publishers, setPublishers] = useState([]);
  const [total, setTotal] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  const availableTypes = useMemo(() => {
    const types = new Set();
    publisher.publishers.forEach((p) => types.add(toWidgetType(p.missionType)));
    if (publisher.isAnnonceur && publisher.missionType) types.add(toWidgetType(publisher.missionType));
    return Object.keys(MISSION_TYPE_LABELS).filter((t) => types.has(t));
  }, [publisher]);

  useEffect(() => {
    if (loading) return;
    const items = publisher.publishers.map((p) => ({
      key: p.diffuseurPublisherId,
      label: p.diffuseurPublisherName,
      mission_type: toWidgetType(p.missionType),
    }));
    if (publisher.isAnnonceur) {
      items.push({ key: publisher.id, label: publisher.name, mission_type: toWidgetType(publisher.missionType) });
    }
    setPublishers(items);
  }, [loading, publisher]);

  useEffect(() => {
    if (loading) {
      return;
    }
    const timeout = setTimeout(() => {
      const fetchFilteredMissions = async () => {
        try {
          const query = {
            publisherIds: values.publishers,
            type: values.type ? [values.type] : undefined,
            lat: values.location?.lat,
            lon: values.location?.lon,
            distance: values.distance,
            jvaModeration: values.jvaModeration,
            rules: values.rules,
            status: "ACCEPTED",
            size: 0,
          };

          const res = await api.post("/mission/search", query);
          if (!res.ok) {
            throw res;
          }
          setTotal(res.total);
        } catch (error) {
          captureError(error, { extra: { publisherId: publisher.id } });
        }
      };
      fetchFilteredMissions();
    }, 1000);
    return () => clearTimeout(timeout);
  }, [loading, values.type, values.publishers, values.location, values.distance, values.jvaModeration, values.rules]);

  return (
    <div className="space-y-12 bg-white p-12 shadow-lg">
      <div className="space-y-10">
        <h2 className="text-2xl font-bold">Informations générales</h2>

        <div className="grid grid-cols-2 gap-10">
          <div className="flex flex-col gap-4">
            <label className="text-base" htmlFor="name">
              Nom du widget<span className="text-error ml-1">*</span>
            </label>
            <input id="name" className="input" name="name" value={values.name} onChange={(e) => onChange({ ...values, name: e.target.value })} readOnly={Boolean(widget)} />
          </div>

          <div className="flex flex-col gap-4">
            <label className="text-base" htmlFor="url">
              URL de la page où le widget est intégré
            </label>
            <input id="url" className="input" name="url" value={values.url} onChange={(e) => onChange({ ...values, url: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="border-grey-border border-b" />

      <div className="space-y-10">
        <h2 className="text-2xl font-bold">Missions à diffuser</h2>

        <div className="grid grid-cols-2 gap-10">
          <div className="flex flex-col gap-1">
            <label className="text-base">
              Type de mission<span className="text-error ml-1">*</span>
            </label>
            <div className="flex items-center">
              {availableTypes.map((type) => (
                <RadioInput
                  key={type}
                  id={`type-${type}`}
                  name="type"
                  value={type}
                  label={MISSION_TYPE_LABELS[type]}
                  checked={values.type === type}
                  onChange={() => onChange({ ...values, type, publishers: [] })}
                  className="flex-1"
                  size={24}
                />
              ))}
            </div>
          </div>
          <div />

          <div className="flex flex-col gap-1">
            <label className="text-base" htmlFor="location">
              Ville ou code postal
            </label>
            <LocationCombobox
              id="location"
              selected={values.location ? { label: values.location.label, value: `${values.location.lat}-${values.location.lon}` } : null}
              onSelect={(v) => onChange({ ...values, location: v ? { label: v.label, lat: parseFloat(v.value.split("-")[0]), lon: parseFloat(v.value.split("-")[1]) } : null })}
              placeholder="Localisation"
            />
            <div className="text-info mt-4 flex items-center gap-2">
              <BiSolidInfoSquare className="text-sm" aria-hidden="true" />
              <span className="text-xs">Laisser vide pour afficher les missions de toute la France</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-base" htmlFor="distance">
              Rayon de recherche
            </label>
            <div className="w-full">
              <select className="select w-full" id="distance" name="distance" value={values.distance || "25km"} onChange={(e) => onChange({ ...values, distance: e.target.value })}>
                {["1km", "5km", "25km", "50km", "100km"].map((d, i) => (
                  <option key={i} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-base" htmlFor="location">
            Diffuser des missions de
            <span className="text-error ml-1">*</span>
          </label>

          <div>
            <button
              className="text-blue-france cursor-pointer underline"
              onClick={() => {
                onChange({ ...values, publishers: selectAll ? [] : publishers.filter((p) => (p.mission_type || "benevolat") === values.type).map((p) => p.key) });
                setSelectAll(!selectAll);
              }}
            >
              {selectAll ? "Tout déselectionner" : "Tout sélectionner"}
            </button>
          </div>

          {(() => {
            const filteredPublishers = publishers.filter((item) => (item.mission_type || "benevolat") === values.type).sort((a, b) => b.doc_count - a.doc_count);
            return filteredPublishers.length === 0 ? (
              <p className="text-text-mention text-sm">Aucun partenaire disponible</p>
            ) : (
              <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                {filteredPublishers.slice(0, showAll ? filteredPublishers.length : 15).map((item, i) => (
                  <label
                    key={i}
                    className={`hover:border-blue-france flex cursor-pointer gap-4 rounded border p-4 ${values.publishers.includes(item.key) ? "border-blue-france" : "border-gray-300"}`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="checkbox"
                        id={`${i}-publishers`}
                        name={`${i}-publishers`}
                        checked={values.publishers.includes(item.key)}
                        onChange={(e) =>
                          onChange({ ...values, publishers: e.target.checked ? [...values.publishers, item.key] : values.publishers.filter((id) => id !== item.key) })
                        }
                      />
                    </div>

                    <div className="flex flex-col truncate">
                      <span className={`line-clamp-2 truncate text-sm ${values.publishers.includes(item.key) ? "text-blue-france" : "text-black"}`}>{item.label}</span>
                    </div>

                    {item.moderation && item.moderation.length > 0 && values.publishers.includes(item.key) && (
                      <div className="pl-8">
                        {item.moderation.map((m, j) => (
                          <div key={j} className="flex items-center gap-2 py-1">
                            <input
                              type="checkbox"
                              className="checkbox"
                              id={`${j}-moderation`}
                              name={`${j}-moderation`}
                              checked={!!values.moderations.some((id) => id.moderatorId === item.key && id.publisherId === m.key)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  onChange({ ...values, moderations: [...values.moderations, { moderatorId: item.key, publisherId: m.key }] });
                                } else {
                                  onChange({ ...values, moderations: values.moderations.filter((id) => id.moderatorId !== item.key || id.publisherId !== m.key) });
                                }
                              }}
                            />
                            <label className="line-clamp-2 truncate text-xs" htmlFor={`${j}-moderation`}>
                              {m.name} - {m.count > 1 ? `${m.count.toLocaleString("fr")} missions` : `${m.count} mission`}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </label>
                ))}
              </div>
            );
          })()}

          {publishers.filter((item) => (item.mission_type || "benevolat") === values.type).length > 15 && (
            <button className="border-blue-france text-blue-france mt-6 border p-2" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Masquer les annonceurs" : "Afficher tous les annonceurs"}
            </button>
          )}

          {values.publishers.includes(JVA_ID) && (
            <div className="flex w-[50%] items-center justify-between pt-6">
              <div> Afficher uniquement les missions modérées par JeVeuxAider.gouv.fr</div>
              <div className="flex items-center gap-4">
                <Toggle
                  aria-label="Afficher uniquement les missions modérées par JeVeuxAider.gouv.fr"
                  value={values.jvaModeration}
                  onChange={(value) => onChange({ ...values, jvaModeration: value })}
                />
                <img src={JvaLogoSvg} className="ml-4 w-16" aria-hidden="true" alt="" />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-base">Filtrer les missions à afficher</label>
            <p className="text-text-mention">
              {values.rules.length === 0 && "Aucun filtre appliqué - "}
              {total.toLocaleString("fr")} missions affichées
            </p>
          </div>

          <QueryBuilder values={values} onChange={(rules) => onChange({ ...values, rules })} />
        </div>
      </div>

      <div className="border-grey-border my-6 border-b" />

      <div className="space-y-10">
        <h2 className="text-2xl font-bold">Personnalisation</h2>

        <div className="grid grid-cols-2 gap-10">
          <div className="flex flex-col gap-4">
            <label className="text-base" htmlFor="style">
              Mode d'affichage<span className="text-error ml-1">*</span>
            </label>
            <div className="flex items-center justify-between">
              <div>
                <RadioInput
                  id="style-page"
                  name="style"
                  value="page"
                  label="Catalogue"
                  checked={values.style === "page"}
                  onChange={(e) => onChange({ ...values, style: e.target.value })}
                />
                <span className="text-text-mention text-xs">Grille de 6 missions par page</span>
              </div>

              <div>
                <RadioInput
                  id="style-carousel"
                  name="style"
                  value="carousel"
                  label="Carrousel"
                  checked={values.style === "carousel"}
                  onChange={(e) => onChange({ ...values, style: e.target.value })}
                />
                <span className="text-text-mention text-xs">Fait défiler les missions 3 par 3</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <label className="text-base" htmlFor="color">
              Code hexadécimal couleur<span className="text-error ml-1">*</span>
            </label>
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded" style={{ backgroundColor: values.color }} />
              <input id="color" className="input flex-1" name="color" value={values.color} onChange={(e) => onChange({ ...values, color: e.target.value })} />
            </div>
            <div className="text-info flex items-center gap-2">
              <BiSolidInfoSquare className="text-sm" aria-hidden="true" />
              <span className="text-xs">Exemple: #000091</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
