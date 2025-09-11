import { useEffect, useState } from "react";
import Toggle from "../../../components/Toggle";
import api from "../../../services/api";
import { captureError } from "../../../services/error";

const Administration = ({ values, onChange }) => {
  const [excludedOrganizations, setExcludedOrganizations] = useState([]);

  useEffect(() => {
    if (!values._id) return;
    const fetchExcludedOrganizations = async () => {
      try {
        const res = await api.get(`/publisher/${values._id}/excluded-organizations`);
        if (!res.ok) throw res;
        setExcludedOrganizations(res.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des organisations exclues");
      }
    };
    fetchExcludedOrganizations();
  }, [values._id]);

  return (
    <div className="flex items-center gap-6">
      <div className="flex-1 flex items-center gap-4">
        <label className="w-1/2 text-base" htmlFor="automated-report">
          Rapport automatisé
        </label>
        <div className="relative">
          <Toggle value={values.sendReport} onChange={(e) => onChange({ ...values, sendReport: e })} />
          {values.sendReport ? <p className="text-base text-blue-france absolute top-8 right-0">Oui</p> : <p className="text-base text-gray-700 absolute top-8 right-0">Non</p>}
        </div>
      </div>
      <div className="flex-1 space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-base" htmlFor="excludedOrganizations">
            Organisations exclues de la diffusion par JeVeuxAider.gouv.fr
          </label>

          <div className="flex items-center gap-2 flex-wrap">
            {excludedOrganizations.length === 0 && <p className="text-gray-500">Aucune organisation exclue</p>}
            {excludedOrganizations
              .filter((item) => item.excludedByPublisherName === "JeVeuxAider.gouv.fr")
              .map((item, index) => (
                <div key={index} className="bg-gray-100 px-2 py-1 rounded-md text-sm relative">
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
