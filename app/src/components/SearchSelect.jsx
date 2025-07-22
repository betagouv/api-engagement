import { Fragment, useEffect, useRef, useState } from "react";
import { RiArrowDownSLine, RiCloseFill } from "react-icons/ri";
import Loader from "./Loader";

const SearchSelect = ({ id, options, value, onChange, placeholder, className, loading = false }) => {
  const ref = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const selected = options.find((option) => option.value === value);
    setSelected(selected || null);
  }, [value, loading]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref]);

  useEffect(() => {
    if (!search) setIsOpen(false);
    else setIsOpen(true);
  }, [search]);

  const handleClear = (e) => {
    e.stopPropagation();
    onChange({ value: "" });
    setSearch("");
    setIsOpen(false);
  };

  return (
    <div className="relative w-full " ref={ref}>
      <div className="relative w-full">
        <input
          id={id}
          className={`input w-full ${selected ? "pr-16 placeholder:text-black" : ""}`}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={selected ? selected.label : placeholder}
          value={search}
        />

        {selected && (
          <button className="absolute right-8 top-1/2 transform -translate-y-1/2" onClick={handleClear}>
            <RiCloseFill className="text-lg" />
          </button>
        )}
        <button className="absolute right-4 top-1/2 transform -translate-y-1/2" onClick={() => setIsOpen(!isOpen)}>
          <RiArrowDownSLine className={`text-lg ${isOpen ? "transform rotate-180" : ""}`} />
        </button>
      </div>
      {isOpen && (
        <ul className={`absolute z-10 top-10 max-h-80 overflow-y-scroll transition duration-100 ease-in bg-white shadow-lg ${className || "w-full"}`}>
          {loading ? (
            <li className="group flex cursor-default items-center justify-center px-4 py-2 data-[focus]:bg-gray-hover">
              <Loader />
            </li>
          ) : !options.length ? (
            <li className="group flex cursor-default items-center justify-center px-4 py-2 data-[focus]:bg-gray-hover">
              <p className="text-sm">Aucune option trouvée</p>
            </li>
          ) : (
            options
              .filter((option) => (search ? option.label.toLowerCase().includes(search.toLowerCase()) : true))
              .map((option, i) => (
                <Fragment key={i}>
                  {i !== 0 ? <div className="h-px mx-4 bg-gray-100" /> : null}
                  <li
                    className={`relative flex gap-4 cursor-default select-none list-none items-center justify-between px-4 py-3 text-sm hover:bg-gray-100 hover:text-blue-dark bg-white text-black`}
                    tabIndex={-1}
                    onClick={() => {
                      onChange(option);
                      setIsOpen(false);
                      setSearch("");
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

export default SearchSelect;
