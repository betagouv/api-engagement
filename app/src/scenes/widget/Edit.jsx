import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { BiSolidInfoSquare } from "react-icons/bi";
import { RiArrowLeftLine, RiCodeSSlashFill } from "react-icons/ri";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import JvaLogoSvg from "@/assets/svg/jva-logo.svg";
import RadioInput from "@/components/RadioInput";
import Toggle from "@/components/Toggle";
import api from "@/services/api";
import { BENEVOLAT_URL, VOLONTARIAT_URL } from "@/services/config";
import { captureError } from "@/services/error";
import useStore from "@/services/store";
import QueryBuilder from "./components/QueryBuilder";

const Edit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [widget, setWidget] = useState(null);
  const [values, setValues] = useState({
    name: "",
    type: "",
    url: "",
    distance: "25km",
    publishers: [],
    moderations: [],
    rules: [],
    jvaModeration: false,
  });
  const [stickyVisible, setStickyVisible] = useState(false);
  const [saveButton, setSaveButton] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/widget/${id}`);
        if (!res.ok) throw res;
        setWidget(res.data);
        setValues({
          name: res.data.name || "",
          type: res.data.type || "",
          url: res.data.url || "",
          distance: res.data.distance || "25km",
          publishers: res.data.publishers || [],
          moderations: res.data.moderations || [],
          rules: res.data.rules || [],
          jvaModeration: res.data.jvaModeration,
          color: res.data.color || "",
          style: res.data.style || "",
          location: res.data.location || null,
        });
        setLoading(false);
      } catch (error) {
        captureError(error, "Une erreur est survenue lors de la récupération du widget");
        navigate("/broadcast/widgets");
      }
    };
    fetchData();
  }, [id]);

  const handleSubmit = async () => {
    try {
      const res = await api.put(`/widget/${widget._id}`, values);
      if (!res.ok) throw res;
      setWidget(res.data);

      toast.success("Widget mis à jour");
    } catch (error) {
      captureError(error, "Erreur lors de la mise à jour du widget");
    }
  };

  const handleActivate = async (value) => {
    try {
      const res = await api.put(`/widget/${widget._id.toString()}`, { active: value });
      if (!res.ok) throw res;
      setWidget(res.data);
    } catch (error) {
      captureError(error, "Erreur lors de la mise à jour des données");
    }
  };

  const canSubmit = () => {
    if (values.publishers.length === 0) {
      return false;
    }

    for (let i = 0; i < values.rules.length; i++) {
      if (!values.rules[i].value) {
        return false;
      }
    }
    return true;
  };

  if (!widget) return <h2 className="p-3">Chargement...</h2>;

  return (
    <div className="space-y-6">
      <StickyBar onEdit={handleSubmit} visible={stickyVisible} widget={widget} handleActivate={handleActivate} canSubmit={canSubmit} />
      <div className="flex">
        <Link to={`/broadcast/widgets`} className="flex items-center space-x-1 text-blue-dark">
          <RiArrowLeftLine />
          <span>Retour</span>
        </Link>
      </div>

      <div className="flex items-center justify-between align-baseline">
        <div>
          <h1 className="text-4xl font-bold">Modifier un widget</h1>
          <span className="text-gray-dark">Créé le {new Date(widget.createdAt).toLocaleDateString("fr")}</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <Toggle value={widget.active} onChange={(value) => handleActivate(value)} />
            <label className="text-blue-dark text-xs">{widget.active ? "Actif" : "Inactif"}</label>
          </div>
          <button type="submit" className="filled-button" onClick={handleSubmit} ref={(node) => setSaveButton(node)} disabled={!canSubmit()}>
            Enregistrer
          </button>
        </div>
      </div>

      <Settings widget={widget} setWidget={setWidget} values={values} setValues={setValues} loading={loading} />
      <Frame widget={widget} setWidget={setWidget} />
      <Code widget={widget} />
    </div>
  );
};

const JVA_ID = "5f5931496c7ea514150a818f";
const SC_ID = "5f99dbe75eb1ad767733b206";

const Settings = ({ widget, values, setValues, loading }) => {
  const { publisher } = useStore();
  // const [publishers, setPublishers] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [total, setTotal] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (loading) return;
    const fetchMissions = async () => {
      try {
        const publishers = publisher.publishers.map((p) => p.publisherId);
        if (publisher.annonceur) publishers.push(publisher._id);
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
        if (publisher.annonceur && !newPublishers.some((p) => p._id === publisher._id)) newPublishers.push({ _id: publisher._id, name: publisher.name, count: 0 });
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
    <div className="bg-white p-12 space-y-12 shadow-lg">
      <div className="space-y-10">
        <h2 className="text-2xl font-bold">Informations générales</h2>

        <div className="grid grid-cols-2 gap-10">
          <div className="flex flex-col gap-4">
            <label className="text-base" htmlFor="name">
              Nom du widget<span className="ml-1 text-red-main">*</span>
            </label>
            <input id="name" className="input" name="name" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} disabled={!widget.new} />
          </div>

          <div className="flex flex-col gap-4">
            <label className="text-base" htmlFor="url">
              URL de la page où le widget est intégré
            </label>
            <input id="url" className="input" name="url" value={values.url} onChange={(e) => setValues({ ...values, url: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="border-b border-gray-border" />

      <div className="space-y-10">
        <h2 className="text-2xl font-bold">Missions à diffuser</h2>

        <div className="grid grid-cols-2 gap-10">
          <div className="space-y-4">
            <label className="text-base">
              Type de mission<span className="ml-1 text-red-main">*</span>
            </label>
            <div className="flex items-center">
              {publisher.publishers.filter((p) => p.publisherId !== SC_ID).length > 0 && (
                <RadioInput
                  id="type-benevolat"
                  name="type"
                  value="benevolat"
                  label="Bénévolat"
                  checked={values.type === "benevolat"}
                  onChange={() => setValues({ ...values, type: "benevolat", publishers: [] })}
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
                  onChange={() => setValues({ ...values, type: "volontariat", publishers: [SC_ID] })}
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
            <LocationSearch selected={values.location} onChange={(v) => setValues({ ...values, location: v })} />
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
              <select
                className="select w-full"
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
        </div>

        <div className="space-y-4">
          <label className="text-base" htmlFor="location">
            Diffuser des missions de
            <span className="ml-1 text-red-main">*</span>
          </label>

          {values.type === "benevolat" && (
            <div>
              <button
                className="text-blue-dark underline"
                onClick={() => {
                  setValues({ ...values, publishers: selectAll ? [] : publishers.map((p) => p._id) });
                  setSelectAll(!selectAll);
                }}
              >
                {selectAll ? "Tout déselectionner" : "Tout sélectionner"}
              </button>
            </div>
          )}

          {publishers.length === 0 ? (
            <p className="text-sm text-gray-dark">Aucun partenaire disponible</p>
          ) : (
            <div className={`grid grid-cols-3 gap-x-6 gap-y-3 ${values.type === "volontariat" ? "text-[#929292]" : ""}`}>
              {publishers
                .filter((item) => (values.type === "benevolat" ? item._id !== SC_ID : item._id === SC_ID))
                .sort((a, b) => b.count - a.count)
                .slice(0, showAll ? publishers.length : 15)
                .map((item, i) => (
                  <label
                    key={i}
                    className={`flex gap-4 border p-4 rounded cursor-pointer hover:border-blue-dark ${values.publishers.includes(item._id) ? "border-blue-dark" : "border-gray-300"}`}
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
                          setValues({ ...values, publishers: e.target.checked ? [...values.publishers, item._id] : values.publishers.filter((id) => id !== item._id) })
                        }
                      />
                    </div>

                    <div className="flex flex-col truncate">
                      <span className={`line-clamp-2 truncate text-sm ${values.publishers.includes(item._id) ? "text-blue-dark" : "text-black"}`}>{item.name}</span>
                      <div className={`flex ${values.type === "volontariat" ? "text-[#929292]" : "text-gray-dark"}`}>
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
                                  setValues({ ...values, moderations: [...values.moderations, { moderatorId: item._id, publisherId: m._id }] });
                                } else {
                                  setValues({ ...values, moderations: values.moderations.filter((id) => id.moderatorId !== item._id || id.publisherId !== m._id) });
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
            <button className="mt-6 border border-blue-dark p-2 text-blue-dark" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Masquer les annonceurs" : "Afficher tous les annonceurs"}
            </button>
          )}

          {values.publishers.includes(JVA_ID) && (
            <div className="flex items-center justify-between w-[50%] pt-6">
              <div> Afficher uniquement les missions modérées par JeVeuxAider.gouv.fr</div>
              <div className="flex items-center gap-4">
                <Toggle value={values.jvaModeration} onChange={(value) => setValues({ ...values, jvaModeration: value })} />
                <img src={JvaLogoSvg} className="w-16 ml-4" />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-base">Filtrer les missions à afficher</label>
            <p className="text-gray-dark">
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
            setRules={(rules) => setValues({ ...values, rules })}
            onSearch={(field, search) => handleSearch(field, search, values)}
          />
        </div>
      </div>

      <div className="my-6 border-b border-gray-border" />

      <div className="space-y-10">
        <h2 className="text-2xl font-bold">Personnalisation</h2>

        <div className="grid grid-cols-2 gap-10">
          <div className="flex flex-col gap-4">
            <label className="text-base" htmlFor="style">
              Mode d'affichage<span className="ml-1 text-red-main">*</span>
            </label>
            <div className="flex items-center justify-between">
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

          <div className="flex flex-col gap-4">
            <label className="text-base" htmlFor="color">
              Code hexadécimal couleur<span className="ml-1 text-red-main">*</span>
            </label>
            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded" style={{ backgroundColor: values.color }} />
              <input id="color" className="input flex-1" name="color" value={values.color} onChange={(e) => setValues({ ...values, color: e.target.value })} />
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

const Frame = ({ widget }) => {
  const [iframeKey, setIFrameKey] = useState(0);

  useEffect(() => {
    setIFrameKey(iframeKey + 1);
  }, [widget]);

  const handleLoad = (e) => {
    let height = 0;
    const width = e.target.offsetWidth;
    if (widget.type === "volontariat") {
      if (widget.style === "carousel") {
        if (width < 768) height = "670px";
        else height = "600px";
      } else {
        if (width < 640) height = "2200px";
        else if (width < 1024) height = "1350px";
        else height = "1050px";
      }
    } else {
      if (widget.style === "carousel") {
        if (width < 768) height = "780px";
        else height = "686px";
      } else {
        if (width < 640) height = "3424px";
        else if (width < 1024) height = "1862px";
        else height = "1314px";
      }
    }
    e.target.style.height = height;
  };

  return (
    <div className="bg-white p-16 space-y-10 shadow-lg">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold">Aperçu du widget</h2>
        <span>Enregistrez le widget pour mettre à jour l'aperçu</span>
      </div>

      <div className="my-10 border-b border-gray-border shadow-lg" />
      <iframe
        key={iframeKey}
        border="0"
        width="100%"
        style={{ border: "none", margin: "0", padding: "0" }}
        loading="lazy"
        allowFullScreen
        allow="geolocation"
        onLoad={handleLoad}
        src={`${widget.type === "volontariat" ? VOLONTARIAT_URL : BENEVOLAT_URL}?widget=${widget._id}&notrack=true`}
      />
    </div>
  );
};

const IFRAMES = {
  benevolat: {
    carousel: `<iframe title="Trouver une mission de bénévolat" border="0" frameborder="0" style="display:block; width:100%;" loading="lazy" allowfullscreen allow="geolocation" src="${BENEVOLAT_URL}?widget={{widgetId}}" onload="this.style.height=this.offsetWidth < 768 ? '780px': '686px'"></iframe>`,
    page: `<iframe title="Trouver une mission de bénévolat" border="0" frameborder="0" style="display:block; width:100%;" loading="lazy" allowfullscreen allow="geolocation" src="${BENEVOLAT_URL}?widget={{widgetId}}" onload="this.style.height=this.offsetWidth < 640 ? '3424px': this.offsetWidth < 1024 ? '1862px': '1314px'"></iframe>`,
  },
  volontariat: {
    carousel: `<iframe title="Trouver une mission de volontariat" border="0" frameborder="0" style="display:block; width:100%;" loading="lazy" allowfullscreen allow="geolocation" src="${VOLONTARIAT_URL}?widget={{widgetId}}" onload="this.style.height=this.offsetWidth < 768 ? '670px': '600px'"></iframe>`,
    page: `<iframe title="Trouver une mission de volontariat" border="0" frameborder="0" style="display:block; width:100%;" loading="lazy" allowfullscreen allow="geolocation" src="${VOLONTARIAT_URL}?widget={{widgetId}}" onload="this.style.height=this.offsetWidth < 640 ? '2200px': this.offsetWidth < 1024 ? '1350px': '1050px'"></iframe>`,
  },
};

const JVA_LOGO = `<div style="padding:10px; display:flex; justify-content:center; align-items:center;">
  <img src="https://apicivique.s3.eu-west-3.amazonaws.com/jvalogo.svg"/>
  <div style="color:#666666; font-style:normal; font-size:13px; padding:8px;">Proposé par la plateforme publique du bénévolat
    <a href="https://www.jeveuxaider.gouv.fr/" target="_blank">JeVeuxAider.gouv.fr</a>
  </div>
