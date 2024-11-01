import { RiCloseFill, RiInformationFill } from "react-icons/ri";

const InfoAlert = ({ children, onClose }) => {
  return (
    <div className="relative flex border border-[#0078f3]">
      {onClose && (
        <button className="absolute top-0 right-0 p-2" onClick={onClose}>
          <RiCloseFill className="text-[#000091]" />
        </button>
      )}
      <div className="bg-[#0078f3] p-2">
        <RiInformationFill className="text-white text-2xl" />
      </div>
      <div className="bg-white p-4 flex-1">{children}</div>
    </div>
  );
};

export default InfoAlert;
