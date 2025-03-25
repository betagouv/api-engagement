import Toggle from "../../../components/Toggle";

const Administration = ({ values, onChange }) => {
  return (
    <div className="flex items-center gap-6">
      <div className="flex-1 flex items-center gap-4">
        <label className="w-1/2 text-base" htmlFor="automated-report">
          Rapport automatisé
        </label>
        <div className="relative">
          <Toggle value={values.automated_report} onChange={(e) => onChange({ ...values, automated_report: e })} />
          {values.automated_report ? <p className="text-base text-blue-dark absolute top-8 right-0">Oui</p> : <p className="text-base text-gray-700 absolute top-8 right-0">Non</p>}
        </div>
      </div>
      <div className="flex-1 space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-base" htmlFor="excludedOrganizations">
            Organisations exclues de la diffusion par JeVeuxAider.gouv.fr
          </label>

          <div className="flex items-center gap-2 flex-wrap">
            {values.excludedOrganizations.length === 0 && <p className="text-gray-500">Aucune organisation exclue</p>}
            {values.excludedOrganizations
              .filter((item) => item.publisherName === "JeVeuxAider.gouv.fr")
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
