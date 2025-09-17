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
        <RiInformationFill className="text-2xl text-white" />
      </div>
      <div className="flex-1 bg-white p-4">{children}</div>
    </div>
  );
};

export default InfoAlert;
