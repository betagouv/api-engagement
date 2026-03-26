import Loader from "@/components/Loader";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { RiArrowDownSLine, RiCloseFill } from "react-icons/ri";

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
        <ListboxButton className={`select relative w-full truncate px-4 py-2 ${selected ? "pr-16" : ""} text-left`} aria-label={placeholder}>
          {selected ? selected.label : placeholder}
          <RiArrowDownSLine className="absolute top-1/2 right-4 -translate-y-1/2 transform text-lg" aria-hidden="true" />
        </ListboxButton>
        {selected && (
          <button className="absolute top-1/2 right-8 -translate-y-1/2 transform p-1" onClick={handleClear} aria-label="Effacer" tabIndex={0}>
            <RiCloseFill className="text-base" aria-hidden="true" />
          </button>
        )}
      </div>

      <ListboxOptions anchor="bottom" className={`mt-1 max-h-80 w-(--button-width) overflow-y-auto border border-gray-200 bg-white py-4 shadow-md ${className}`}>
        {loading ? (
          <div className="mx-4 flex cursor-default items-center justify-center px-4 py-2">
            <Loader />
          </div>
        ) : !options.length ? (
          <div className="mx-4 flex cursor-default items-center justify-center px-4 py-2">
            <p className="text-sm">Aucune option trouvée</p>
          </div>
        ) : (
          options.map((option, i) => (
            <Fragment key={i}>
              {i !== 0 ? <div className="mx-4 h-px bg-gray-100" /> : null}
              <ListboxOption
                value={option}
                className={({ focus }) =>
                  `group mx-4 flex cursor-default list-none items-center justify-between gap-4 px-4 py-3 text-sm select-none ${
                    focus ? "text-blue-france bg-gray-100" : "bg-white text-black"
                  }`
                }
              >
                <p className="group-data-selected:text-blue-france flex-1 truncate">{option.label}</p>
                {option.count && <p className="group-data-selected:text-blue-france text-sm">{option.count}</p>}
              </ListboxOption>
            </Fragment>
          ))
        )}
      </ListboxOptions>
    </Listbox>
  );
};

export default Select;
