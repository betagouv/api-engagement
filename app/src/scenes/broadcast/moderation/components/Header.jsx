import { useEffect, useRef, useState } from "react";
import { RiCheckboxFill, RiCheckboxIndeterminateFill } from "react-icons/ri";
import { toast } from "react-toastify";

import Loader from "../../../../components/Loader";
import Modal from "../../../../components/Modal";
import api from "../../../../services/api";
import { captureError } from "../../../../services/error";
import useStore from "../../../../services/store";
import { JVA_MODERATION_COMMENTS_LABELS, STATUS, STATUS_COLORS } from "./Constants";

const Header = ({ total, data, size, sort, selected, onSize, onSort, onSelect, onChange }) => {
  const headerRef = useRef(null);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY === headerRef.current?.offsetTop);

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (selected.length > 0)
    return (
      <div ref={headerRef} className={`sticky top-0 z-10 bg-white ${isSticky ? "shadow-md px-12" : "mx-12"}`}>
        <div className="flex justify-between gap-4 items-center py-4">
          {isSticky ? (
            <div>
              <button className="button" onClick={() => onSelect(data.map((d) => d._id))}>
                {selected.length === data.length ? <RiCheckboxFill className="text-blue-500 text-2xl" /> : <RiCheckboxIndeterminateFill className="text-blue-500 text-2xl" />}
              </button>
            </div>
          ) : (
            <h2 className="text-xl font-semibold">{total.toLocaleString("fr")} missions diffusables</h2>
          )}
          <div className="flex items-center gap-4">
            <span className="text-gray-dark text-sm">{selected.length === 1 ? `1 sélectionnée` : `${selected.length} sélectionnées`}</span>
            <span className="text-blue-dark text-sm underline cursor-pointer" onClick={() => onSelect([])}>
              Désélectionner
            </span>
            <ManyUpdateModal onClose={() => onSelect([])} selected={selected} onChange={onChange} />
          </div>
        </div>
      </div>
    );

  return (
    <div className="flex justify-between gap-4 items-center py-4 mx-12">
      <h2 className="text-xl font-semibold">{total.toLocaleString("fr")} missions diffusables</h2>

      <div className="flex gap-2 items-center">
        <label htmlFor="missions-per-page" className="text-xs text-gray-dark">
          Missions affichées par page
        </label>
        <select id="missions-per-page" className="input w-18" value={size} onChange={(e) => onSize(Number(e.target.value))}>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={75}>75</option>
          <option value={100}>100</option>
        </select>
        <label htmlFor="sort-by" className="text-xs text-gray-dark sr-only">
          Trier par
        </label>
        <select id="sort-by" className="input w-60" value={sort} onChange={(e) => onSort(e.target.value)}>
          <option value="">Trier par</option>
          <option value="desc">Mission la plus récente</option>
          <option value="asc">Mission la plus ancienne</option>
        </select>
      </div>
    </div>
  );
};

const ManyUpdateModal = ({ onClose, selected, onChange }) => {
  const { publisher } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [comment, setComment] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (status === "REFUSED" && !comment) return;
      const data = [];
      for (const id of selected) {
        const res = await api.put(`/moderation/${id}`, { status, comment, note, moderatorId: publisher._id });
        if (!res.ok) throw res;
        data.push(res.data);
      }
      toast.success("La mission a été modérée avec succès");
      onChange(data);
      onClose();
    } catch (error) {
      captureError(error, "Une erreur est survenue");
    }
    setLoading(false);
  };

  return (
    <>
      <button className="button border border-blue-dark text-blue-dark hover:bg-gray-hover" onClick={() => setIsOpen(true)}>
        Modérer
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <form className="px-32 py-16" onSubmit={handleSubmit}>
          <h1 className="mb-10">Modérer {selected.length > 1 ? `${selected.length} missions` : `la mission`}</h1>
          <div className="flex items-center justify-center">
            <div className="flex w-full flex-col justify-center gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="status" className="text-sm">
                  Statut<span className="ml-1 text-red-main">*</span>
                </label>
                <select
                  id="status"
                  className="select w-full"
                  style={{ borderBottomColor: STATUS_COLORS[status] }}
                  name="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  required
                >
                  <option value="">Statut</option>
                  {Object.entries(STATUS).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </select>
                {status === "REFUSED" && (
                  <div className="flex flex-col gap-2 mt-2">
                    <label htmlFor="comment" className="text-sm">
                      Motif<span className="ml-1 text-red-main">*</span>
                    </label>
                    <select id="comment" className="select" name="comment" value={comment} onChange={(e) => setComment(e.target.value)} required>
                      <option value="">Sélectionner un motif</option>
                      {Object.entries(JVA_MODERATION_COMMENTS_LABELS).map(([key, value]) => (
                        <option key={key} value={key}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="note" className="text-sm">
                  Note
                </label>
                <textarea id="note" className="input" rows={4} name="note" value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="mt-6 flex justify-end">
                  <button className="filled-button w-full flex justify-center" type="submit" disabled={!status || (status === "REFUSED" && !comment) || loading}>
                    {loading ? <Loader className="w-6 h-6" /> : "Enregistrer"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default Header;
