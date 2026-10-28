import { useEffect, useState } from "react";
import { RiErrorWarningFill } from "react-icons/ri";

import Table from "@/components/Table";
import Toggle from "@/components/Toggle";
import { PUBLISHER_CATEGORIES } from "@/constants";
import AnnonceursModal from "@/scenes/publisher/components/AnnonceursModal";
import api from "@/services/api";
import { captureError } from "@/services/error";
import { withLegacyPublishers } from "@/utils/publisher";

const DiffuseurCreation = ({ values, onChange, errors }) => {
  const [publishers, setPublishers] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.post("/publisher/search", {
          role: "annonceur",
        });
        if (!res.ok) throw res;

        setPublishers(withLegacyPublishers(res.data));
      } catch (error) {
        captureError(error, { message: "Erreur lors du chargement des annonceurs", extra: { publisherId: values.id } });
      }
    };
    fetchData();
  }, []);

  const selectedAnnonceurs = publishers.filter((item) => values.publishers.some((publisher) => publisher.publisherId === item.id));

  return (
    <div className="border-grey-border space-y-6 border p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Diffuseur</h3>
        <Toggle
          aria-label={values.isDiffuseur ? "Désactiver le mode diffuseur" : "Activer le mode diffuseur"}
          value={values.isDiffuseur}
          onChange={(e) => onChange({ ...values, isDiffuseur: e, hasApiRights: false, hasWidgetRights: false, hasCampaignRights: false })}
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
          <fieldset className={`space-y-4 ${errors.mode ? "before:bg-error relative before:absolute before:inset-y-0 before:-left-3 before:w-0.5" : ""}`}>
            <legend className={`text-base ${errors.mode ? "text-error" : ""}`}>
              Moyens de diffusion
              <span className="text-error ml-1" aria-hidden="true">
                *
              </span>
            </legend>
            <p id="mode-hint" className="text-text-mention text-sm">
              Sélectionner au moins un moyen de diffusion.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="checkbox"
                id="api"
                aria-describedby={errors.mode ? "mode-hint mode-error" : "mode-hint"}
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
                aria-describedby={errors.mode ? "mode-hint mode-error" : "mode-hint"}
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
                aria-describedby={errors.mode ? "mode-hint mode-error" : "mode-hint"}
                name="campagne"
                onChange={(e) => onChange({ ...values, hasCampaignRights: e.target.checked })}
                checked={values.hasCampaignRights}
              />
              <label htmlFor="campagne">Campagnes</label>
            </div>
            {errors.mode && (
              <p id="mode-error" className="text-error flex items-center text-sm" aria-live="polite">
                <RiErrorWarningFill className="mr-2" aria-hidden="true" />
                {errors.mode}
              </p>
            )}
          </fieldset>
          <div className="h-px w-full bg-gray-900" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-base">
              {values.name} diffuse les missions de {values.publishers.length} annonceurs
            </p>
            <button type="button" className="secondary-btn" onClick={() => setOpen(true)}>
              Ajouter des partenaires
            </button>
          </div>
          {selectedAnnonceurs.length > 0 && (
            <Table caption="Annonceurs diffusés" header={[{ title: "Annonceurs" }]} className="max-h-96">
              {selectedAnnonceurs.map((item, index) => (
                <tr key={item.id} className={`${index % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-row`}>
                  <td className="p-4">{item.name}</td>
                </tr>
              ))}
            </Table>
          )}
          {open && (
            <AnnonceursModal
              annonceurs={publishers.filter((item) => item.id !== values.id)}
              selected={values.publishers}
              onClose={() => setOpen(false)}
              onSubmit={(selected) => {
                onChange({ ...values, publishers: selected });
                setOpen(false);
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default DiffuseurCreation;
