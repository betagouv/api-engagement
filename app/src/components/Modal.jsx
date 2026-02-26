import { useEffect, useId, useRef } from "react";
import { RiCloseFill } from "react-icons/ri";

const Modal = ({ open, children, onClose, title, className = "min-w-2xl" }) => {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClick={handleBackdropClick}
      className="fixed inset-0 m-auto max-h-[90vh] max-w-[90vw] overflow-visible bg-transparent p-0 backdrop:bg-black/60"
    >
      <div className={`${className} relative max-h-[90vh] overflow-y-auto bg-white`}>
        <div className="flex justify-end px-8 py-4">
          <button type="button" aria-controls="modal" className="tertiary-btn" onClick={onClose} aria-label="Fermer">
            <span className="leading-none" aria-hidden="true">
              Fermer
            </span>
            <RiCloseFill className="ml-2 inline text-sm" aria-hidden="true" />
          </button>
        </div>
        <div className="mb-16 flex flex-col gap-4 px-8">
          <h2 id={titleId} className="text-2xl font-bold">
            {title}
          </h2>
          {children}
        </div>
      </div>
    </dialog>
  );
};
export default Modal;
