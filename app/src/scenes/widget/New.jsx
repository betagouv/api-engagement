import { useEffect, useState } from "react";
import { RiArrowLeftLine } from "react-icons/ri";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";
import Settings from "./components/Settings";

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
    fromPublisherId: publisher.id.toString(),
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
          toast.error("Un widget avec ce nom existe déjà");
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
      captureError(error, { extra: { values } });
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
      <title>API Engagement - Créer un widget</title>
      <StickyBar onEdit={handleSubmit} visible={stickyVisible} canSubmit={canSubmit} />
      <div className="flex">
        <Link to={`/broadcast/widgets`} className="text-blue-france flex items-center space-x-1">
          <RiArrowLeftLine />
          <span>Retour</span>
        </Link>
      </div>

      <div className="flex items-center justify-between align-baseline">
        <h1 className="text-4xl font-bold">Créer un widget</h1>
        <button type="submit" className="primary-btn" onClick={handleSubmit} ref={(node) => setSaveButton(node)} disabled={!canSubmit()}>
          Créer le widget
        </button>
      </div>

      <Settings values={values} onChange={setValues} />
    </div>
  );
};

const StickyBar = ({ onEdit, visible, canSubmit }) => {
  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 z-50 w-full items-center bg-white py-4 shadow-lg">
      <div className="m-auto flex w-[90%] items-center justify-between">
        <h1 className="text-2xl font-bold">Créer un widget</h1>
        <button type="button" className="primary-btn" onClick={onEdit} disabled={!canSubmit()}>
          Créer le widget
        </button>
      </div>
    </div>
  );
};

export default New;
