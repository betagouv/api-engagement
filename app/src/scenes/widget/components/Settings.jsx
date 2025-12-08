import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { BiSolidInfoSquare } from "react-icons/bi";

import JvaLogoSvg from "@/assets/svg/jva-logo.svg";
import RadioInput from "@/components/RadioInput";
import Toggle from "@/components/Toggle";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";
import QueryBuilder from "./QueryBuilder";

const JVA_ID = "5f5931496c7ea514150a818f";
const SC_ID = "5f99dbe75eb1ad767733b206";

const Settings = ({ widget, values, onChange, loading }) => {
  const { publisher } = useStore();
  const [publishers, setPublishers] = useState([]);
  const [total, setTotal] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (loading) return;
    const fetchMissions = async () => {
      try {
        const publishers = publisher.publishers.map((p) => p.diffuseurPublisherId);
        if (publisher.isAnnonceur) publishers.push(publisher.id);
        const query = {
          publishers,
          lat: values.location?.lat,
          lon: values.location?.lon,
          distance: values.distance,
          jvaModeration: values.jvaModeration,
          status: "ACCEPTED",
          size: 0,
        };

        const res = await api.post("/mission/search", query);
        if (!res.ok) throw res;
        const newPublishers = res.aggs.partners;
        if (publisher.isAnnonceur && !newPublishers.some((p) => p._id === publisher.id)) newPublishers.push({ _id: publisher.id, name: publisher.name, count: 0 });
        setPublishers(newPublishers);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des missions");
      }
    };
    fetchMissions();
  }, [loading, publisher, values.location, values.distance, values.jvaModeration]);

  useEffect(() => {
    if (loading) return;
    const fetchFilteredMissions = async () => {
      try {
        const query = {
          publishers: values.publishers,
          lat: values.location?.lat,
          lon: values.location?.lon,
          distance: values.distance,
          jvaModeration: values.jvaModeration,
          rules: values.rules,
          status: "ACCEPTED",
          size: 0,
        };

        const res = await api.post("/mission/search", query);
        if (!res.ok) throw res;
        setTotal(res.total);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des missions");
      }
    };
    fetchFilteredMissions();
  }, [loading, values.publishers, values.location, values.distance, values.jvaModeration, values.rules]);

  const handleSearch = async (field, search, currentValues) => {
    try {
      const publishers = currentValues.publishers.map((p) => `publishers[]=${p}`).join("&");
      const res = await api.get(`/mission/autocomplete?field=${field}&search=${search}&${publishers}`);
      if (!res.ok) throw res;
      return res.data;
    } catch (error) {
      captureError(error, "Erreur lors de la récupération des missions");
    }
    return [];
  };

  return (
    <div className="space-y-12 bg-white p-12 shadow-lg">
      <div className="space-y-10">
        <h2 className="text-2xl font-bold">Informations générales</h2>

        <div className="grid grid-cols-2 gap-10">
          <div className="flex flex-col gap-4">
            <label className="text-base" htmlFor="name">
              Nom du widget<span className="text-red-marianne ml-1">*</span>
            </label>
            <input id="name" className="input" name="name" value={values.name} onChange={(e) => onChange({ ...values, name: e.target.value })} disabled={Boolean(widget)} />
          </div>

          <div className="flex flex-col gap-4">
            <label className="text-base" htmlFor="url">
              URL de la page où le widget est intégré
            </label>
            <input id="url" className="input" name="url" value={values.url} onChange={(e) => onChange({ ...values, url: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="border-b border-gray-900" />

      <div className="space-y-10">
        <h2 className="text-2xl font-bold">Missions à diffuser</h2>

        <div className="grid grid-cols-2 gap-10">
          <div className="space-y-4">
            <label className="text-base">
              Type de mission<span className="text-red-marianne ml-1">*</span>
            </label>
            <div className="flex items-center">
              {publisher.publishers.filter((p) => p.publisherId !== SC_ID).length > 0 && (
                <RadioInput
                  id="type-benevolat"
                  name="type"
                  value="benevolat"
                  label="Bénévolat"
                  checked={values.type === "benevolat"}
                  onChange={() => onChange({ ...values, type: "benevolat", publishers: [] })}
                  className="flex-1"
                  size={24}
                />
              )}

              {publisher.publishers.some((p) => p.publisherId === SC_ID) && (
                <RadioInput
                  id="type-volontariat"
                  name="type"
                  value="volontariat"
                  label="Volontariat"
                  checked={values.type === "volontariat"}
                  onChange={() => onChange({ ...values, type: "volontariat", publishers: [SC_ID] })}
                  className="flex-1"
                  size={24}
                />
              )}
            </div>
          </div>
          <div />

          <div className="space-y-4">
            <label className="text-base" htmlFor="location">
              Ville ou code postal
            </label>
            <LocationSearch selected={values.location} onChange={(v) => onChange({ ...values, location: v })} />
            <div className="flex items-center gap-2 text-[#0063CB]">
              <BiSolidInfoSquare className="text-sm" />
              <span className="text-xs">Laisser vide pour afficher les missions de toute la France</span>
            </div>
          </div>

          <div className="space-y-4">
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

        <div className="space-y-4">
          <label className="text-base" htmlFor="location">
            Diffuser des missions de
            <span className="text-red-marianne ml-1">*</span>
          </label>

          {values.type === "benevolat" && (
            <div>
              <button
                className="text-blue-france underline"
                onClick={() => {
                  onChange({ ...values, publishers: selectAll ? [] : publishers.map((p) => p._id) });
                  setSelectAll(!selectAll);
                }}
              >
                {selectAll ? "Tout déselectionner" : "Tout sélectionner"}
              </button>
            </div>
          )}

          {publishers.length === 0 ? (
            <p className="text-gray-425 text-sm">Aucun partenaire disponible</p>
          ) : (
            <div className={`grid grid-cols-3 gap-x-6 gap-y-3 ${values.type === "volontariat" ? "text-[#929292]" : ""}`}>
              {publishers
                .filter((item) => (values.type === "benevolat" ? item._id !== SC_ID : item._id === SC_ID))
                .sort((a, b) => b.count - a.count)
                .slice(0, showAll ? publishers.length : 15)
                .map((item, i) => (
                  <label
                    key={i}
                    className={`hover:border-blue-france flex cursor-pointer gap-4 rounded border p-4 ${values.publishers.includes(item._id) ? "border-blue-france" : "border-gray-300"}`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="checkbox"
                        id={`${i}-publishers`}
                        name={`${i}-publishers`}
                        disabled={values.type === "volontariat"}
                        checked={values.publishers.includes(item._id) || values.type === "volontariat"}
                        onChange={(e) =>
                          onChange({ ...values, publishers: e.target.checked ? [...values.publishers, item._id] : values.publishers.filter((id) => id !== item._id) })
                        }
                      />
                    </div>

                    <div className="flex flex-col truncate">
                      <span className={`line-clamp-2 truncate text-sm ${values.publishers.includes(item._id) ? "text-blue-france" : "text-black"}`}>{item.name}</span>
                      <div className={`flex ${values.type === "volontariat" ? "text-[#929292]" : "text-gray-425"}`}>
                        <span className="text-xs">
                          {item.count.toLocaleString("fr")} {item.count > 1 ? "missions" : "mission"}
                        </span>
                      </div>
                    </div>

                    {item.moderation && item.moderation.length > 0 && values.publishers.includes(item._id) && (
                      <div className="pl-8">
                        {item.moderation.map((m, j) => (
                          <div key={j} className="flex items-center gap-2 py-1">
                            <input
                              type="checkbox"
                              className="checkbox"
                              id={`${j}-moderation`}
                              name={`${j}-moderation`}
                              checked={!!values.moderations.some((id) => id.moderatorId === item._id && id.publisherId === m._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  onChange({ ...values, moderations: [...values.moderations, { moderatorId: item._id, publisherId: m._id }] });
                                } else {
                                  onChange({ ...values, moderations: values.moderations.filter((id) => id.moderatorId !== item._id || id.publisherId !== m._id) });
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
          )}

          {publishers.length > 15 && values.type === "benevolat" && (
            <button className="border-blue-france text-blue-france mt-6 border p-2" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Masquer les annonceurs" : "Afficher tous les annonceurs"}
            </button>
          )}

          {values.publishers.includes(JVA_ID) && (
            <div className="flex w-[50%] items-center justify-between pt-6">
              <div> Afficher uniquement les missions modérées par JeVeuxAider.gouv.fr</div>
              <div className="flex items-center gap-4">
                <Toggle value={values.jvaModeration} onChange={(value) => onChange({ ...values, jvaModeration: value })} />
                <img src={JvaLogoSvg} className="ml-4 w-16" />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-base">Filtrer les missions à afficher</label>
            <p className="text-gray-425">
              {values.rules.length === 0 && "Aucun filtre appliqué - "}
              {total.toLocaleString("fr")} missions affichées
            </p>
          </div>

          <QueryBuilder
            fields={[
              { label: "Nom de l'organisation", value: "organizationName", type: "text" },
              { label: "Domaine de la mission", value: "domain", type: "text" },
              { label: "Nom du réseau", value: "organizationReseaux", type: "text" },
              { label: "Titre de la mission", value: "title", type: "text" },
              { label: "Code postal de la mission", value: "postalCode", type: "text" },
              { label: "Département de la mission", value: "departmentName", type: "text" },
              { label: "Région de la mission", value: "regionName", type: "text" },
              { label: "Activité de la mission", value: "activity", type: "text" },
              { label: "Tag personnalisé", value: "tags", type: "text" },
              { label: "Actions de l'organisation", value: "organizationActions", type: "text" },
              { label: "Ouvert au mineur", value: "openToMinors", type: "boolean" },
            ]}
            rules={values.rules || []}
            setRules={(rules) => onChange({ ...values, rules })}
            onSearch={(field, search) => handleSearch(field, search, values)}
          />
        </div>
      </div>

      <div className="my-6 border-b border-gray-900" />

      <div className="space-y-10">
        <h2 className="text-2xl font-bold">Personnalisation</h2>

        <div className="grid grid-cols-2 gap-10">
          <div className="flex flex-col gap-4">
            <label className="text-base" htmlFor="style">
              Mode d'affichage<span className="text-red-marianne ml-1">*</span>
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
                <span className="text-gray-425 text-xs">Grille de 6 missions par page</span>
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
                <span className="text-gray-425 text-xs">Fait défiler les missions 3 par 3</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <label className="text-base" htmlFor="color">
              Code hexadécimal couleur<span className="text-red-marianne ml-1">*</span>
            </label>
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded" style={{ backgroundColor: values.color }} />
              <input id="color" className="input flex-1" name="color" value={values.color} onChange={(e) => onChange({ ...values, color: e.target.value })} />
            </div>
            <div className="flex items-center gap-2 text-[#0063CB]">
              <BiSolidInfoSquare className="text-sm" />
              <span className="text-xs">Exemple: #000091</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LocationSearch = ({ selected, onChange }) => {
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState([]);

  const handleInputChange = async (e) => {
    e.preventDefault();
    const search = e.target.value;
    setSearch(search);
    if (search?.length > 3) {
      const res = await fetch(`https://api-adresse.data.gouv.fr/search?q=${search}&type=municipality&autocomplete=1&limit=6`).then((r) => r.json());
      if (!res.features) return;
      setOptions(
        res.features.map((f) => ({
          label: `${f.properties.name}, ${f.properties.city} ${f.properties.postcode}`,
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
        })),
      );
    }
    if (search.length === 0) {
      setOptions([]);
      onChange(null);
    }
  };

  return (
    <Combobox as={Fragment} value={selected} onChange={onChange}>
      <div className="relative w-full">
        <ComboboxInput
          className="input mb-2 w-full border-b-black"
          displayValue={(location) => location?.label || search || selected?.label || ""}
          placeholder="Localisation"
          onChange={handleInputChange}
        />

        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
          <ComboboxOptions className="absolute max-h-60 w-full divide-y divide-gray-900 overflow-auto bg-white text-base shadow-lg focus:outline-none">
            {options.map((option, index) => (
              <ComboboxOption key={`${option.label}-${index}`} value={option} className={({ active }) => `cursor-default p-3 select-none ${active ? "bg-gray-975" : "bg-white"}`}>
                <span className={`truncate text-sm text-black ${selected?.label === option.label ? "text-blue-france" : ""}`}>{option.label}</span>
              </ComboboxOption>
            ))}
          </ComboboxOptions>
        </Transition>
      </div>
    </Combobox>
  );
};

export default Settings;
