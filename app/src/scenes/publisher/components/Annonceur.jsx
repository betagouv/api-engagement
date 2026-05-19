import { useEffect, useState } from "react";
import { RiInformationLine } from "react-icons/ri";

import ExportSvg from "@/assets/svg/export-icon.svg?react";
import Checkbox from "@/components/form/Checkbox";
import RadioInput from "@/components/form/RadioInput";
import Modal from "@/components/Modal";
import Table from "@/components/Table";
import Toggle from "@/components/Toggle";
import Tooltip from "@/components/Tooltip";
import { MISSION_TYPES } from "@/constants";
import api from "@/services/api";
import { captureError } from "@/services/error";
import { withLegacyPublishers } from "@/utils/publisher";

const Annonceur = ({ values, onChange, errors, setErrors }) => {
  const [data, setData] = useState([]);
  const { isAnnonceur } = values;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.post("/publisher/search", {
          diffuseursOf: values.id,
        });
        if (!res.ok) {
          throw res;
        }
        setData(withLegacyPublishers(res.data));
      } catch (error) {
        captureError(error, { extra: { publisherId: values.id } });
      }
    };
    fetchData();
  }, [values.id]);

  return (
    <div className="border-grey-border flex flex-1 flex-col gap-6 overflow-x-auto border p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Annonceur</h3>
        <Toggle
          aria-label={isAnnonceur ? "Désactiver le mode annonceur" : "Activer le mode annonceur"}
          value={isAnnonceur}
          onChange={(e) => {
            onChange({ ...values, isAnnonceur: e, missionType: null });
            setErrors({ ...errors, settings: null });
          }}
        />
      </div>
      {isAnnonceur && (
        <>
          <div className="h-px w-full bg-gray-900" />
          {errors.missionType && <p className="text-error">{errors.missionType}</p>}
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
                onChange={() => {
                  onChange({ ...values, missionType: type.slug });
                  setErrors({ ...errors, missionType: null });
                }}
              />
            ))}
          </div>
          <div className="h-px w-full bg-gray-900" />
          <p className="text-base">
            {data.length} diffuseurs diffusent les missions de {values.name}
          </p>
          <Table caption="Diffuseurs du partenaire" header={[{ title: "Partenaires" }]} className="h-96">
            {data.slice(0, 5).map((item, index) => (
              <tr key={index} className={`${index % 2 === 0 ? "bg-table-even" : "bg-table-odd"} table-row`}>
                <td className="p-4">{item.name}</td>
              </tr>
            ))}
          </Table>
          <DiffuseurModal data={data} />
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

const DiffuseurModal = ({ data }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-blue-france border-blue-france flex w-fit items-center gap-2 border-b">
        <span>Tous les diffuseurs</span>
        <ExportSvg className="h-4 w-4" aria-hidden="true" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Diffuseurs">
        <p className="text-lg font-semibold">{data.length} diffuseurs</p>

        <Table caption="Diffuseurs du partenaire" header={[{ title: "Partenaires" }]} className="h-96">
          {data.map((item, index) => (
            <tr key={index} className={`${index % 2 === 0 ? "bg-table-even" : "bg-table-odd"} table-row`}>
              <td className="p-4">{item.name}</td>
            </tr>
          ))}
        </Table>
      </Modal>
    </>
  );
};

export default Annonceur;
