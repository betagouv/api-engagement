import { RiCloseFill } from "react-icons/ri";

const Modal = ({ isOpen, children, onClose, className = "w-full max-w-3xl", wapperClassName = "w-full h-full" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed left-0 top-0 z-50 h-full w-full flex items-center justify-center">
      <div className="fixed inset-0 z-0 overflow-y-auto bg-black bg-opacity-30 backdrop-blur-sm" onClick={onClose} />
      <div className={`${wapperClassName} absolute z-10 md:px-4`}>
        <div className={`${className} absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 transform overflow-y-auto border bg-white`}>
          <div className="relative h-full w-full">
            <button type="button" className="absolute right-2 top-2 cursor-pointer p-3 text-sm text-blue-france" onClick={onClose}>
              <span className="leading-none">Fermer</span>
              <RiCloseFill className="ml-2 inline text-sm" />
            </button>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Modal;
