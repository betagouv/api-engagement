import { RiInformationLine } from "react-icons/ri";

import Checkbox from "@/components/form/Checkbox";
import RadioInput from "@/components/form/RadioInput";
import Toggle from "@/components/Toggle";
import Tooltip from "@/components/Tooltip";
import { MISSION_TYPES } from "@/constants";

const AnnonceurCreation = ({ values, onChange }) => {
  const { isAnnonceur } = values;
  return (
    <div className="border-grey-border space-y-6 border p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Annonceur</h3>
        <Toggle
          aria-label={isAnnonceur ? "Désactiver le mode annonceur" : "Activer le mode annonceur"}
          value={isAnnonceur}
          onChange={(e) => onChange({ ...values, isAnnonceur: e, missionType: null, selfHostedScript: false })}
        />
      </div>
      {isAnnonceur && (
        <>
          <div className="h-px w-full bg-gray-900" />
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
          <div className="h-px w-full bg-gray-900" />
          <div className="flex items-center gap-2">
            <Checkbox
              id="self-hosted-script"
              label="Script de tracking auto-hébergé"
              value={values.selfHostedScript}
              onChange={(e) => onChange({ ...values, selfHostedScript: e.target.checked })}
            />
            <Tooltip
              id="tooltip-self-hosted-script"
              ariaLabel="En savoir plus sur l'auto-hébergement du script"
              content="Par défaut ce paramètre doit rester décoché. Le partenaire n'auto-héberge pas le script. Se rapprocher de l'équipe technique pour en savoir plus."
            >
              <RiInformationLine className="h-4 w-4 text-gray-500" aria-hidden="true" />
            </Tooltip>
          </div>
        </>
      )}
    </div>
  );
};

export default AnnonceurCreation;
