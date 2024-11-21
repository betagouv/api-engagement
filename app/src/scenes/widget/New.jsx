import { Combobox, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { BiSolidInfoSquare } from "react-icons/bi";
import { RiArrowLeftLine } from "react-icons/ri";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import JvaLogoSvg from "@/assets/svg/jva-logo.svg";
import RadioInput from "@/components/RadioInput";
import Toggle from "@/components/Toggle";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";
import QueryBuilder from "./components/QueryBuilder";

const New = () => {
  const { publisher } = useStore();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    name: "",
    type: "",
    url: "",
    distance: "25km",
    publishers: [],
    moderations: [],
    rules: [],
    jvaModeration: false,
    color: "#000091",
    style: "page",
    fromPublisherId: publisher._id.toString(),
  });
  const [errors, setErrors] = useState({});
  const [stickyVisible, setStickyVisible] = useState(false);
  const [saveButton, setSaveButton] = useState(null);

  useEffect(() => {
    if (!saveButton) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setStickyVisible(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(saveButton);

    return () => {
      if (saveButton) {
        observer.unobserve(saveButton);
      }
    };
  }, [saveButton]);

  const handleSubmit = async () => {
    const errors = {};
    if (!values.name) errors.name = "Le nom est requis";
    setErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      const res = await api.post(`/widget`, values);
      if (!res.ok) {
        if (res.code === "RESSOURCE_ALREADY_EXIST") {
          setErrors((prev) => ({
            ...prev,
            name: "Un widget avec ce nom existe déjà",
          }));
        } else {
          throw res;
        }
      } else {
        toast.success("Widget créé avec succès");
        navigate("/broadcast/widgets");
      }
    } catch (error) {
      captureError(error, "Erreur lors de la création du widget");
    }
  };

  const canSubmit = () => {
    for (let i = 0; i < values.rules.length; i++) {
      if (!values.rules[i].value) {
        return false;
      }
    }

    if (values.publishers.length === 0) {
      return false;
    }

    if (values.name.length < 3) {
      return false;
    }
    return true;
  };

  return (
    <div className="space-y-6">
      <StickyBar onEdit={handleSubmit} visible={stickyVisible} canSubmit={canSubmit} />
      <div className="flex">
        <Link to={`/broadcast/widgets`} className="flex items-center space-x-1 text-blue-dark">
          <RiArrowLeftLine />
          <span>Retour</span>
        </Link>
      </div>

      <div className="flex items-center justify-between align-baseline">
        <h1 className="text-4xl font-bold">Créer un widget</h1>
        <button type="submit" className="filled-button" onClick={handleSubmit} ref={(node) => setSaveButton(node)} disabled={!canSubmit()}>
          Créer le widget
        </button>
      </div>

      <Settings values={values} setValues={setValues} errors={errors} />
    </div>
  );
};

