import { useState } from "react";

import Modal from "@/components/Modal";
import SearchInput from "@/components/SearchInput";
import Table from "@/components/Table";

const AnnonceursModal = ({ annonceurs, selected, onClose, onSubmit }) => {
  const [selectedIds, setSelectedIds] = useState(selected.map((publisher) => publisher.publisherId));
  const [search, setSearch] = useState("");

  const handleToggle = (id, checked) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((selectedId) => selectedId !== id)));
  };

  const handleSubmit = () => {
    const kept = selected.filter((publisher) => selectedIds.includes(publisher.publisherId));
    const added = annonceurs
      .filter((item) => selectedIds.includes(item.id) && !selected.some((publisher) => publisher.publisherId === item.id))
      .map((item) => ({ publisherId: item.id, publisherName: item.name, publisherLogo: item.logo, moderator: item.moderator, missionType: item.missionType }));
    onSubmit([...kept, ...added]);
  };

  const filteredAnnonceurs = annonceurs.filter((item) => item.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal open onClose={onClose} title="Ajouter des partenaires" className="w-[90vw] max-w-3xl">
      <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un annonceur" timeout={0} />
      <p className="text-base" aria-live="polite">
        {selectedIds.length} annonceurs sélectionnés
      </p>
      <Table caption="Liste des annonceurs" header={[{ title: "Annonceurs" }]} className="max-h-96">
        {filteredAnnonceurs.map((item, index) => (
          <tr key={item.id} className={`${index % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-row`}>
            <td className="p-4">
              <div className="flex items-center gap-2">
                <input
                  id={`annonceur-${item.id}`}
                  type="checkbox"
                  className="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={(e) => handleToggle(item.id, e.target.checked)}
                />
                <label htmlFor={`annonceur-${item.id}`}>{item.name}</label>
              </div>
            </td>
          </tr>
        ))}
      </Table>
      <div className="flex justify-end gap-2">
        <button type="button" className="secondary-btn" onClick={onClose}>
          Annuler
        </button>
        <button type="button" className="primary-btn" onClick={handleSubmit}>
          Valider la sélection
        </button>
      </div>
    </Modal>
  );
};

export default AnnonceursModal;
