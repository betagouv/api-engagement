import { RiCloseFill, RiInformationFill } from "react-icons/ri";

const InfoAlert = ({ children, onClose }) => {
  return (
    <div className="border-blue-info-425 relative flex border">
      {onClose && (
        <button className="absolute top-0 right-0 p-2" onClick={onClose}>
          <RiCloseFill className="text-blue-france" />
        </button>
      )}
      <div className="bg-blue-info-425 p-2">
        <RiInformationFill className="text-2xl text-white" />
      </div>
      <div className="flex-1 bg-white p-4">{children}</div>
    </div>
  );
};

export default InfoAlert;
