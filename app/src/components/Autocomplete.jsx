import { Fragment, useEffect, useRef, useState } from "react";
import { RiArrowDownSLine, RiCloseLine } from "react-icons/ri";

import Loader from "./Loader";

const Autocomplete = ({ options, value, onChange, onSelect, onClear, loading = false, placeholder, className, id }) => {
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
              if (onClear) onClear();
              setIsOpen(false);
            }}
          >
            <RiCloseLine className="text-sm" />
          </button>
        )}
        <button type="button" className="absolute inset-y-2 right-0 flex items-center pr-2" onClick={() => setIsOpen(!isOpen)}>
          <RiArrowDownSLine className={`text-sm ${isOpen ? "rotate-180 transform" : ""}`} />
        </button>
      </div>
      {isOpen && (
        <ul className={`absolute top-10 z-10 max-h-80 w-full overflow-y-scroll bg-white shadow-lg transition duration-100 ease-in ${className || "w-full"}`}>
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
                  className={`hover:text-blue-france relative flex cursor-default list-none items-center justify-between gap-4 bg-white px-4 py-3 text-sm text-black select-none hover:bg-gray-100`}
                  onClick={() => {
                    onSelect(option);
                    setIsOpen(false);
                  }}
                >
                  <p className="flex-1 truncate">{option.label}</p>
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
