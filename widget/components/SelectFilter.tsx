import { usePlausible } from "next-plausible";
import { useEffect, useRef, useState } from "react";
import { RiArrowDownSLine, RiCheckFill, RiSearchLine } from "react-icons/ri";

import { FilterOption } from "../types";
import useStore from "../utils/store";

interface SelectFilterProps {
  options: FilterOption[];
  selectedOptions: FilterOption[];
  onChange: (options: FilterOption[]) => void;
  id: string;
  placeholder?: string;
  position?: string;
  width?: string;
  searchable?: boolean;
}

const SelectFilter = ({
  options,
  selectedOptions,
  onChange,
  id,
  placeholder = "Choissiez une option",
  position = "left-0",
  width = "w-80",
  searchable = false,
}: SelectFilterProps) => {
  const { url, color } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const [listRef, setListRef] = useState<(HTMLLIElement | undefined)[]>(options.map(() => undefined));
  const plausible = usePlausible();
  const [show, setShow] = useState(false);
  const [selection, setSelection] = useState<FilterOption[]>(selectedOptions);
  const [search, setSearch] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    setListRef(options.map(() => undefined));
  }, [options]);

  useEffect(() => {
    setSelection(selectedOptions);
  }, [selectedOptions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = (option: FilterOption) => {
    if (!selection) {
      return setSelection([option]);
    }
    if (selection.some((o) => o.value === option.value)) {
      setSelection(selection.filter((o) => o.value !== option.value));
    } else {
      setSelection([...selection, option]);
    }
  };

  const handleButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!show) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setShow(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setShow(false);
    }
  };

  const handleListKeyDown = (e: React.KeyboardEvent<HTMLLIElement>, item: FilterOption) => {
    switch (e.key) {
      case "Tab":
        if (e.shiftKey) {
          if (inputRef && inputRef.current) {
            e.preventDefault();
            inputRef.current.focus();
          }
        } else {
          e.preventDefault();
          resetButtonRef.current?.focus();
        }
        break;
      case " ":
      case "Space":
      case "Enter": {
        e.preventDefault();
        handleToggle(item);
        plausible(`Filter ${id} selected`, { props: { filter: item.label }, u: url || undefined });
        break;
      }
      case "Up":
      case "ArrowUp": {
        e.preventDefault();
        const newIndex = focusedIndex > 0 ? focusedIndex - 1 : options.length - 1;
        setFocusedIndex(newIndex);
        listRef[newIndex]?.focus();
        break;
      }
      case "Down":
      case "ArrowDown": {
        e.preventDefault();
        const newIndex = focusedIndex < options.length - 1 ? focusedIndex + 1 : 0;
        setFocusedIndex(newIndex);
        listRef[newIndex]?.focus();
        break;
      }
    }
  };

  return (
    <div className="relative w-full min-w-[6rem]" ref={ref}>
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <div aria-live="polite" className="sr-only">
        {(selection || []).length > 1 ? `${(selection || []).length} filtres sélectionnés` : `${(selection || []).length} filtre sélectionné`}
      </div>
      <button
        id={id}
        aria-label={placeholder}
        aria-expanded={show}
        className={`w-full rounded-t-md cursor-pointer bg-[#EEE] h-[40px] border-b-2 border-[#3A3A3A] p-3 focus:outline-none focus-visible:ring focus-visible:ring-[#000091] flex items-center justify-between ${
          !selectedOptions || selectedOptions.length === 0 ? "text-[#666666]" : "text-[#161616]"
        }`}
        onClick={() => setShow(!show)}
        onKeyDown={handleButtonKeyDown}
      >
        <span className="pr-3 truncate max-w-60">
          {!selectedOptions || selectedOptions.some((o) => o === undefined)
            ? placeholder
            : selectedOptions.length > 0
              ? `${selectedOptions[0].label}${selectedOptions.length > 1 ? ` +${selectedOptions.length - 1}` : ""}`
              : placeholder}
        </span>
        {show ? <RiArrowDownSLine className="text-xl transform rotate-180" /> : <RiArrowDownSLine className="text-xl" />}
      </button>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className={`absolute ${position} mt-1 z-50 ${width} border border-[#DDDDDD] bg-white shadow-md ${show ? "block" : "hidden"}`}
      >
        {searchable && (
          <div className="mx-4 mt-4 relative">
            <RiSearchLine className="text-[#3A3A3A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              aria-label={`Rechercher dans ${placeholder.toLowerCase()}`}
              role="searchbox"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className="w-full border border-gray-300 text-sm py-2 pl-8 pr-2 focus:outline-none"
            />
          </div>
        )}
        <ul id={`${id}-list`} className="p-4 w-full max-h-60 overflow-y-scroll" tabIndex={-1} role="listbox" aria-multiselectable="true">
          {options?.length === 0 ? (
            <li className="text-sm text-center py-2">Aucune option disponible</li>
          ) : (
            options
              .filter((option) => (searchable ? option.label.toLowerCase().includes(search.toLowerCase()) : true))
              .map((item, index) => {
                const selected = selection?.some((option) => option.value === item.value);
                return (
                  <li
                    ref={(el) => {
                      listRef[index] = el || undefined;
                    }}
                    key={item.value}
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-label={item.label}
                    aria-checked={selected}
                    tabIndex={index === focusedIndex ? 0 : -1}
                    className="w-full flex items-center justify-between gap-2 text-sm px-4 py-2 cursor-pointer hover:bg-[#0000000A] focus:outline-none focus-visible:ring focus-visible:ring-[#000091] focus-visible:bg-[#0000000A]"
                    onClick={() => {
                      handleToggle(item);
                      plausible(`Filter ${id} selected`, { props: { filter: item.label }, u: url || undefined });
                    }}
                    onKeyDown={(e) => handleListKeyDown(e, item)}
                  >
                    <div className="flex items-center w-[90%]">
                      <Checkbox selected={selected} color={color} />
                      <p className="ml-2 flex-1 text-sm truncate">{item.label}</p>
                    </div>
                    {item.count && <p className="text-sm text-right text-[#666666]">{item.count}</p>}
                  </li>
                );
              })
          )}
        </ul>
        <div className="p-4 w-full flex items-center justify-between border-t border-[#DDDDDD]">
          <button
            ref={resetButtonRef}
            className="text-sm cursor-pointer px-2 focus:outline-none focus-visible:ring focus-visible:ring-[#000091]"
            style={{ color: color ? color : "" }}
            onClick={() => {
              onChange([]);
              setShow(false);
              plausible(`Filter ${id} erased`, { u: url || undefined });
            }}
          >
            Réinitialiser
          </button>
          <button
            className={`text-sm px-3 h-8 flex items-center text-white focus:outline-none focus-visible:ring focus-visible:ring-[#000091] ${!selection || selection.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
            style={{
              backgroundColor: color ? color : "",
            }}
            disabled={!selection || selection.length === 0}
            onClick={() => {
              onChange(selection);
              setShow(false);
              plausible(`Filters applied`, { u: url || undefined });
            }}
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
};

interface CheckboxProps {
  selected: boolean;
  color: string;
}

const Checkbox = ({ selected, color }: CheckboxProps) => {
  return (
    <div
      className="w-4 h-4 rounded-sm border flex items-center justify-center text-base"
      style={{ borderColor: selected ? color : "black", backgroundColor: selected ? color : "transparent" }}
    >
      {selected && <RiCheckFill style={{ color: "white" }} />}
    </div>
  );
};

export default SelectFilter;
