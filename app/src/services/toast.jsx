import { toast as reactToast } from "react-toastify";

const ToastContent = ({ children }) => {
  return <p>{children}</p>;
};

const createAccessibleToast = (type, role, ariaLive) => {
  return (message, options = {}) => {
    const content = <ToastContent>{message}</ToastContent>;

    const accessibleOptions = {
      role,
      ariaLive,
      ariaAtomic: true,
      ...options,
    };

    return reactToast[type](content, accessibleOptions);
  };
};

export const toast = {
  success: createAccessibleToast("success", "status", "polite"),
  error: createAccessibleToast("error", "alert", "assertive"),
  info: createAccessibleToast("info", "status", "polite"),
  warning: createAccessibleToast("warning", "status", "polite"),
};

export default toast;
