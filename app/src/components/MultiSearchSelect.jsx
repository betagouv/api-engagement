import { Fragment, useState, useEffect } from "react";
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions, Transition } from "@headlessui/react";
import { RiArrowDownSLine, RiCheckLine, RiCloseFill } from "react-icons/ri";
import Loader from "./Loader";

const MultiSearchSelect = ({ options, value = [], onChange, placeholder, className, loading = false }) => {
  const [search, setSearch] = useState("");
  const selected = options.filter((option) => value.includes(option.value));

  const handleChange = (selectedOptions) => {
    const values = selectedOptions.map((opt) => opt.value);
    onChange({ value: values });
    setSearch("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange({ value: [] });
    setSearch("");
  };

  const filteredOptions = options.filter((option) =>
    search ? option.label.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <Combobox as="div" className="relative w-full" value={selected} onChange={handleChange} multiple>
      <div className="relative w-full">
        <ComboboxInput
          id="multi-search-select"
          name="multi-search-select"
          className={`input w-full ${selected.length ? "pr-16 placeholder:text-black" : "pr-8"}`}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={selected.length > 0 ? `${selected.length} sélections` : placeholder}
          displayValue={() => search}
          aria-label={placeholder}
        />

        {selected.length > 0 && (
          <button
            className="absolute top-1/2 right-10 -translate-y-1/2 transform"
            onClick={handleClear}
            aria-label="Effacer toutes les sélections"
            tabIndex={0}
          >
            <RiCloseFill className="text-lg" />
          </button>
        )}
        <Combobox.Button className="absolute inset-y-2 right-0 flex items-center pr-2" aria-label="Ouvrir les options">
          {({ open }) => <RiArrowDownSLine className={`text-sm ${open ? "rotate-180 transform" : ""}`} />}
        </Combobox.Button>
      </div>

      <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
        <ComboboxOptions
          className={`absolute top-10 z-10 max-h-80 w-full overflow-y-auto bg-white shadow-lg ${className || "w-full"}`}
        >
          {loading ? (
            <div className="flex cursor-default items-center justify-center px-4 py-2">
              <Loader />
            </div>
          ) : !filteredOptions.length ? (
            <div className="flex cursor-default items-center justify-center px-4 py-2">
              <p className="text-sm">Aucune option trouvée</p>
            </div>
          ) : (
            filteredOptions.map((option, i) => (
              <Fragment key={i}>
                {i !== 0 ? <div className="mx-4 h-px bg-gray-100" /> : null}
                <ComboboxOption
                  value={option}
                  className={({ focus, selected }) =>
                    `relative flex cursor-default list-none items-center justify-between gap-4 px-6 py-3 text-sm select-none ${
                      focus ? "bg-gray-100 text-blue-france" : "bg-white text-black"
                    }`
                  }
                >
                  {({ selected }) => (
                    <>
                      {selected && (
                        <RiCheckLine className="text-blue-france absolute top-1/2 left-1 -translate-y-1/2 text-sm" aria-hidden="true" />
                      )}
                      <p className="truncate text-sm whitespace-nowrap">{option.label}</p>
                      {option.count && <p className="text-sm">{option.count}</p>}
                    </>
                  )}
                </ComboboxOption>
              </Fragment>
            ))
          )}
        </ComboboxOptions>
      </Transition>
    </Combobox>
  );
};

export default MultiSearchSelect;
