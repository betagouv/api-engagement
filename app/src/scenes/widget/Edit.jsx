import { useEffect, useState } from "react";
import { RiArrowLeftLine, RiCodeSSlashFill } from "react-icons/ri";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import Toggle from "@/components/Toggle";
import api from "@/services/api";
import { BENEVOLAT_URL, VOLONTARIAT_URL } from "@/services/config";
import { captureError } from "@/services/error";
import Settings from "./components/Settings";

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
        captureError(error, { extra: { id } });
        navigate("/broadcast/widgets");
      }
    };
    fetchData();
  }, [id]);

  const handleSubmit = async () => {
    try {
      const res = await api.put(`/widget/${widget.id}`, values);
      if (!res.ok) throw res;
      setWidget(res.data);

      toast.success("Widget mis à jour");
    } catch (error) {
      captureError(error, { extra: { widget } });
    }
  };

  const handleActivate = async (value) => {
    try {
      const res = await api.put(`/widget/${widget.id.toString()}`, { active: value });
      if (!res.ok) throw res;
      setWidget(res.data);
    } catch (error) {
      captureError(error, { extra: { widget } });
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
      <title>API Engagement - Modifier un widget</title>
      <StickyBar onEdit={handleSubmit} visible={stickyVisible} widget={widget} handleActivate={handleActivate} canSubmit={canSubmit} />
      <div className="flex">
        <Link to={`/broadcast/widgets`} className="text-blue-france flex items-center space-x-1">
          <RiArrowLeftLine />
          <span>Retour</span>
        </Link>
      </div>

      <div className="flex items-center justify-between align-baseline">
        <div>
          <h1 className="text-4xl font-bold">Modifier un widget</h1>
          <span className="text-gray-425">Créé le {new Date(widget.createdAt).toLocaleDateString("fr")}</span>
        </div>
	        <div className="flex items-center gap-6">
	          <div className="flex flex-col items-end">
	            <Toggle aria-label={widget.active ? "Désactiver le widget" : "Activer le widget"} value={widget.active} onChange={(value) => handleActivate(value)} />
	            <label className="text-blue-france text-xs">{widget.active ? "Actif" : "Inactif"}</label>
	          </div>
	          <button type="submit" className="primary-btn" onClick={handleSubmit} ref={(node) => setSaveButton(node)} disabled={!canSubmit()}>
	            Enregistrer
	          </button>
        </div>
      </div>

      <Settings widget={widget} values={values} onChange={setValues} loading={loading} />
      <Frame widget={widget} setWidget={setWidget} />
      <Code widget={widget} />
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
    <div className="space-y-10 bg-white p-16 shadow-lg">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold">Aperçu du widget</h2>
        <span>Enregistrez le widget pour mettre à jour l'aperçu</span>
      </div>

      <div className="my-10 border-b border-gray-900 shadow-lg" />
      <iframe
        key={iframeKey}
        border="0"
        width="100%"
        style={{ border: "none", margin: "0", padding: "0" }}
        loading="lazy"
        allowFullScreen
        allow="geolocation"
        onLoad={handleLoad}
        src={`${widget.type === "volontariat" ? VOLONTARIAT_URL : BENEVOLAT_URL}?widget=${widget.id}&notrack=true`}
      />
    </div>
  );
};

