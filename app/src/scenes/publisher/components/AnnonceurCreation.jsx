import RadioInput from "../../../components/RadioInput";
import Toggle from "../../../components/Toggle";

const AnnonceurCreation = ({ values, onChange }) => {
  return (
    <div className="border border-gray-border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Annonceur</h3>
        <Toggle value={values.isAnnonceur} onChange={(e) => onChange({ ...values, isAnnonceur: e, missionType: null })} />
      </div>
      {values.isAnnonceur && (
        <>
          <div className="w-full h-px bg-gray-border" />
          <div className="space-y-4">
            <RadioInput
              id="mission-type-benevolat"
              name="mission-type"
              value="benevolat"
              label="Bénévolat"
              size={24}
              checked={values.missionType === "benevolat"}
              onChange={() => onChange({ ...values, missionType: "benevolat" })}
            />

            <RadioInput
              id="mission-type-volontariat"
              name="mission-type"
              value="volontariat"
              label="Volontariat"
              size={24}
              checked={values.missionType === "volontariat"}
              onChange={() => onChange({ ...values, missionType: "volontariat" })}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default AnnonceurCreation;
