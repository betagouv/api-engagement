import { ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions, Combobox as HLCombobox } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";

import { RiArrowDownSLine, RiCheckFill } from "react-icons/ri";
import Loader from "./Loader";

const Combobox = ({
  value,
  onSelect,
  placeholder,
  className,
  id,
  options = null,
  debounce = 300,
  onSearch = null,
  onChange = null,
  by = "value",
  getLabel = (o) => (o ? o.label : ""),
}) => {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filteredOptions, setFilteredOptions] = useState(options || []);
  const selectedIndex = filteredOptions.findIndex((o) => o[by] === value);
  const selected = selectedIndex !== -1 ? filteredOptions[selectedIndex] : null;

  useEffect(() => {
    if (!options) return;
    setFilteredOptions(options);
  }, [options]);

  useEffect(() => {
    if (onChange) {
      onChange(search);
    }
    if (onSearch) {
      const timeout = setTimeout(async () => {
        setLoading(true);
        const res = await onSearch(search);
        if (res) {
          setFilteredOptions(res);
        }
        setLoading(false);
      }, debounce);
      return () => clearTimeout(timeout);
    } else {
      setFilteredOptions(options.filter((o) => getLabel(o).toLowerCase().includes(search.toLowerCase())));
    }
  }, [search]);

  return (
    <HLCombobox as="div" className="relative w-full" value={selected} onChange={(e) => (e ? onSelect(e) : null)} by={by}>
      <div className="relative w-full">
        <ComboboxInput
          id={id || "autocomplete"}
          name="autocomplete"
          className="input w-full"
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          displayValue={(option) => getLabel(option) || search || ""}
          aria-label={placeholder}
          aria-owns={`${id}-options`}
          aria-activedescendant={selectedIndex !== -1 ? `${id}-option-${selectedIndex}` : undefined}
        />
        <ComboboxButton className="absolute inset-y-2 right-0 flex items-center pr-4" aria-label="Ouvrir les options">
          {({ open }) => <RiArrowDownSLine className={`text-lg ${open ? "rotate-180 transform" : ""}`} />}
        </ComboboxButton>
      </div>

      <ComboboxOptions
        id={`${id}-options`}
        anchor="bottom start"
        transition
        className={`mt-1 max-h-80 w-(--input-width) origin-top overflow-y-auto bg-white shadow-lg transition duration-200 ease-out empty:invisible data-closed:scale-95 data-closed:opacity-0 ${className}`}
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
                id={`${id}-option-${i}`}
                value={option}
                className={({ focus }) =>
                  `group flex cursor-default list-none items-center justify-between gap-4 px-4 py-3 text-sm select-none ${
                    focus ? "text-blue-france bg-gray-100" : "bg-white text-black"
                  }`
                }
              >
                <RiCheckFill className="invisible text-sm group-data-selected:visible" />
                <p className="flex-1 truncate">{option.label}</p>
                {option.doc_count && <span>{option.doc_count}</span>}
              </ComboboxOption>
            </Fragment>
          ))
        )}
      </ComboboxOptions>
    </HLCombobox>
  );
};

export default Combobox;
