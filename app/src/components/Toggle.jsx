import { Switch } from "@headlessui/react";
import { IoMdCheckmark } from "react-icons/io";

const Toggle = ({ value, onChange = () => null }) => {
  return (
    <Switch
      checked={value}
      onChange={onChange}
      className={`${value ? "bg-blue-france" : "bg-transparent"}
          relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-blue-france p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75`}
    >
      <span
        aria-hidden="true"
        className={`${value ? "translate-x-4" : "-translate-x-0.5"}
            pointer-events-none flex h-6 w-6 transform items-center justify-center rounded-full border border-blue-france bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
      >
        {value && <IoMdCheckmark className="text-blue-france" />}
      </span>
    </Switch>
  );
};

export default Toggle;
