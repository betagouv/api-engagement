const Modal = ({ isOpen, children, onClose, className = "w-[736px] md:w-2/3", innerClassName = "w-[736px] max-h-screen" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed left-0 top-0 z-50 flex h-full w-full flex-col items-center justify-center">
      <div className="absolute inset-0 z-0 overflow-y-auto bg-black bg-opacity-30 backdrop-blur-sm" onClick={onClose} />
      <div className={`${className} absolute z-10 md:px-4`}>
        <div className={`${innerClassName} absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 transform overflow-y-auto border bg-white`}>{children}</div>
      </div>
    </div>
  );
};
export default Modal;
