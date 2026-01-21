import { BiSolidInfoSquare } from "react-icons/bi";
import { RiErrorWarningFill } from "react-icons/ri";

import { useEffect, useState } from "react";
import SearchSelect from "../../../components/SearchSelect";
import api from "../../../services/api";
import { captureError } from "../../../services/error";
import { slugify } from "../../../services/utils";
import { withLegacyPublishers } from "../../../utils/publisher";

const buildDefaultUtm = (name) => [
  { key: "utm_source", value: "api_engagement" },
  { key: "utm_medium", value: "campaign" },
  { key: "utm_campaign", value: slugify(name) },
];

const Information = ({ values, onChange, errors, onErrorChange }) => {
  const [publishers, setPulishers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.post("/publisher/search", { role: "annonceur" });
        if (!res.ok) throw res;
        setPulishers(
          withLegacyPublishers(res.data)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((p) => ({ ...p, label: p.name })),
        );
      } catch (error) {
        captureError(error);
      }
    };
    fetchData();
  }, []);

  const handleChange = (key, value) => {
    if (key === "url") {
      const url = value;
      let trackers = url.includes("?")
        ? url
            .split("?")[1]
            .split("&")
            .map((t) => {
              const idx = t.indexOf("=");
              return idx === -1 ? { key: t, value: "" } : { key: t.slice(0, idx), value: t.slice(idx + 1) };
            })
        : [];
      if (trackers.length === 0) {
        trackers = buildDefaultUtm(values.name);
      }
      onChange((prev) => ({ ...prev, url, trackers }));
      onErrorChange((prev) => ({ ...prev, url: "" }));
    } else {
      onChange((prev) => ({ ...prev, [key]: value }));
      onErrorChange((prev) => ({ ...prev, [key]: "" }));
    }
  };

  return (
    <>
      <div className="flex gap-8">
        <div className="flex flex-1 flex-col gap-2">
          <label className="text-sm" htmlFor="name">
            Nom de la campagne<span className="text-error ml-1">*</span>
          </label>
          <input
            id="name"
            className={`input mb-2 ${errors.name ? "border-b-error" : "border-b-black"}`}
            name="name"
            value={values.name || ""}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Exemple: Communication événement janvier 2024"
          />
          {errors.name && (
            <div className="text-error flex items-center text-sm">
              <RiErrorWarningFill className="mr-2" />
              {errors.name}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <label className="text-sm" htmlFor="urlSource">
            Où le lien est intégré
          </label>
          <input
            id="urlSource"
            className="input"
            name="urlSource"
            value={values.urlSource || ""}
            onChange={(e) => handleChange("urlSource", e.target.value)}
            placeholder="URL de la page, nom de l’email, de la plaquette, etc."
          />
        </div>
      </div>
      <div className="flex gap-8">
        <div className="flex flex-1 flex-col gap-2">
          <label className="text-sm" htmlFor="type">
            Type de campagne<span className="text-error ml-1">*</span>
          </label>
          <select
            id="type"
            className={`input ${errors.type ? "border-b-error" : "border-b-black"} ${!values.type ? "text-text-mention" : ""}`}
            value={values.type || ""}
            onChange={(e) => handleChange("type", e.target.value)}
          >
            <option value="" disabled>
              Sélectionner un type
            </option>
            <option value="AD_BANNER">Bannière/publicité</option>
            <option value="MAILING">Mailing</option>
            <option value="TILE_BUTTON">Tuile/Bouton</option>
            <option value="OTHER">Autre</option>
          </select>
          {errors.type && (
            <div className="text-error flex items-center text-sm">
              <RiErrorWarningFill className="mr-2" />
              {errors.type}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <label className="text-sm" htmlFor="to-publisher-id">
            Diffuse les missions de<span className="text-error ml-1">*</span>
          </label>
          <SearchSelect
            id="to-publisher-id"
            options={publishers.map((e) => ({ value: e.id, label: e.name }))}
            placeholder="Sélectionner un annonceur"
            value={values.toPublisherId || ""}
            onChange={(e) => handleChange("toPublisherId", e.value)}
          />
          {errors.toPublisherId && (
            <div className="text-error flex items-center text-sm">
              <RiErrorWarningFill className="mr-2" />
              {errors.toPublisherId}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm" htmlFor="url">
          URL de destination de la campagne<span className="text-error ml-1">*</span>
        </label>
        <input
          id="url"
          className={`input mb-2 ${errors.url ? "border-b-error" : "border-b-black"}`}
          name="url"
          value={values.url || ""}
          onChange={(e) => handleChange("url", e.target.value)}
          placeholder="Exemple : https://votresiteweb.com/lien-de-candidature"
        />
        {errors.url && (
          <div className="text-error flex items-center text-sm">
            <RiErrorWarningFill className="mr-2" />
            {errors.url}
          </div>
        )}
        <span className="text-info mt-2 flex items-center text-xs">
          <BiSolidInfoSquare className="mr-2 text-sm" />
          <p>Lien de la page à laquelle les utilisateurs accèderont</p>
        </span>
      </div>
    </>
  );
};

export default Information;
