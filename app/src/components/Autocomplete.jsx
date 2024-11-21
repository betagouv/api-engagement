import { Fragment, useEffect, useRef, useState } from "react";
import { RiArrowDownSLine, RiCloseLine } from "react-icons/ri";

import Loader from "./Loader";

const Autocomplete = ({ options, value, onChange, onSelect, loading = false, placeholder, className, id }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

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
        <label htmlFor="autocomplete" className="sr-only">
          {placeholder}
        </label>
        <input
          id="autocomplete"
          name="autocomplete"
          className="input w-full"
          onChange={(e) => {
            setIsOpen(true);
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          value={value || ""}
        />
        {value && (
          <button
            type="button"
            className="absolute inset-y-2 right-4 flex items-center pr-2"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
          >
            <RiCloseLine className="text-sm" />
          </button>
        )}
        <button className="absolute inset-y-2 right-0 flex items-center pr-2" onClick={() => setIsOpen(!isOpen)}>
          <RiArrowDownSLine className={`text-sm ${isOpen ? "transform rotate-180" : ""}`} />
        </button>
      </div>
      {isOpen && (
        <ul className={`absolute z-10 top-10 w-full max-h-80 overflow-y-scroll transition duration-100 ease-in bg-white shadow-lg ${className || "w-full"}`}>
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
                  className={`relative flex gap-4 cursor-default select-none list-none items-center justify-between px-4 py-3 text-sm hover:bg-gray-100 hover:text-blue-dark bg-white text-black`}
                  onClick={() => {
                    onSelect(option);
                    setIsOpen(false);
                  }}
                >
                  <p className="truncate flex-1">{option.label}</p>
                  {option.doc_count && <span>{option.doc_count}</span>}
                </li>
              </Fragment>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default Autocomplete;
