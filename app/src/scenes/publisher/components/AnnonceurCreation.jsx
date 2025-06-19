import RadioInput from "../../../components/RadioInput";
import Toggle from "../../../components/Toggle";
import { MISSION_TYPES } from "../../../constants";

const AnnonceurCreation = ({ values, onChange }) => {
  const { isAnnonceur } = values;
  return (
    <div className="border border-gray-border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Annonceur</h3>
        <Toggle value={isAnnonceur} onChange={(e) => onChange({ ...values, isAnnonceur: e, missionType: null })} />
      </div>
      {isAnnonceur && (
        <>
          <div className="w-full h-px bg-gray-border" />
          <div className="space-y-4">
            {Object.values(MISSION_TYPES).map((type) => (
              <RadioInput
                key={type.slug}
                id={`mission-type-${type.slug}`}
                name="mission-type"
                value={type.slug}
                label={type.label}
                size={24}
                checked={values.missionType === type.slug}
                onChange={() => onChange({ ...values, missionType: type.slug })}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AnnonceurCreation;
