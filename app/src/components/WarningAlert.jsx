import { RiAlertFill, RiCloseFill } from "react-icons/ri";

const WarningAlert = ({ children, onClose }) => {
  return (
    <div className="border-warning relative flex border">
      {onClose && (
        <button className="absolute top-0 right-0 p-2" onClick={onClose}>
          <RiCloseFill className="text-blue-france" aria-hidden="true" />
        </button>
      )}
      <div className="bg-warning p-2">
        <RiAlertFill className="text-2xl text-white" aria-hidden="true" />
      </div>
      <div className="flex-1 space-y-2 bg-white p-4">{children}</div>
    </div>
  );
};

export default WarningAlert;
