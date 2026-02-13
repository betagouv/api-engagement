import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { HiX } from "react-icons/hi";

const Modal = ({ isOpen, children, onClose, className = "w-1/2" }) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} as="div" className="relative z-10 focus:outline-none" onClose={onClose}>
      <DialogBackdrop className="fixed inset-0 bg-black/30" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel
          transition
          className={`w-full max-w-3xl bg-white p-6 backdrop-blur-2xl duration-300 ease-out data-closed:transform-[scale(95%)] data-closed:opacity-0 ${className}`}
        >
          <button type="button" className="absolute top-2 right-2 cursor-pointer p-3" onClick={onClose} aria-label="Fermer">
            <HiX className="text-blue-france text-lg" aria-hidden="true" />
          </button>
          <div className="max-h-full overflow-y-auto">{children}</div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default Modal;
