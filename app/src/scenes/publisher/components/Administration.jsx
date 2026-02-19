import { useEffect, useState } from "react";
import Toggle from "@/components/Toggle";
import api from "@/services/api";
import { captureError } from "@/services/error";

const Administration = ({ values, onChange }) => {
  const [excludedOrganizations, setExcludedOrganizations] = useState([]);

  useEffect(() => {
    if (!values.id) return;
    const fetchExcludedOrganizations = async () => {
      try {
        const res = await api.get(`/publisher/${values.id}/excluded-organizations`);
        if (!res.ok) throw res;
        setExcludedOrganizations(res.data);
      } catch (error) {
        captureError(error, { extra: { publisherId: values.id } });
      }
    };
    fetchExcludedOrganizations();
  }, [values.id]);

  return (
    <div className="flex items-center gap-6">
      <div className="flex flex-1 items-center gap-4">
        <label className="w-1/2 text-base" htmlFor="automated-report">
          Rapport automatisé
        </label>
        <div className="relative">
          <Toggle
            aria-label={values.sendReport ? "Désactiver le rapport automatisé" : "Activer le rapport automatisé"}
            value={values.sendReport}
            onChange={(e) => onChange({ ...values, sendReport: e })}
          />
          {values.sendReport ? <p className="text-blue-france absolute top-8 right-0 text-base">Oui</p> : <p className="absolute top-8 right-0 text-base text-gray-700">Non</p>}
        </div>
      </div>
      <div className="flex-1 space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-base" htmlFor="excludedOrganizations">
            Organisations exclues de la diffusion par JeVeuxAider.gouv.fr
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {excludedOrganizations.length === 0 && <p className="text-text-mention">Aucune organisation exclue</p>}
            {excludedOrganizations
              .filter((item) => item.excludedByAnnonceurName === "JeVeuxAider.gouv.fr")
              .map((item, index) => (
                <div key={index} className="relative rounded-md bg-gray-100 px-2 py-1 text-sm">
                  {item.organizationName} ({item.organizationClientId})
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Administration;
