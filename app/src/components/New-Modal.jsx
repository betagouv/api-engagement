import { HiX } from "react-icons/hi";

const Modal = ({ isOpen, children, onClose, className = "w-full h-full", innerClassName = "w-full h-full max-h-screen" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed left-0 top-0 z-50 flex h-full w-full flex-col items-center justify-center">
      <div className="absolute inset-0 z-0 overflow-y-auto bg-black bg-opacity-30 backdrop-blur-sm" onClick={onClose} />
      <div className={`${className} absolute z-10 md:px-4`}>
        <div className={`${innerClassName} absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 transform overflow-y-auto border bg-white`}>
          <div className="relative h-full w-full">
            <div className="absolute right-2 top-2 cursor-pointer p-3">
              <HiX className="text-blue-dark text-lg" onClick={onClose} />
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Modal;
