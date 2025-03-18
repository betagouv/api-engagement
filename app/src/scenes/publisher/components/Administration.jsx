import Toggle from "../../../components/Toggle";

const Administration = ({ values, onChange }) => {
  return (
    <div className="flex items-center justify-between gap-6">
      <label className="w-1/2 text-base" htmlFor="automated-report">
        Rapport automatisé
      </label>
      <div className="relative">
        <Toggle value={values.automated_report} onChange={(e) => onChange({ ...values, automated_report: e })} />
        {values.automated_report ? <p className="text-base text-blue-dark absolute top-8 right-0">Oui</p> : <p className="text-base text-gray-700 absolute top-8 right-0">Non</p>}
      </div>
    </div>
  );
};

export default Administration;
