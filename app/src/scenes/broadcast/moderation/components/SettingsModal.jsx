import { useState } from "react";
import { RiSettings3Fill } from "react-icons/ri";
import Modal from "../../../../components/New-Modal";

const SettingsModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button className="flex items-center text-blue-dark" onClick={() => setIsOpen(true)}>
        <RiSettings3Fill className="mr-2" />
        <span>Paramétrage</span>
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} innerClassName="h-[90%] w-[75%]">
        <div className="bg-white p-16 h-full">
          <div className="mb-10 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Paramétrages de la modération automatique</h1>
          </div>
          <div className="mb-10 flex flex-col border border-gray-border p-4">
            <div className="flex items-start gap-3">
              <div className="w-[20%]">
                <h2 className="text-lg">Conditions</h2>
              </div>
              <div className="flex w-[20%] flex-col gap-2">
                <select className="select" disabled defaultValue="">
                  <option value="">createdAt</option>
                </select>
                <select className="select" disabled defaultValue="">
                  <option value="">modération</option>
                </select>
              </div>
              <div className="flex w-[20%] flex-col gap-2">
                <select className="select" disabled defaultValue="">
                  <option value="">supérieure à</option>
                </select>
                <select className="select" disabled defaultValue="">
                  <option value="">égale à</option>
                </select>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <input className="input" type="text" defaultValue="6 mois" disabled />
                <input className="input" type="text" defaultValue="À modérer" disabled />
              </div>
            </div>
            <div className="my-4 border-t border-gray-border" />
            <div className="flex items-start gap-3">
              <div className="w-[20%]">
                <h2 className="text-lg">Action</h2>
              </div>
              <div className="flex w-[20%] flex-col gap-2">
                <select className="select" disabled defaultValue="">
                  <option value="">modération</option>
                </select>
                <select className="select" disabled defaultValue="">
                  <option value="">motif</option>
                </select>
              </div>
              <div className="flex w-[20%] flex-col gap-2">
                <select className="select" disabled defaultValue="">
                  <option value="">égale à</option>
                </select>
                <select className="select" disabled defaultValue="">
                  <option value="">égale à</option>
                </select>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <input className="input" type="text" defaultValue="Refusée" disabled />
                <input className="input" type="text" defaultValue="La mission est refusée car la date de création est trop ancienne (> 6 mois)" disabled />
              </div>
            </div>
          </div>
          <div className="flex flex-col border border-gray-border p-4">
            <div className="flex items-start gap-3">
              <div className="w-[20%]">
                <h2 className="text-lg">Conditions</h2>
              </div>
              <div className="flex w-[20%] flex-col gap-2">
                <select className="select" disabled defaultValue="">
                  <option value="">startAt</option>
                </select>
                <select className="select" disabled defaultValue="">
                  <option value="">endAt</option>
                </select>
                <select className="select" disabled defaultValue="">
                  <option value="">modération</option>
                </select>
              </div>
              <div className="flex w-[20%] flex-col gap-2">
                <select className="select" disabled defaultValue="">
                  <option value="">inférieur à</option>
                </select>
                <select className="select" disabled defaultValue="">
                  <option value="">inférieur à</option>
                </select>
                <select className="select" disabled defaultValue="">
                  <option value="">égale à</option>
                </select>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <input className="input" type="text" defaultValue="7 jours" disabled />
                <input className="input" type="text" defaultValue="21 jours" disabled />
                <input className="input" type="text" defaultValue="À modérer" disabled />
              </div>
            </div>
            <div className="my-4 border-t border-gray-border" />
            <div className="flex items-start gap-3">
              <div className="w-[20%]">
                <h2 className="text-lg">Action</h2>
              </div>
              <div className="flex w-[20%] flex-col gap-2">
                <select className="select" disabled defaultValue="">
                  <option value="">modération</option>
                </select>
                <select className="select" disabled defaultValue="">
                  <option value="">motif</option>
                </select>
              </div>
              <div className="flex w-[20%] flex-col gap-2">
                <select className="select" disabled defaultValue="">
                  <option value="">égale à</option>
                </select>
                <select className="select" disabled defaultValue="">
                  <option value="">égale à</option>
                </select>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <input className="input" type="text" defaultValue="Refusée" disabled />
                <input className="input" type="text" defaultValue="La date de la mission n’est pas compatible avec le recrutement de bénévoles" disabled />
              </div>
            </div>
          </div>
          <div className="flex flex-col border border-gray-border p-4">
            <div className="flex items-start gap-3">
              <div className="w-[20%]">
                <h2 className="text-lg">Conditions</h2>
              </div>
              <div className="flex w-[20%] flex-col gap-2">
                <select className="select" disabled defaultValue="">
                  <option value="">description</option>
                </select>
                <select className="select" disabled defaultValue="">
                  <option value="">modération</option>
                </select>
              </div>
              <div className="flex w-[20%] flex-col gap-2">
                <select className="select" disabled defaultValue="">
                  <option value="">inférieur à</option>
                </select>
                <select className="select" disabled defaultValue="">
                  <option value="">égale à</option>
                </select>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <input className="input" type="text" defaultValue="300 caractères" disabled />
                <input className="input" type="text" defaultValue="À modérer" disabled />
              </div>
            </div>
            <div className="my-4 border-t border-gray-border" />
            <div className="flex items-start gap-3">
              <div className="w-[20%]">
                <h2 className="text-lg">Action</h2>
              </div>
              <div className="flex w-[20%] flex-col gap-2">
                <select className="select" disabled defaultValue="">
                  <option value="">modération</option>
                </select>
                <select className="select" disabled defaultValue="">
                  <option value="">motif</option>
                </select>
              </div>
              <div className="flex w-[20%] flex-col gap-2">
                <select className="select" disabled defaultValue="">
                  <option value="">égale à</option>
                </select>
                <select className="select" disabled defaultValue="">
                  <option value="">égale à</option>
                </select>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <input className="input" type="text" defaultValue="Refusée" disabled />
                <input className="input" type="text" defaultValue="Le contenu est insuffisant / non qualitatif" disabled />
              </div>
            </div>
          </div>
          <div className="flex flex-col border border-gray-border p-4">
            <div className="flex items-start gap-3">
              <div className="w-[20%]">
                <h2 className="text-lg">Conditions</h2>
              </div>
              <div className="flex w-[20%] flex-col gap-2">
                <select className="select" disabled defaultValue="">
                  <option value="">city</option>
                </select>
                <select className="select" disabled defaultValue="">
                  <option value="">modération</option>
                </select>
              </div>
              <div className="flex w-[20%] flex-col gap-2">
                <select className="select" disabled defaultValue="">
                  <option value="">n'hexiste pas</option>
                </select>
                <select className="select" disabled defaultValue="">
                  <option value="">égale à</option>
                </select>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-9" />
                <input className="input" type="text" defaultValue="À modérer" disabled />
              </div>
            </div>
            <div className="my-4 border-t border-gray-border" />
            <div className="flex items-start gap-3">
              <div className="w-[20%]">
                <h2 className="text-lg">Action</h2>
              </div>
              <div className="flex w-[20%] flex-col gap-2">
                <select className="select" disabled defaultValue="">
                  <option value="">modération</option>
                </select>
                <select className="select" disabled defaultValue="">
                  <option value="">motif</option>
                </select>
              </div>
              <div className="flex w-[20%] flex-col gap-2">
                <select className="select" disabled defaultValue="">
                  <option value="">égale à</option>
                </select>
                <select className="select" disabled defaultValue="">
                  <option value="">égale à</option>
                </select>
              </div>

              <div className="flex flex-1 flex-col gap-2">
                <input className="input" type="text" defaultValue="Refusée" disabled />
                <input className="input" type="text" defaultValue="Le contenu est insuffisant / non qualitatif" disabled />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SettingsModal;
