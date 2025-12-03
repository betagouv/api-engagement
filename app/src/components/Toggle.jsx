import { Switch } from "@headlessui/react";
import { IoMdCheckmark } from "react-icons/io";

const Toggle = ({ value, onChange = () => null }) => {
  return (
    <Switch
      checked={value}
      onChange={onChange}
      className={`${value ? "bg-blue-france" : "bg-white"} border-blue-france focus-visible:ring-opacity-75 relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white`}
    >
      <span
        aria-hidden="true"
        className={`${value ? "translate-x-4" : "-translate-x-0.5"} border-blue-france pointer-events-none flex h-6 w-6 transform items-center justify-center rounded-full border bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
      >
        {value && <IoMdCheckmark className="text-blue-france" />}
      </span>
    </Switch>
  );
};

export default Toggle;
