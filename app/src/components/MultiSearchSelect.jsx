import { Fragment, useEffect, useRef, useState } from "react";
import { RiArrowDownSLine, RiCheckLine, RiCloseFill } from "react-icons/ri";

const MultiSearchSelect = ({ options, value, onChange, placeholder, className, loading = false }) => {
  const ref = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    const selected = options.filter((option) => value.includes(option.value)).map((option) => option.value);
    setSelected(selected);
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
    onChange({ value: [] });
    setSearch("");
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={ref}>
      <div className="relative w-full">
        <label htmlFor="multi-search-select" className="sr-only">
          {placeholder}
        </label>
        <input
          id="multi-search-select"
          name="multi-search-select"
          className={`input w-full ${selected.length ? "pr-16 placeholder:text-black" : "pr-8"}`}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={selected.length > 0 ? `${selected.length} sélections` : placeholder}
          value={search}
        />

        {selected.length > 0 && (
          <button className="absolute top-1/2 right-9 -translate-y-1/2 transform" onClick={handleClear}>
            <RiCloseFill className="text-lg" />
          </button>
        )}
        <button className="absolute inset-y-2 right-0 flex items-center pr-2" onClick={() => setIsOpen(!isOpen)}>
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
            options
              .filter((option) => (search ? option.label.toLowerCase().includes(search.toLowerCase()) : true))
              .map((option, i) => (
                <Fragment key={i}>
                  {i !== 0 ? <div className="mx-4 h-px bg-gray-100" /> : null}
                  <li
                    className={`hover:text-blue-france relative flex cursor-default list-none items-center justify-between gap-4 bg-white px-6 py-3 text-sm text-black select-none hover:bg-gray-100`}
                    tabIndex={-1}
                    onClick={() => {
                      onChange(selected.includes(option.value) ? { value: selected.filter((v) => v !== option.value) } : { value: [...selected, option.value] });
                    }}
                  >
                    {selected.includes(option.value) && <RiCheckLine className="text-blue-france absolute top-1/2 left-1 -translate-y-1/2 text-sm" />}
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

export default MultiSearchSelect;
