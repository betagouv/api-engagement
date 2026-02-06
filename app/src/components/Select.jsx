import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { RiArrowDownSLine, RiCheckFill, RiCloseFill } from "react-icons/ri";
import Loader from "./Loader";

const Select = ({ options, value, onChange, className, placeholder = "Sélectionner une option", loading = false }) => {
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const selectedOption = options.find((option) => option.value === value);
    setSelected(selectedOption || null);
  }, [value, options, loading]);

  const handleChange = (option) => {
    onChange(option);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange({ value: "" });
  };

  return (
    <Listbox as="div" className="w-full" value={selected} onChange={handleChange}>
      <div className="relative w-full">
        <ListboxButton className={`select relative w-full px-4 py-2 ${selected ? "pr-16" : ""} truncate text-left`} aria-label={placeholder}>
          {selected ? selected.label : placeholder}
          <RiArrowDownSLine className="absolute top-1/2 right-4 -translate-y-1/2 transform text-lg" />
        </ListboxButton>
        {selected && (
          <button className="absolute top-1/2 right-8 -translate-y-1/2 transform" onClick={handleClear} aria-label="Effacer" tabIndex={0}>
            <RiCloseFill className="text-base" />
          </button>
        )}
      </div>

      <ListboxOptions
        anchor="bottom"
        transition
        className={`mt-1 max-h-80 w-(--button-width) origin-top overflow-y-auto bg-white shadow-lg transition duration-200 ease-out empty:invisible data-closed:scale-95 data-closed:opacity-0 ${className}`}
      >
        {loading ? (
          <div className="flex cursor-default items-center justify-center px-4 py-2">
            <Loader />
          </div>
        ) : !options.length ? (
          <div className="flex cursor-default items-center justify-center px-4 py-2">
            <p className="text-sm">Aucune option trouvée</p>
          </div>
        ) : (
          options.map((option, i) => (
            <Fragment key={i}>
              {i !== 0 ? <div className="mx-4 h-px bg-gray-100" /> : null}
              <ListboxOption
                value={option}
                className={({ focus }) =>
                  `group flex cursor-default list-none items-center justify-between gap-4 px-4 py-3 text-sm select-none ${
                    focus ? "text-blue-france bg-gray-100" : "bg-white text-black"
                  }`
                }
              >
                <RiCheckFill className="invisible text-sm group-data-selected:visible" />
                <p className="flex-1 truncate">{option.label}</p>
                {option.count && <p className="text-sm">{option.count}</p>}
              </ListboxOption>
            </Fragment>
          ))
        )}
      </ListboxOptions>
    </Listbox>
  );
};

export default Select;