const IFRAMES = {
  benevolat: {
    carousel: `<iframe id="engagement-widget" title="Widget Trouver une mission de bénévolat" border="0" frameborder="0" style="display:block; width:100%; transition: height 0.3s ease;" loading="lazy" allowfullscreen allow="geolocation" src="${BENEVOLAT_URL}?widget={{widgetId}}" onload="this.style.height=this.offsetWidth < 768 ? '780px': '686px'"></iframe>`,
    page: `<iframe id="engagement-widget" title="Widget Trouver une mission de bénévolat" border="0" frameborder="0" style="display:block; width:100%; transition: height 0.3s ease;" loading="lazy" allowfullscreen allow="geolocation" src="${BENEVOLAT_URL}?widget={{widgetId}}" onload="this.style.height=this.offsetWidth < 640 ? '3424px': this.offsetWidth < 1024 ? '1862px': '1314px'"></iframe>`,
  },
  volontariat: {
    carousel: `<iframe id="engagement-widget" title="Widget Trouver une mission de volontariat" border="0" frameborder="0" style="display:block; width:100%; transition: height 0.3s ease;" loading="lazy" allowfullscreen allow="geolocation" src="${VOLONTARIAT_URL}?widget={{widgetId}}" onload="this.style.height=this.offsetWidth < 768 ? '670px': '600px'"></iframe>`,
    page: `<iframe id="engagement-widget" title="Widget Trouver une mission de volontariat" border="0" frameborder="0" style="display:block; width:100%; transition: height 0.3s ease;" loading="lazy" allowfullscreen allow="geolocation" src="${VOLONTARIAT_URL}?widget={{widgetId}}" onload="this.style.height=this.offsetWidth < 640 ? '2200px': this.offsetWidth < 1024 ? '1350px': '1050px'"></iframe>`,
  },
};

const JVA_LOGO = `<div style="padding:10px; display:flex; justify-content:center; align-items:center;">
  <img src="https://apicivique.s3.eu-west-3.amazonaws.com/jvalogo.svg" alt="JeVeuxAider.gouv.fr"/>
  <div style="color:#666666; font-style:normal; font-size:13px; padding:8px;">Proposé par la plateforme publique du bénévolat
    <a href="https://www.jeveuxaider.gouv.fr/" target="_blank">JeVeuxAider.gouv.fr</a>
  </div>
</div><script>(function(){window.addEventListener('message',function(e){try{var d=e.data;if(d&&d.type==='resize'&&d.height&&d.source==='api-engagement-widget'){document.getElementById('engagement-widget').style.height=d.height+'px'}}catch(err){console.error(err)}})})();</script>`;

const Code = ({ widget }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(`${IFRAMES[widget.type][widget.style].replace("{{widgetId}}", widget.id)}${widget.type === "benevolat" ? `\n\n${JVA_LOGO}` : ""}`);
    toast.success("Lien copié");
  };

  return (
    <div className="space-y-12 bg-white p-12 shadow-lg">
      <h2 className="text-2xl font-bold">Code à intégrer</h2>
      <div className="flex items-center justify-between">
        <p>Vous n’avez plus qu’à intégrer ce code pour afficher le widget sur votre site</p>
        <button className="secondary-btn flex items-center" onClick={handleCopy}>
          <RiCodeSSlashFill className="mr-2" />
          Copier le code
        </button>
      </div>
      <div className="mt-6 w-full">
        <textarea
          className="w-full rounded-none border border-[#E3E3FD] bg-[#F5F5FE] px-4 py-2 text-base read-only:opacity-80"
          rows={widget.type === "benevolat" ? 11 : 4}
          readOnly
          value={`${IFRAMES[widget.type][widget.style].replace("{{widgetId}}", widget.id)}${widget.type === "benevolat" ? `\n\n${JVA_LOGO}` : ""}`}
        />
      </div>
    </div>
  );
};

const StickyBar = ({ onEdit, visible, widget, handleActivate, canSubmit }) => {
  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 z-50 w-full items-center bg-white py-4 shadow-lg">
      <div className="m-auto flex w-[90%] items-center justify-between">
        <h1 className="text-2xl font-bold">Modifier un widget</h1>
	        <div className="flex items-center gap-6">
	          <div className="flex flex-col items-end">
	            <Toggle aria-label={widget.active ? "Désactiver le widget" : "Activer le widget"} value={widget.active} onChange={(value) => handleActivate(value)} />
	            <label className="text-blue-france text-xs">{widget.active ? "Actif" : "Inactif"}</label>
	          </div>
	          <button type="button" className="primary-btn" onClick={onEdit} disabled={!canSubmit()}>
	            Enregistrer
	          </button>
        </div>
      </div>
    </div>
  );
};

export default Edit;
