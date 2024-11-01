import { RiCloseFill } from "react-icons/ri";

import ErrorIconSvg from "../assets/svg/error-icon.svg?react";

const ErrorAlert = ({ children, onClose }) => {
  return (
    <div className="relative flex border border-[#e1000f]">
      {onClose && (
        <button className="absolute top-0 right-0 p-2" onClick={onClose}>
          <RiCloseFill className="text-blue-dark" />
        </button>
      )}
      <div className="bg-[#e1000f] p-2 text-white">
        <ErrorIconSvg fill="#fff" />
      </div>
      <div className="bg-white p-4 flex-1 space-y-2">{children}</div>
    </div>
  );
};

export default ErrorAlert;
