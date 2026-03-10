import { RiCloseFill, RiInformationFill } from "react-icons/ri";

const InfoAlert = ({ children, onClose }) => {
  return (
    <div className="border-info relative flex border">
      {onClose && (
        <button className="absolute top-0 right-0 p-2" onClick={onClose}>
          <RiCloseFill className="text-blue-france" aria-hidden="true" />
        </button>
      )}
      <div className="bg-info p-2">
        <RiInformationFill className="text-2xl text-white" aria-hidden="true" />
      </div>
      <div className="flex-1 bg-white p-4">{children}</div>
    </div>
  );
};

export default InfoAlert;
