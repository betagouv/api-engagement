import { Fragment } from "react";
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions, Transition } from "@headlessui/react";
import { RiArrowDownSLine, RiCloseLine } from "react-icons/ri";
import Loader from "./Loader";

const Autocomplete = ({ options, value, onChange, onSelect, onClear, loading = false, placeholder, className, id }) => {
  const selected = options.find((opt) => opt.label === value) || null;

  const handleChange = (option) => {
    if (option) {
      onSelect(option);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    if (onClear) onClear();
  };

  return (
    <Combobox as="div" className="relative w-full" value={selected} onChange={handleChange}>
      <div className="relative w-full">
        <ComboboxInput
          id={id || "autocomplete"}
          name="autocomplete"
          className="input w-full"
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          displayValue={(option) => option?.label || value || ""}
          aria-label={placeholder}
        />
        {value && (
          <button
            type="button"
            className="absolute inset-y-2 right-10 flex items-center pr-2"
            onClick={handleClear}
            aria-label="Effacer"
            tabIndex={0}
          >
            <RiCloseLine className="text-sm" />
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
          ) : !options.length ? (
            <div className="flex cursor-default items-center justify-center px-4 py-2">
              <p className="text-sm">Aucune option trouvée</p>
            </div>
          ) : (
            options.map((option, i) => (
              <Fragment key={i}>
                {i !== 0 ? <div className="mx-4 h-px bg-gray-100" /> : null}
                <ComboboxOption
                  value={option}
                  className={({ focus }) =>
                    `relative flex cursor-default list-none items-center justify-between gap-4 px-4 py-3 text-sm select-none ${
                      focus ? "bg-gray-100 text-blue-france" : "bg-white text-black"
                    }`
                  }
                >
                  <p className="flex-1 truncate">{option.label}</p>
                  {option.doc_count && <span>{option.doc_count}</span>}
                </ComboboxOption>
              </Fragment>
            ))
          )}
        </ComboboxOptions>
      </Transition>
    </Combobox>
  );
};

export default Autocomplete;