</div>`;

const Code = ({ widget }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(`${IFRAMES[widget.type][widget.style].replace("{{widgetId}}", widget._id)}${widget.type === "benevolat" ? `\n\n${JVA_LOGO}` : ""}`);
    toast.success("Lien copié");
  };

  return (
    <div className="bg-white p-12 space-y-12 shadow-lg">
      <h2 className="text-2xl font-bold">Code à intégrer</h2>
      <div className="flex items-center justify-between">
        <p>Vous n’avez plus qu’à intégrer ce code pour afficher le widget sur votre site</p>
        <button className="empty-button flex items-center" onClick={handleCopy}>
          <RiCodeSSlashFill className="mr-2" />
          Copier le code
        </button>
      </div>
      <div className="mt-6 w-full">
        <textarea
          className="px-4 py-2 text-base rounded-none disabled:opacity-80 w-full bg-[#F5F5FE] border border-[#E3E3FD]"
          rows={widget.type === "benevolat" ? 11 : 4}
          disabled={true}
          value={`${IFRAMES[widget.type][widget.style].replace("{{widgetId}}", widget._id)}${widget.type === "benevolat" ? `\n\n${JVA_LOGO}` : ""}`}
        />
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
        <ComboboxInput
          className="input mb-2 w-full border-b-black"
          displayValue={(location) => location?.label || search || selected?.label || ""}
          placeholder="Localisation"
          onChange={handleInputChange}
        />

        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
          <ComboboxOptions className="absolute max-h-60 w-full divide-y divide-gray-border overflow-auto bg-white text-base shadow-lg focus:outline-none">
            {options.map((option) => (
              <ComboboxOption key={option.value} value={option} className={({ active }) => `cursor-default select-none p-3 ${active ? "bg-gray-hover" : "bg-white"}`}>
                <span className={`truncate text-sm text-black ${selected?.label === option.label ? "text-blue-dark" : ""}`}>{option.label}</span>
              </ComboboxOption>
            ))}
          </ComboboxOptions>
        </Transition>
      </div>
    </Combobox>
  );
};

const StickyBar = ({ onEdit, visible, widget, handleActivate, canSubmit }) => {
  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 bg-white w-full shadow-lg py-4 items-center z-50">
      <div className="flex items-center justify-between w-[90%] m-auto">
        <h1 className="text-2xl font-bold">Modifier un widget</h1>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <Toggle value={widget.active} onChange={(value) => handleActivate(value)} />
            <label className="text-blue-dark text-xs">{widget.active ? "Actif" : "Inactif"}</label>
          </div>
          <button type="button" className="filled-button" onClick={onEdit} disabled={!canSubmit()}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

export default Edit;
