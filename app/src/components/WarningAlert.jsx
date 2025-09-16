import { RiAlertFill, RiCloseFill } from "react-icons/ri";

const WarningAlert = ({ children, onClose }) => {
  return (
    <div className="relative flex border border-[#b34000]">
      {onClose && (
        <button className="absolute top-0 right-0 p-2" onClick={onClose}>
          <RiCloseFill className="text-blue-france" />
        </button>
      )}
      <div className="bg-[#b34000] p-2">
        <RiAlertFill className="text-2xl text-white" />
      </div>
      <div className="flex-1 space-y-2 bg-white p-4">{children}</div>
    </div>
  );
};

export default WarningAlert;
