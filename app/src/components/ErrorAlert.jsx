import { RiCloseFill } from "react-icons/ri";

import ErrorIconSvg from "../assets/svg/error-icon.svg?react";

const ErrorAlert = ({ children, onClose }) => {
  return (
    <div className="border-red-marianne relative flex border">
      {onClose && (
        <button className="absolute top-0 right-0 p-2" onClick={onClose}>
          <RiCloseFill className="text-blue-france" />
        </button>
      )}
      <div className="bg-red-marianne p-2 text-white">
        <ErrorIconSvg fill="#fff" />
      </div>
      <div className="flex-1 space-y-2 bg-white p-4">{children}</div>
    </div>
  );
};

export default ErrorAlert;
