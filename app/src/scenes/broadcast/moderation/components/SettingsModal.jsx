import Modal from "@/components/Modal";
import { useState } from "react";
import { RiSettings3Fill } from "react-icons/ri";

const RULES = [
  {
    conditions: [
      { field: "createdAt", operator: "supérieure à", value: "6 mois" },
      { field: "modération", operator: "égale à", value: "À modérer" },
    ],
    action: [
      { field: "modération", operator: "égale à", value: "Refusée" },
      { field: "motif", operator: "égale à", value: "La mission est refusée car la date de création est trop ancienne (> 6 mois)" },
    ],
  },
  {
    conditions: [
      { field: "startAt", operator: "inférieur à", value: "7 jours" },
      { field: "endAt", operator: "inférieur à", value: "21 jours" },
      { field: "modération", operator: "égale à", value: "À modérer" },
    ],
    action: [
      { field: "modération", operator: "égale à", value: "Refusée" },
      { field: "motif", operator: "égale à", value: "La date de la mission n’est pas compatible avec le recrutement de bénévoles" },
    ],
  },
  {
    conditions: [
      { field: "description", operator: "inférieur à", value: "300 caractères" },
      { field: "modération", operator: "égale à", value: "À modérer" },
    ],
    action: [
      { field: "modération", operator: "égale à", value: "Refusée" },
      { field: "motif", operator: "égale à", value: "Le contenu est insuffisant / non qualitatif" },
    ],
  },
  {
    conditions: [
      { field: "city", operator: "n'hexiste pas", value: null },
      { field: "modération", operator: "égale à", value: "À modérer" },
    ],
    action: [
      { field: "modération", operator: "égale à", value: "Refusée" },
      { field: "motif", operator: "égale à", value: "Le contenu est insuffisant / non qualitatif" },
    ],
  },
];

const RuleGroup = ({ title, titleId, rows }) => (
  <div role="group" aria-labelledby={titleId} className="flex items-start gap-3">
    <div id={titleId} className="w-[20%] text-lg">
      {title}
    </div>
    <div className="flex w-[20%] flex-col gap-2">
      {rows.map((row, i) => (
        <select key={i} className="select" disabled defaultValue="" aria-label={row.field}>
          <option value="">{row.field}</option>
        </select>
      ))}
    </div>
    <div className="flex w-[20%] flex-col gap-2">
      {rows.map((row, i) => (
        <select key={i} className="select" disabled defaultValue="" aria-label={row.operator}>
          <option value="">{row.operator}</option>
        </select>
      ))}
    </div>
    <div className="flex flex-1 flex-col gap-2">
      {rows.map((row, i) =>
        row.value === null ? <div key={i} className="h-9" /> : <input key={i} className="input" type="text" aria-label="Valeur" defaultValue={row.value} readOnly />,
      )}
    </div>
  </div>
);

const SettingsModal = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="text-blue-france flex cursor-pointer items-center" onClick={() => setOpen(true)}>
        <RiSettings3Fill className="mr-2" aria-hidden="true" />
        <span>Paramétrage</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} className="w-[90vw] max-w-5xl" title="Paramétrages de la modération automatique">
        {RULES.map((rule, i) => (
          <div key={i} className="border-grey-border mb-10 flex flex-col border p-4 last:mb-0">
            <RuleGroup title="Conditions" titleId={`rule-${i}-conditions`} rows={rule.conditions} />
            <div className="border-grey-border my-4 border-t" />
            <RuleGroup title="Action" titleId={`rule-${i}-action`} rows={rule.action} />
          </div>
        ))}
      </Modal>
    </>
  );
};

export default SettingsModal;
