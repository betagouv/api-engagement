import { Fragment, useEffect, useRef, useState } from "react";
import { RiArrowDownSLine, RiCloseFill } from "react-icons/ri";
import Loader from "./Loader";

const Select = ({ options, value, onChange, className, placeholder = "Sélectionner une option", loading = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((option) => option.value === value);

  const handleClear = (e) => {
    e.stopPropagation();
    onChange({ value: "" });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref]);

  return (
    <div className="w-full relative" ref={ref}>
      <div className="relative w-full">
        <button className={`relative select w-full py-2 px-4 ${selected ? "pr-16" : ""} text-left truncate`} onClick={() => setIsOpen(!isOpen)}>
          {selected ? selected.label : placeholder}
          <RiArrowDownSLine className="text-lg absolute right-4 top-1/2 transform -translate-y-1/2" />
        </button>
        {selected && (
          <button className="absolute right-8 top-1/2 transform -translate-y-1/2" onClick={handleClear}>
            <RiCloseFill className="text-base" />
          </button>
        )}
      </div>
      {isOpen && (
        <ul className={`absolute z-10 top-10 w-full max-h-80 overflow-y-scroll transition duration-100 ease-in bg-white shadow-lg ${className || "w-full"}`} tabIndex={0}>
          {loading ? (
            <li className="group flex cursor-default items-center justify-center px-4 py-2 data-[focus]:bg-gray-hover">
              <Loader />
            </li>
          ) : !options.length ? (
            <li className="group flex cursor-default items-center justify-center px-4 py-2 data-[focus]:bg-gray-hover">
              <p className="text-sm">Aucune option trouvée</p>
            </li>
          ) : (
            options.map((option, i) => (
              <Fragment key={i}>
                {i !== 0 ? <div className="h-px mx-4 bg-gray-100" /> : null}
                <li
                  tabIndex={-1}
                  key={option.value}
                  className={`relative flex gap-4 cursor-default select-none list-none items-center justify-between px-4 py-3 text-sm hover:bg-gray-100 hover:text-blue-dark bg-white text-black`}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                >
                  <p className="text-sm truncate whitespace-nowrap">{option.label}</p>
                  {option.count && <p className="text-sm">{option.count}</p>}
                </li>
              </Fragment>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default Select;
