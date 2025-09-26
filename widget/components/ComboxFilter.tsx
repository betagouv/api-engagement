import { usePlausible } from "next-plausible";
import { useEffect, useRef, useState } from "react";
import { RiArrowDownSLine, RiCheckFill, RiSearchLine } from "react-icons/ri";

import useStore from "@/utils/store";
import { FilterOption } from "../types";

interface ComboboxFilterProps {
  options: FilterOption[];
  values: FilterOption[];
  onChange: (values: FilterOption[]) => void;
  id: string;
  placeholder?: string;
  position?: string;
  className?: string;
  searchable?: boolean;
}

const ComboboxFilter = ({
  options,
  values,
  onChange,
  id,
  placeholder = "Choissiez une option",
  position = "left-0",
  className = "w-80",
  searchable = false,
}: ComboboxFilterProps) => {
  const { url, color } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const [listRef, setListRef] = useState<(HTMLLIElement | undefined)[]>(options.map(() => undefined));
  const plausible = usePlausible();
  const [show, setShow] = useState(false);
  const [selection, setSelection] = useState<FilterOption[]>(values);
  const [search, setSearch] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    setListRef(options.map(() => undefined));
  }, [options]);

  useEffect(() => {
    setSelection(values);
  }, [values]);

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
    let newSelection = [];
    if (selection.some((o) => o.value === option.value)) {
      newSelection = selection.filter((o) => o.value !== option.value);
    } else {
      newSelection = [...selection, option];
    }
    onChange(newSelection);
  };

  const handleButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!show) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setShow(true);
        setFocusedIndex(0);
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
        className={`select relative truncate text-left ${!values || values.length === 0 ? "!text-[#666666]" : ""}`}
        onClick={() => setShow(!show)}
        onKeyDown={handleButtonKeyDown}
      >
        {!values || values.some((o) => o === undefined) ? placeholder : values.length > 0 ? `${values[0].label}${values.length > 1 ? ` +${values.length - 1}` : ""}` : placeholder}

        {show ? (
          <RiArrowDownSLine className="text-base transform rotate-180 absolute right-4 top-1/2 -translate-y-1/2" />
        ) : (
          <RiArrowDownSLine className="text-base absolute right-4 top-1/2 -translate-y-1/2" />
        )}
      </button>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className={`absolute ${position} mt-1 z-50 ${className} border border-[#DDDDDD] bg-white py-4 shadow-md ${show ? "block" : "hidden"}`}
      >
        {searchable && (
          <div className="relative mx-4">
            <input
              ref={inputRef}
              aria-label={`Rechercher dans ${placeholder.toLowerCase()}`}
              role="searchbox"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className="input mb-4"
            />
            <RiSearchLine className="text-black text-base absolute right-4 top-1/2 -translate-y-1/2" />
          </div>
        )}

        <p className="text-base mx-4 mb-2">{placeholder}</p>
        <ul id={`${id}-list`} className="max-h-60 overflow-auto w-full py-2" tabIndex={-1} role="listbox" aria-multiselectable="true">
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
                    className="mx-4 flex items-center justify-between gap-2 text-sm px-4 py-2 cursor-pointer hover:bg-[#0000000A] focus:outline-2 focus:outline-[#0a76f6] focus:outline-offset-2 focus-visible:bg-[#0000000A]"
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

export default ComboboxFilter;
