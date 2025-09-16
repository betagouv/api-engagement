import { useEffect, useState } from "react";

import ExportSvg from "../../../assets/svg/export-icon.svg?react";
import Modal from "../../../components/New-Modal";
import Table from "../../../components/NewTable";
import RadioInput from "../../../components/RadioInput";
import Toggle from "../../../components/Toggle";
import { MISSION_TYPES } from "../../../constants";
import api from "../../../services/api";
import { captureError } from "../../../services/error";

const Annonceur = ({ values, onChange, errors, setErrors }) => {
  const [data, setData] = useState([]);
  const { isAnnonceur } = values;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.post("/publisher/search", {
          diffuseursOf: values._id,
        });
        if (!res.ok) throw res;
        setData(res.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des diffuseurs");
      }
    };
    fetchData();
  }, [values._id]);

  return (
    <div className="space-y-6 border border-gray-900 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Annonceur</h3>
        <Toggle
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
          {errors.missionType && <p className="text-red-700">{errors.missionType}</p>}
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
          <Table header={[{ title: "Partenaires" }]} className="h-96">
            {data.slice(0, 5).map((item, index) => (
              <tr key={index} className={`${index % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-item`}>
                <td className="p-4">{item.name}</td>
              </tr>
            ))}
          </Table>
          <DiffuseurModal data={data} />
        </>
      )}
    </div>
  );
};

const DiffuseurModal = ({ data }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-blue-france border-blue-france flex items-center gap-2 border-b">
        <span>Tous les diffuseurs</span>
        <ExportSvg className="h-4 w-4" />
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)}>
        <div className="space-y-6 p-12">
          <h1 className="text-2xl font-bold">{data.length} diffuseurs</h1>

          <Table header={[{ title: "Partenaires" }]} className="h-96">
            {data.map((item, index) => (
              <tr key={index} className={`${index % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-item`}>
                <td className="p-4">{item.name}</td>
              </tr>
            ))}
          </Table>
        </div>
      </Modal>
    </>
  );
};

export default Annonceur;
