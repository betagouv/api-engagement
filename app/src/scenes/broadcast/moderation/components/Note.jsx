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
    <div className="flex flex-col bg-white p-6 gap-4 border border-gray-900">
      <div className="flex items-center gap-2">
        <RiPencilFill className="text-gray-425" />
        <label className="text-xs text-gray-425 font-semibold" htmlFor="note">
          NOTES
        </label>
      </div>
      <div>
        {note && !editing && (
          <div className="flex flex-col gap-4 items-start">
            <span className="text-sm text-gray-425 italic">{note}</span>
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
          <button className="button bg-blue-france text-white hover:bg-blue-france-hover w-1/2" onClick={handleSave}>
            Enregistrer
          </button>
        </>
      )}
    </div>
  );
};

export default Note;
