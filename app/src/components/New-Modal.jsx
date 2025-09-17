import { RiCloseFill } from "react-icons/ri";

const Modal = ({ isOpen, children, onClose, className = "w-full max-w-3xl", wapperClassName = "w-full h-full" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 z-50 flex h-full w-full items-center justify-center">
      <div className="bg-opacity-30 fixed inset-0 z-0 overflow-y-auto bg-black backdrop-blur-sm" onClick={onClose} />
      <div className={`${wapperClassName} absolute z-10 md:px-4`}>
        <div className={`${className} absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 transform overflow-y-auto border border-gray-900 bg-white`}>
          <div className="relative h-full w-full">
            <button type="button" className="text-blue-france absolute top-2 right-2 cursor-pointer p-3 text-sm" onClick={onClose}>
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
