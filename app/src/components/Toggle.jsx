import { IoMdCheckmark } from "react-icons/io";

const Toggle = ({ value, onChange = () => null, className = "", ...rest }) => {
  const checked = Boolean(value);

  return (
    <button
      {...rest}
      type="button"
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      className={`${checked ? "bg-blue-france" : "bg-white"} border-blue-france relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a76f6] ${className}`}
    >
      <span
        aria-hidden="true"
        className={`${checked ? "translate-x-4" : "-translate-x-0.5"} border-blue-france pointer-events-none flex h-6 w-6 transform items-center justify-center rounded-full border bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
      >
        {checked && <IoMdCheckmark className="text-blue-france" />}
      </span>
    </button>
  );
};

export default Toggle;