const Settings = ({ values, setValues, errors }) => {
  const { publisher } = useStore();
  const JVA_ID = "5f5931496c7ea514150a818f";
  const SC_ID = "5f99dbe75eb1ad767733b206";
  const [showAll, setShowAll] = useState(false);
  const [missions, setMissions] = useState([]);
  const [total, setTotal] = useState(0);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    const fetchMissions = async () => {
      try {
        const query = {
          publishers: publisher.publishers.map((p) => p.publisher),
          lat: values.location?.lat,
          lon: values.location?.lon,
          distance: values.distance,
          jvaModeration: values.jvaModeration,
          status: "ACCEPTED",
        };

        const res = await api.post("/mission/search", query);
        if (!res.ok) throw res;

        setMissions(res.aggs.partners);
      } catch (error) {
        captureError(error, "Une erreur est survenue lors de la récupération des missions");
      }
    };
    fetchMissions();
  }, [publisher, values.location, values.distance, values.jvaModeration]);

  useEffect(() => {
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
        "filtered missions called", query;
      } catch (error) {
        captureError(error, "Une erreur est survenue lors de la récupération des missions");
      }
    };
    fetchFilteredMissions();
  }, [publisher, values.location, values.distance, values.jvaModeration, values.rules, values.publishers]);

  useEffect(() => {
    if (publisher.publishers.length === 1 && publisher.publishers[0].publisher === SC_ID) {
      setValues({ ...values, type: "volontariat", publishers: [SC_ID] });
    } else if (publisher.publishers.length > 0 && publisher.publishers.some((p) => p.publisher !== SC_ID)) {
      setValues({ ...values, type: "benevolat" });
    } else {
      return;
    }
  }, [publisher]);

  useEffect(() => {
    setSelectAll(values.type === "benevolat" && values.publishers.length === publisher.publishers.filter((p) => p.publisher !== SC_ID).length);
  }, [values.publishers, values.type, publisher.publishers]);

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
    <div className="bg-white p-12 space-y-12 shadow-lg">
      <div className="flex justify-between gap-4">
        <h2 className="text-2xl font-bold">Informations générales</h2>
      </div>
      <div className="grid grid-cols-2 gap-10">
        <div className="flex flex-col">
          <label className="mb-2" htmlFor="name">
            Nom du widget<span className="ml-1 text-red-main">*</span>
          </label>
          <input
            id="name"
            className={`input mb-2 ${errors.name ? "border-b-red-main" : "border-b-black"}`}
            name="name"
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
          />
          {errors.name && (
            <div className="flex items-center text-sm text-red-main">
              <BiSolidInfoSquare className="mr-2" />
              {errors.name}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <label className="mb-2 flex items-center" htmlFor="url">
            URL de la page où le widget est intégré
          </label>
          <input
            className={`input mb-2 ${errors.url ? "border-b-red-main" : "border-b-black"}`}
            id="url"
            name="url"
            value={values.url}
            onChange={(e) => setValues({ ...values, url: e.target.value })}
          />
          {errors.url && (
            <div className="flex items-center text-sm text-red-main">
              <BiSolidInfoSquare className="mr-2" />
              {errors.url}
            </div>
          )}
        </div>
      </div>

      <div className="border-b border-gray-border" />

      <h2 className="text-2xl font-bold">Missions à diffuser</h2>
      <div className="grid grid-cols-2 gap-10">
        <div className="flex flex-col">
          <label className="mb-2" htmlFor="type">
            Type de mission<span className="ml-1 text-red-main">*</span>
          </label>
          <div className="flex items-center justify-between">
            {publisher.publishers && publisher.publishers.some((p) => p.publisher === SC_ID) && publisher.publishers.length === 1 ? (
              <>
                <label htmlFor="type-volontariat" className="sr-only">
                  Volontariat
                </label>
                <RadioInput
                  id="type-volontariat"
                  name="type"
                  value="volontariat"
                  label="Volontariat"
                  checked={values.type === "volontariat"}
                  onChange={() => setValues({ ...values, type: "volontariat", publishers: [missions.find((p) => p.mission_type === "volontariat")?._id] })}
                  disabled={true}
                />
              </>
            ) : publisher.publishers && !publisher.publishers.some((p) => p.publisher === SC_ID) && publisher.publishers.length > 0 ? (
              <>
                <label htmlFor="type-benevolat" className="sr-only">
                  Bénévolat
                </label>
                <RadioInput
                  id="type-benevolat"
                  name="type"
                  value="benevolat"
                  label="Bénévolat"
                  checked={values.type === "benevolat"}
                  onChange={() => setValues({ ...values, type: "benevolat", publishers: [] })}
                  disabled={true}
                />
              </>
            ) : (
              <>
                <label htmlFor="type-benevolat" className="sr-only">
                  Bénévolat
                </label>
                <RadioInput
                  id="type-benevolat"
                  name="type"
                  value="benevolat"
                  label="Bénévolat"
                  checked={values.type === "benevolat"}
                  onChange={() => setValues({ ...values, type: "benevolat", publishers: [] })}
                />
                <label htmlFor="type-volontariat" className="sr-only">
                  Volontariat
                </label>
                <RadioInput
                  id="type-volontariat"
                  name="type"
                  value="volontariat"
                  label="Volontariat"
                  checked={values.type === "volontariat"}
                  onChange={() => setValues({ ...values, type: "volontariat", jvaModeration: false, publishers: [SC_ID] })}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-10 mb-10">
        <div className="flex flex-col">
          <label className="mb-2" htmlFor="location">
            Ville ou code postal
          </label>
          <LocationSearch selected={values.location} onChange={(v) => setValues({ ...values, location: v })} />
          <div className="flex items-center gap-2 text-[#0063CB]">
            <BiSolidInfoSquare className="text-sm" />
            <span className="text-xs">Laisser vide pour afficher les missions de toute la France</span>
          </div>
        </div>
        <div className="flex flex-col">
          <label className="mb-2" htmlFor="distance">
            Rayon de recherche
          </label>
          <select
            className={`select mb-2 ${errors.distance ? "border-b-red-main" : "border-b-black"}`}
            id="distance"
            name="distance"
            value={values.distance || "25km"}
            onChange={(e) => setValues({ ...values, distance: e.target.value })}
          >
            {["1km", "5km", "25km", "50km", "100km"].map((d, i) => (
              <option key={i} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div>
          <div className="flex">
            <h2>Diffuser des missions de</h2>
            <span className="ml-1 text-red-main">*</span>
          </div>
          {values.type === "benevolat" ? (
            <button
              className="text-blue-dark underline mt-2"
              onClick={(e) => {
                if (selectAll) {
                  setValues({ ...values, publishers: [] });
                } else {
                  setValues({ ...values, publishers: publisher.publishers.filter((p) => p.publisher !== SC_ID).map((p) => p.publisher) });
                }
                setSelectAll(!selectAll);
              }}
            >
              {selectAll ? "Tout déselectionner" : "Tout sélectionner"}
            </button>
          ) : (
            <div></div>
          )}

          {publisher.publishers.length === 0 ? (
            <div className="mt-5">
              <span className="text-sm text-gray-dark">Aucun partenaire disponible</span>
            </div>
          ) : (
            <div className={`mt-5 grid grid-cols-3 gap-x-6 gap-y-3 ${values.type === "volontariat" ? "text-[#929292]" : ""}`}>
              {publisher.publishers
                .filter((pub) => (values.type === "benevolat" ? pub.publisher !== SC_ID : pub.publisher === SC_ID))
                .sort((a, b) => {
                  const countA = missions.find((mission) => mission._id === a.publisher)?.count || 0;
                  const countB = missions.find((mission) => mission._id === b.publisher)?.count || 0;
                  return countB - countA;
                })
                .slice(0, showAll ? publisher.publishers.length : 15)
                .map((pub, i) => (
                  <label
                    key={i}
                    className={`flex gap-4 border p-4 rounded cursor-pointer hover:border-blue-dark ${values.publishers.includes(pub.publisher) ? "border-blue-dark" : "border-gray-300"}`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="checkbox"
                        id={`${i}-publishers`}
                        name={`${i}-publishers`}
                        disabled={values.type === "volontariat"}
                        checked={values.publishers.includes(pub.publisher) || values.type === "volontariat"}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setValues({ ...values, publishers: [...values.publishers, pub.publisher] });
                          } else {
                            setValues({ ...values, publishers: values.publishers.filter((id) => id !== pub.publisher) });
                          }
                        }}
                      />
                    </div>

                    <div className="flex flex-col truncate">
                      <span className={`line-clamp-2 truncate text-sm ${values.publishers.includes(pub.publisher) ? "text-blue-dark" : "text-black"}`}>{pub.publisherName}</span>
                      <div className={`flex ${values.type === "volontariat" ? "text-[#929292]" : "text-gray-dark"}`}>
                        <span className="text-xs">
                          {(missions.find((mission) => mission._id === pub.publisher)?.count || 0).toLocaleString("fr")}{" "}
                          {missions.find((mission) => mission._id === pub.publisher)?.count > 1 ? "missions" : "mission"}
                        </span>
                      </div>
                    </div>

                    {missions.find((mission) => mission._id === pub.publisher)?.moderation &&
                      missions.find((mission) => mission._id === pub.publisher).moderation.length > 0 &&
                      values.publishers.includes(pub.publisher) && (
                        <div className="pl-8">
                          {missions
                            .find((mission) => mission._id === pub.publisher)
                            .moderation.map((m, j) => (
                              <div key={j} className="flex items-center gap-2 py-1">
                                <input
                                  type="checkbox"
                                  className="checkbox"
                                  id={`${j}-moderation`}
                                  name={`${j}-moderation`}
                                  checked={!!values.moderations.some((id) => id.moderatorId === pub.publisher && id.publisherId === m._id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setValues({ ...values, moderations: [...values.moderations, { moderatorId: pub.publisher, publisherId: m._id }] });
                                    } else {
                                      setValues({ ...values, moderations: values.moderations.filter((id) => id.moderatorId !== pub.publisher || id.publisherId !== m._id) });
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
        </div>

        {publisher.publishers.length > 15 && values.type !== "volontariat" && (
          <button className="mt-6 border border-blue-dark p-2 text-blue-dark" onClick={() => setShowAll(!showAll)}>
            {showAll ? "Masquer les annonceurs" : "Afficher tous les annonceurs"}
          </button>
        )}
      </div>

      {values.publishers.includes(JVA_ID) && values.type === "benevolat" && (
        <div className="mt-6 flex items-center justify-between w-[50%]">
          <div> Afficher uniquement les missions modérées par JeVeuxAider.gouv.fr</div>
          <div className="flex items-center gap-4">
            <Toggle checked={values.jvaModeration} setChecked={(value) => setValues({ ...values, jvaModeration: value })} />
            <img src={JvaLogoSvg} className="w-16 ml-4" />
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <div>Filtrer les missions à afficher</div>
        <span className="text-gray-dark">{total.toLocaleString("fr")} missions affichées</span>

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
          setRules={(rules) => setValues({ ...values, rules })}
          onSearch={(field, search) => handleSearch(field, search, values)}
          className="mt-5"
        />
      </div>
      <div className="my-6 border-b border-gray-border" />
      <div className="flex justify-between gap-4">
        <h2 className="text-2xl font-bold">Personnalisation</h2>
      </div>
      <div className="grid grid-cols-2 gap-10">
        <div className="flex flex-col gap-2">
          <label className="mb-2" htmlFor="style">
            Mode d'affichage<span className="ml-1 text-red-main">*</span>
          </label>
          <div className="flex items-center justify-between mr-10">
            <div>
              <RadioInput
                id="style-page"
                name="style"
                value="page"
                label="Catalogue"
                checked={values.style === "page"}
                onChange={(e) => setValues({ ...values, style: e.target.value })}
              />
              <span className="text-xs text-gray-dark">Grille de 6 missions par page</span>
            </div>

            <div>
              <RadioInput
                id="style-carousel"
                name="style"
                value="carousel"
                label="Carrousel"
                checked={values.style === "carousel"}
                onChange={(e) => setValues({ ...values, style: e.target.value })}
              />
              <span className="text-xs text-gray-dark">Fait défiler les missions 3 par 3</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <label className="mb-2 " htmlFor="color">
            Code hexadécimal couleur<span className="ml-1 text-red-main">*</span>
          </label>
          <div className="flex items-center gap-4">
            <div className="h-9 w-9 rounded" style={{ backgroundColor: values.color || "#000091" }} />

            <input className="input flex-1 border-b-black" name="color" value={values.color || "#000091"} onChange={(e) => setValues({ ...values, color: e.target.value })} />
          </div>
          <div className="flex items-center gap-2 text-[#0063CB] mt-2">
            <BiSolidInfoSquare className="text-sm" />
            <span className="text-xs">Exemple: #000091</span>
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
          city: f.properties.city,
          postcode: f.properties.postcode,
          name: f.properties.name,
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
        <Combobox.Input
          className="input mb-2 w-full border-b-black"
          displayValue={(location) => location?.label || search || selected?.label || ""}
          placeholder="Localisation"
          onChange={handleInputChange}
        />

        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
          <Combobox.Options className="absolute max-h-60 w-80 divide-y divide-gray-border overflow-auto bg-white text-base shadow-lg focus:outline-none">
            {options.map((option) => (
              <Combobox.Option key={option.value} value={option} className={({ active }) => `cursor-default select-none p-3 ${active ? "bg-gray-hover" : "bg-white"}`}>
                <span className={`truncate text-sm text-black ${selected?.label === option.label ? "text-blue-dark" : ""}`}>{option.label}</span>
              </Combobox.Option>
            ))}
          </Combobox.Options>
        </Transition>
      </div>
    </Combobox>
  );
};

const StickyBar = ({ onEdit, visible, canSubmit }) => {
  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 bg-white w-full shadow-lg py-4 items-center z-50">
      <div className="flex items-center justify-between w-[90%] m-auto">
        <h1 className="text-2xl font-bold">Créer un widget</h1>
        <button type="button" className="filled-button" onClick={onEdit} disabled={!canSubmit()}>
          Créer le widget
        </button>
      </div>
    </div>
  );
};

export default New;
