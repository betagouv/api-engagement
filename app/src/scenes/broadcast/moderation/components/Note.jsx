import { useEffect, useState } from "react";
import { RiPencilFill } from "react-icons/ri";

const Note = ({ data, onChange }) => {
  const [note, setNote] = useState(data.note);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setNote(data.note);
  }, [data.note]);

  const handleSave = () => {
    onChange({ note });
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-4 border border-gray-900 bg-white p-6">
      <div className="flex items-center gap-2">
        <RiPencilFill className="text-gray-425" />
        <label className="text-gray-425 text-xs font-semibold" htmlFor="note">
          NOTES
        </label>
      </div>
      <div>
        {note && !editing && (
          <div className="flex flex-col items-start gap-4">
            <span className="text-gray-425 text-sm italic">{note}</span>
            <button className="text-blue-france text-sm" onClick={() => setEditing(true)}>
              Modifier la note
            </button>
          </div>
        )}
        {!note && !editing && (
          <button className="text-blue-france text-sm" onClick={() => setEditing(true)}>
            Ajouter une note
          </button>
        )}
      </div>

      {editing && (
        <>
          <textarea id="note" className="input mb-2 border-b-black" name="note" value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="Ajouter une note" />
          <button className="primary-btn w-1/2" onClick={handleSave}>
            Enregistrer
          </button>
        </>
      )}
    </div>
  );
};

export default Note;
