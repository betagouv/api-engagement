import { Fragment, useEffect, useRef, useState } from "react";
import { RiArrowDownSLine, RiCloseFill } from "react-icons/ri";
import Loader from "./Loader";

const Select = ({ options, value, onChange, className, placeholder = "Sélectionner une option", loading = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const selected = options.find((option) => option.value === value);
    setSelected(selected || null);
  }, [value, loading]);

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
    <div className="relative w-full" ref={ref}>
      <div className="relative w-full">
        <button className={`select relative w-full px-4 py-2 ${selected ? "pr-16" : ""} truncate text-left`} onClick={() => setIsOpen(!isOpen)}>
          {selected ? selected.label : placeholder}
          <RiArrowDownSLine className="absolute top-1/2 right-4 -translate-y-1/2 transform text-lg" />
        </button>
        {selected && (
          <button className="absolute top-1/2 right-8 -translate-y-1/2 transform" onClick={handleClear}>
            <RiCloseFill className="text-base" />
          </button>
        )}
      </div>
      {isOpen && (
        <ul className={`absolute top-10 z-10 max-h-80 overflow-y-scroll bg-white shadow-lg transition duration-100 ease-in ${className || "w-full"}`} tabIndex={0}>
          {loading ? (
            <li className="group data-[focus]:bg-gray-975 flex cursor-default items-center justify-center px-4 py-2">
              <Loader />
            </li>
          ) : !options.length ? (
            <li className="group data-[focus]:bg-gray-975 flex cursor-default items-center justify-center px-4 py-2">
              <p className="text-sm">Aucune option trouvée</p>
            </li>
          ) : (
            options.map((option, i) => (
              <Fragment key={i}>
                {i !== 0 ? <div className="mx-4 h-px bg-gray-100" /> : null}
                <li
                  tabIndex={-1}
                  key={option.value}
                  className={`hover:text-blue-france relative flex cursor-default list-none items-center justify-between gap-4 bg-white px-4 py-3 text-sm text-black select-none hover:bg-gray-100`}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                >
                  <p className="truncate text-sm whitespace-nowrap">{option.label}</p>
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
