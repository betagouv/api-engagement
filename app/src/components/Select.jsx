import { Fragment, useEffect, useState } from "react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Transition } from "@headlessui/react";
import { RiArrowDownSLine, RiCloseFill } from "react-icons/ri";
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
    <Listbox as="div" className="relative w-full" value={selected} onChange={handleChange}>
      <div className="relative w-full">
        <ListboxButton
          className={`select relative w-full px-4 py-2 ${selected ? "pr-16" : ""} truncate text-left`}
          aria-label={placeholder}
        >
          {selected ? selected.label : placeholder}
          <RiArrowDownSLine className="absolute top-1/2 right-4 -translate-y-1/2 transform text-lg" />
        </ListboxButton>
        {selected && (
          <button
            className="absolute top-1/2 right-8 -translate-y-1/2 transform"
            onClick={handleClear}
            aria-label="Effacer"
            tabIndex={0}
          >
            <RiCloseFill className="text-base" />
          </button>
        )}
      </div>

      <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
        <ListboxOptions
          className={`absolute top-10 z-10 max-h-80 overflow-y-auto bg-white shadow-lg ${className || "w-full"}`}
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
                    `relative flex cursor-default list-none items-center justify-between gap-4 px-4 py-3 text-sm select-none ${
                      focus ? "bg-gray-100 text-blue-france" : "bg-white text-black"
                    }`
                  }
                >
                  <p className="truncate text-sm whitespace-nowrap">{option.label}</p>
                  {option.count && <p className="text-sm">{option.count}</p>}
                </ListboxOption>
              </Fragment>
            ))
          )}
        </ListboxOptions>
      </Transition>
    </Listbox>
  );
};

export default Select;
