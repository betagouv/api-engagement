import Modal from "@/components/Modal";
import { useState } from "react";
import { RiSettings3Fill } from "react-icons/ri";

const SettingsModal = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="text-blue-france flex cursor-pointer items-center" onClick={() => setOpen(true)}>
        <RiSettings3Fill className="mr-2" aria-hidden="true" />
        <span>Paramétrage</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} className="min-w-5xl" title="Paramétrages de la modération automatique">
        <div className="border-grey-border mb-10 flex flex-col border p-4">
          <div className="flex items-start gap-3">
            <div className="w-[20%] text-lg">Conditions</div>
            <div className="flex w-[20%] flex-col gap-2">
              <select className="select" disabled defaultValue="" aria-label="createdAt">
                <option value="">createdAt</option>
              </select>
              <select className="select" disabled defaultValue="" aria-label="modération">
                <option value="">modération</option>
              </select>
            </div>
            <div className="flex w-[20%] flex-col gap-2">
              <select className="select" disabled defaultValue="" aria-label="supérieure à">
                <option value="">supérieure à</option>
              </select>
              <select className="select" disabled defaultValue="" aria-label="égale à">
                <option value="">égale à</option>
              </select>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <input className="input" type="text" aria-label="Valeur" defaultValue="6 mois" readOnly />
              <input className="input" type="text" aria-label="Valeur" defaultValue="À modérer" readOnly />
            </div>
          </div>
          <div className="border-grey-border my-4 border-t" />
          <div className="flex items-start gap-3">
            <div className="w-[20%] text-lg">Action</div>
            <div className="flex w-[20%] flex-col gap-2">
              <select className="select" disabled defaultValue="" aria-label="modération">
                <option value="">modération</option>
              </select>
              <select className="select" disabled defaultValue="" aria-label="motif">
                <option value="">motif</option>
              </select>
            </div>
            <div className="flex w-[20%] flex-col gap-2">
              <select className="select" disabled defaultValue="" aria-label="égale à">
                <option value="">égale à</option>
              </select>
              <select className="select" disabled defaultValue="" aria-label="égale à">
                <option value="">égale à</option>
              </select>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <input className="input" type="text" aria-label="Valeur" defaultValue="Refusée" readOnly />
              <input className="input" type="text" aria-label="Valeur" defaultValue="La mission est refusée car la date de création est trop ancienne (> 6 mois)" readOnly />
            </div>
          </div>
        </div>
        <div className="border-grey-border flex flex-col border p-4">
          <div className="flex items-start gap-3">
            <div className="w-[20%] text-lg">Conditions</div>
            <div className="flex w-[20%] flex-col gap-2">
              <select className="select" disabled defaultValue="" aria-label="startAt">
                <option value="">startAt</option>
              </select>
              <select className="select" disabled defaultValue="" aria-label="endAt">
                <option value="">endAt</option>
              </select>
              <select className="select" disabled defaultValue="" aria-label="modération">
                <option value="">modération</option>
              </select>
            </div>
            <div className="flex w-[20%] flex-col gap-2">
              <select className="select" disabled defaultValue="" aria-label="inférieur à">
                <option value="">inférieur à</option>
              </select>
              <select className="select" disabled defaultValue="" aria-label="inférieur à">
                <option value="">inférieur à</option>
              </select>
              <select className="select" disabled defaultValue="" aria-label="égale à">
                <option value="">égale à</option>
              </select>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <input className="input" type="text" aria-label="Valeur" defaultValue="7 jours" readOnly />
              <input className="input" type="text" aria-label="Valeur" defaultValue="21 jours" readOnly />
              <input className="input" type="text" aria-label="Valeur" defaultValue="À modérer" readOnly />
            </div>
          </div>
          <div className="border-grey-border my-4 border-t" />
          <div className="flex items-start gap-3">
            <div className="w-[20%] text-lg">Action</div>
            <div className="flex w-[20%] flex-col gap-2">
              <select className="select" disabled defaultValue="" aria-label="modération">
                <option value="">modération</option>
              </select>
              <select className="select" disabled defaultValue="" aria-label="motif">
                <option value="">motif</option>
              </select>
            </div>
            <div className="flex w-[20%] flex-col gap-2">
              <select className="select" disabled defaultValue="" aria-label="égale à">
                <option value="">égale à</option>
              </select>
              <select className="select" disabled defaultValue="" aria-label="égale à">
                <option value="">égale à</option>
              </select>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <input className="input" type="text" aria-label="Valeur" defaultValue="Refusée" readOnly />
              <input className="input" type="text" aria-label="Valeur" defaultValue="La date de la mission n’est pas compatible avec le recrutement de bénévoles" readOnly />
            </div>
          </div>
        </div>
        <div className="border-grey-border flex flex-col border p-4">
          <div className="flex items-start gap-3">
            <div className="w-[20%] text-lg">Conditions</div>
            <div className="flex w-[20%] flex-col gap-2">
              <select className="select" disabled defaultValue="" aria-label="description">
                <option value="">description</option>
              </select>
              <select className="select" disabled defaultValue="" aria-label="modération">
                <option value="">modération</option>
              </select>
            </div>
            <div className="flex w-[20%] flex-col gap-2">
              <select className="select" disabled defaultValue="" aria-label="inférieur à">
                <option value="">inférieur à</option>
              </select>
              <select className="select" disabled defaultValue="" aria-label="égale à">
                <option value="">égale à</option>
              </select>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <input className="input" type="text" aria-label="Valeur" defaultValue="300 caractères" readOnly />
              <input className="input" type="text" aria-label="Valeur" defaultValue="À modérer" readOnly />
            </div>
          </div>
          <div className="border-grey-border my-4 border-t" />
          <div className="flex items-start gap-3">
            <div className="w-[20%] text-lg">Action</div>
            <div className="flex w-[20%] flex-col gap-2">
              <select className="select" disabled defaultValue="" aria-label="modération">
                <option value="">modération</option>
              </select>
              <select className="select" disabled defaultValue="" aria-label="motif">
                <option value="">motif</option>
              </select>
            </div>
            <div className="flex w-[20%] flex-col gap-2">
              <select className="select" disabled defaultValue="" aria-label="égale à">
                <option value="">égale à</option>
              </select>
              <select className="select" disabled defaultValue="" aria-label="égale à">
                <option value="">égale à</option>
              </select>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <input className="input" type="text" aria-label="Valeur" defaultValue="Refusée" readOnly />
              <input className="input" type="text" aria-label="Valeur" defaultValue="Le contenu est insuffisant / non qualitatif" readOnly />
            </div>
          </div>
        </div>
        <div className="border-grey-border flex flex-col border p-4">
          <div className="flex items-start gap-3">
            <div className="w-[20%] text-lg">Conditions</div>
            <div className="flex w-[20%] flex-col gap-2">
              <select className="select" disabled defaultValue="" aria-label="city">
                <option value="">city</option>
              </select>
              <select className="select" disabled defaultValue="" aria-label="modération">
                <option value="">modération</option>
              </select>
            </div>
            <div className="flex w-[20%] flex-col gap-2">
              <select className="select" disabled defaultValue="" aria-label="n'hexiste pas">
                <option value="">n'hexiste pas</option>
              </select>
              <select className="select" disabled defaultValue="" aria-label="égale à">
                <option value="">égale à</option>
              </select>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-9" />
              <input className="input" type="text" aria-label="Valeur" defaultValue="À modérer" readOnly />
            </div>
          </div>
          <div className="border-grey-border my-4 border-t" />
          <div className="flex items-start gap-3">
            <div className="w-[20%] text-lg">Action</div>
            <div className="flex w-[20%] flex-col gap-2">
              <select className="select" disabled defaultValue="" aria-label="modération">
                <option value="">modération</option>
              </select>
              <select className="select" disabled defaultValue="" aria-label="motif">
                <option value="">motif</option>
              </select>
            </div>
            <div className="flex w-[20%] flex-col gap-2">
              <select className="select" disabled defaultValue="" aria-label="égale à">
                <option value="">égale à</option>
              </select>
              <select className="select" disabled defaultValue="" aria-label="égale à">
                <option value="">égale à</option>
              </select>
            </div>

            <div className="flex flex-1 flex-col gap-2">
              <input className="input" type="text" aria-label="Valeur" defaultValue="Refusée" readOnly />
              <input className="input" type="text" aria-label="Valeur" defaultValue="Le contenu est insuffisant / non qualitatif" readOnly />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SettingsModal;
