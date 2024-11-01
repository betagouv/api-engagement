import { Combobox, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { RiCodeSSlashFill, RiErrorWarningFill } from "react-icons/ri";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import JvaLogoSvg from "@/assets/svg/jva-logo.svg";
import RadioInput from "@/components/RadioInput";
import Toggle from "@/components/Toggle";
import api from "@/services/api";
import { BENEVOLAT_URL, VOLONTARIAT_URL } from "@/services/config";
import { captureError } from "@/services/error";
import QueryBuilder from "./components/QueryBuilder";

const Edit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [widget, setWidget] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/widget/${id}`);
        if (!res.ok) throw res;
        setWidget(res.data);
      } catch (error) {
        captureError(error, "Une erreur est survenue lors de la récupération du widget");
        navigate("/broadcast/widgets");
      }
    };
    fetchData();
  }, [id]);

  if (!widget) return <h2 className="p-3">Chargement...</h2>;

  return (
    <div className="space-y-12">
      <h1 className="text-4xl font-bold">Edition d’un Widget</h1>

      <Settings widget={widget} setWidget={setWidget} />
      <Frame widget={widget} setWidget={setWidget} />
      <Code widget={widget} />
    </div>
  );
};

const Settings = ({ widget, setWidget }) => {
  const [filter, setFilter] = useState(widget.rules && widget.rules.length > 0);
  const [partners, setPartners] = useState([]);
  const [values, setValues] = useState({
    name: widget.name || "",
    type: widget.type || "",
    url: widget.url || "",
    location: widget.location || null,
    distance: widget.distance || "",
    publishers: widget.publishers || [],
    moderations: widget.moderations || [],
    rules: widget.rules || [],
    jvaModeration: widget.jvaModeration,
  });
  const [errors, setErrors] = useState({});
  const [jvaModeration, setJvaModeration] = useState(widget.jvaModeration);
  const JVA_ID = "5f5931496c7ea514150a818f";

  useEffect(() => {
    setValues({
      name: widget.name || "",
      type: widget.type || "",
      url: widget.url || "",
      location: widget.location || null,
      distance: widget.distance || "",
      publishers: widget.publishers || [],
      moderations: widget.moderations || [],
      rules: widget.rules || [],
      jvaModeration: widget.jvaModeration,
    });
  }, [widget]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const query = new URLSearchParams();
        query.append("jvaModeration", jvaModeration);
        const res = await api.get(`/widget/${widget._id}/partners?${query.toString()}`);

        if (!res.ok) throw res;
        setPartners(res.data);
      } catch (error) {
        captureError(error, "Une erreur est survenue lors de la récupération des partenaires");
      }
    };
    fetchData();
  }, [jvaModeration]);

  const handleSubmit = async () => {
    const errors = {};
    if (!values.name) errors.name = "Le nom est requis";
    setErrors(errors);
    if (Object.keys(errors).length > 0) return;

    values.jvaModeration = jvaModeration;
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

  const handleSearch = async (field, search) => {
    try {
      const res = await api.get(`/mission/autocomplete?field=${field}&search=${search}&${values.publishers.map((p) => `publishers[]=${p}`).join("&")}`);
      if (!res.ok) throw res;
      return res.data;
    } catch (error) {
      captureError(error, "Erreur lors de la récupération des missions");
    }
    return [];
  };

  const canSubmit = () => {
    for (let i = 0; i < values.rules.length; i++) {
      if (!values.rules[i].value) {
        return false;
      }
    }
    return true;
  };

  return (
    <div className="bg-white p-12 space-y-12 shadow-lg">
      <div className="flex justify-between gap-4">
        <h2 className="text-3xl font-bold">Informations générales</h2>
        <div>
          <span>Créée le {new Date(widget.createdAt).toLocaleDateString("fr")}</span>
          <div className="mt-3 flex items-center">
            <Toggle checked={widget.active} setChecked={handleActivate} />
            <label className="ml-2 text-blue-dark">{widget.active ? "Activée" : "Désactivée"}</label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-10">
        <div className="flex flex-col">
          <label className="mb-2 text-sm" htmlFor="name">
            Nom du widget<span className="ml-1 text-red-main">*</span>
          </label>
          <input
            className={`input mb-2 ${errors.name ? "border-b-red-main" : "border-b-black"}`}
            name="name"
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            disabled={!widget.new}
          />
          {errors.name && (
            <div className="flex items-center text-sm text-red-main">
              <RiErrorWarningFill className="mr-2" />
              {errors.name}
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <label className="mb-2 text-sm" htmlFor="name">
            Type de mission<span className="ml-1 text-red-main">*</span>
          </label>
          <div className="flex items-center gap-4">
            <RadioInput
              id="type-benevolat"
              name="type"
              value="benevolat"
              label="Bénévolat"
              checked={values.type === "benevolat"}
              onChange={() => setValues({ ...values, type: "benevolat" })}
            />
            <RadioInput
              id="type-volontariat"
              name="type"
              value="volontariat"
              label="Volontariat"
              checked={values.type === "volontariat"}
              onChange={() => setValues({ ...values, type: "volontariat" })}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="mb-2 text-sm">Partenaire diffusant le widget</label>
          <input className="input mb-2 border-b-black" disabled defaultValue={widget.fromPublisherName} />
        </div>

        <div className="flex flex-col">
          <label className="mb-2 flex items-center text-sm" htmlFor="url">
            URL de la page intégrant le widget
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
              <RiErrorWarningFill className="mr-2" />
              {errors.url}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <label className="mb-2 text-sm" htmlFor="location">
            Zone géographique
          </label>
          <LocationSearch selected={values.location} onChange={(v) => setValues({ ...values, location: v })} />
          <span className="text-xs text-gray-dark">Laisser vide si recherche sur toute la France</span>
        </div>
        <div className="flex flex-col">
          <label className="mb-2 text-sm" htmlFor="distance">
            Rayon de recherche autour de la zone géographique
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
      {values.publishers.includes(JVA_ID) && (
        <>
          <div className="my-6 border-b border-gray-border" />
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold">Modération des missions</h2>
            <div className="flex items-center">
              <span className="mr-3 text-xs text-black">
                N’afficher que les missions modérées par <b>JeVeuxAider.gouv.fr</b>
              </span>
              <Toggle checked={jvaModeration} setChecked={(value) => setJvaModeration(value)} />
              <img src={JvaLogoSvg} className="w-16 ml-4" />
            </div>
          </div>
        </>
      )}
      <div className="my-6 border-b border-gray-border" />
      <div>
        <h2 className="text-3xl font-bold">Diffuser des missions de</h2>
        {partners.filter((p) => p.mission_type === values.type) === 0 ? (
          <div className="mt-5">
            <span className="text-sm text-gray-dark">Aucun partenaire disponible</span>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-3 gap-x-6 gap-y-3">
            {partners
              .filter((p) => p.mission_type === values.type)
              .map((p, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="checkbox"
                      id={`${i}-publishers`}
                      name={`${i}-publishers`}
                      value={p.count}
                      checked={values.publishers.includes(p._id)}
                      onChange={(e) => {
                        if (e.target.checked) setValues({ ...values, publishers: [...values.publishers, p._id] });
                        else setValues({ ...values, publishers: values.publishers.filter((id) => id !== p._id) });
                      }}
                    />
                    <label className="line-clamp-2 truncate text-sm" htmlFor={`${i}-publishers`}>
                      {p.name}
                    </label>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="test-gray-dark ml-6 text-xs">{p.count > 1 ? `${p.count} missions` : `${p.count} mission`}</span>
                    {p.moderation && p.moderation.length && (
                      <span className="text-xs p-1 rounded bg-blue-100 text-blue-800"> + {p.moderation.reduce((acc, curr) => acc + curr.count, 0)} mission modérées</span>
                    )}
                  </div>
                  {p.moderation && p.moderation.length && values.publishers.includes(p._id) && (
                    <div className="pl-8">
                      {p.moderation.map((m, j) => (
                        <div key={j} className="flex items-center gap-2 py-1">
                          <input
                            type="checkbox"
                            className="checkbox"
                            id={`${j}-moderation`}
                            name={`${j}-moderation`}
                            value={p.count}
                            checked={!!values.moderations.some((id) => id.moderatorId === p._id && id.publisherId === m._id)}
                            onChange={(e) => {
                              if (e.target.checked) setValues({ ...values, moderations: [...values.moderations, { moderatorId: p._id, publisherId: m._id }] });
                              else setValues({ ...values, moderations: values.moderations.filter((id) => id.moderatorId !== p._id && id.publisherId !== m._id) });
                            }}
                          />
                          <label className="line-clamp-2 truncate text-xs" htmlFor={`${j}-moderation`}>
                            {m.name} - {m.count > 1 ? `${m.count} missions` : `${m.count} mission`}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
      <div className="my-6 border-b border-gray-border" />
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Missions à afficher</h2>
        <div className="flex items-center">
          <span className="mr-3 text-xs text-black">Filtrer les missions</span>
          <Toggle checked={filter} setChecked={setFilter} />
        </div>
      </div>

      {filter && (
        <>
          <h3 className="text-lg text-black">Filtres avancés</h3>
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
            onSearch={handleSearch}
          />
        </>
      )}
      <div className="mt-5 flex justify-end gap-4">
        <Link to="/broadcast?tab=campaigns" className="button border border-black text-black hover:bg-gray-hover">
          Retour
        </Link>
        <button type="submit" className="button bg-blue-dark text-white hover:bg-blue-main" onClick={handleSubmit} disabled={!canSubmit()}>
          Enregistrer
        </button>
      </div>
    </div>
  );
};

const Frame = ({ widget, setWidget }) => {
  const [color, setColor] = useState(widget.color || "#000091");
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

  const handleStyeChange = async (e) => {
    const prev = widget.style;
    setWidget({ ...widget, style: e.target.value });
    try {
      const res = await api.put(`/widget/${widget._id}`, { style: e.target.value });
      if (!res.ok) throw res;
      setIFrameKey(iframeKey + 1);
    } catch (error) {
      captureError(error, "Erreur lors de la mise à jour du style du widget");
      setWidget({ ...widget, style: prev });
    }
  };

  const handleColorSubmit = async () => {
    try {
      const res = await api.put(`/widget/${widget._id}`, { color });
      if (!res.ok) throw res;
      setWidget({ ...widget, color });
      setIFrameKey(iframeKey + 1);
    } catch (error) {
      captureError(error, "Erreur lors de la mise à jour de la couleur du widget");
    }
  };

  return (
    <div className="bg-white p-12 space-y-12 shadow-lg">
      <h2 className="text-3xl font-bold">Personnalisez votre widget</h2>

      <div className="mt-4">
        <div className="flex items-center gap-10">
          <div className="space-y-2">
            <h3 className="text-lg text-black">Style de widget</h3>
            <div className="flex items-center gap-4">
              <RadioInput id="style-carousel" name="style" value="carousel" label="Carrousel" checked={widget.style === "carousel"} onChange={handleStyeChange} />
              <RadioInput id="style-page" name="style" value="page" label="Page de résultats" checked={widget.style === "page"} onChange={handleStyeChange} />
            </div>
            <p className="mt-4 text-xs text-gray-dark">
              {widget.style === "carousel"
                ? "Widget à hauteur fixe (pas de scroll) permettant de faire défiler les missions 3 par 3."
                : "Widget à hauteur fixe (pas de scroll) permettant d’afficher les missions par page de 6."}
            </p>
          </div>
          <div>
            <h3 className="text-lg text-black">Couleur du widget</h3>

            <div className="flex items-center gap-4">
              <div className="h-9 w-9 rounded" style={{ backgroundColor: color }} />

              <input className="input border-b-black" name="color" value={color} onChange={(e) => setColor(e.target.value)} />
              <button type="button" className="button bg-blue-dark text-white hover:bg-blue-main" onClick={handleColorSubmit}>
                Appliquer la couleur
              </button>
            </div>
            <p className="mt-4 text-xs text-gray-dark">
              Code hexadécimal de la couleur du widget. Exemple : <span className="font-mono">#000091</span>
            </p>
          </div>
        </div>
      </div>
      <div className="my-10 border-b border-gray-border" />
      <iframe
        key={iframeKey}
        border="0"
        width="100%"
        style={{ border: "none", margin: "0", padding: "0" }}
        loading="lazy"
        allowFullScreen
        allow="geolocation"
        onLoad={handleLoad}
        src={`${widget.type === "volontariat" ? VOLONTARIAT_URL : BENEVOLAT_URL}?widget=${widget._id}`}
      />
    </div>
  );
};

const IFRAMES = {
  benevolat: {
    carousel: `<iframe border="0" frameborder="0" style="display:block; width:100%;" loading="lazy" allowfullscreen allow="geolocation" src="${BENEVOLAT_URL}?widget={{widgetId}}" onload="this.style.height=this.offsetWidth < 768 ? '780px': '686px'"></iframe>`,
    page: `<iframe border="0" frameborder="0" style="display:block; width:100%;" loading="lazy" allowfullscreen allow="geolocation" src="${BENEVOLAT_URL}?widget={{widgetId}}" onload="this.style.height=this.offsetWidth < 640 ? '3424px': this.offsetWidth < 1024 ? '1862px': '1314px'"></iframe>`,
  },
  volontariat: {
    carousel: `<iframe border="0" frameborder="0" style="display:block; width:100%;" loading="lazy" allowfullscreen allow="geolocation" src="${VOLONTARIAT_URL}?widget={{widgetId}}" onload="this.style.height=this.offsetWidth < 768 ? '670px': '600px'"></iframe>`,
    page: `<iframe border="0" frameborder="0" style="display:block; width:100%;" loading="lazy" allowfullscreen allow="geolocation" src="${VOLONTARIAT_URL}?widget={{widgetId}}" onload="this.style.height=this.offsetWidth < 640 ? '2200px': this.offsetWidth < 1024 ? '1350px': '1050px'"></iframe>`,
  },
};

const JVA_LOGO = `<div style="padding:10px; display:flex;">
  <img src="https://apicivique.s3.eu-west-3.amazonaws.com/jvalogo.svg"/>
  <div style="color:#A5A5A5; font-style:normal; font-size:13px; padding:8px;">Proposé par la plateforme publique du bénévolat
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
      <h2 className="text-3xl font-bold">Code à intégrer</h2>
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

export default Edit;
