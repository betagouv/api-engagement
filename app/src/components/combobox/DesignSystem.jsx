import { useEffect, useRef, useState } from "react";
import { RiArrowDownSLine, RiCheckFill, RiSearchLine } from "react-icons/ri";

const Combobox = ({
  options,
  values,
  onChange,
  onSearch,
  id,
  placeholder = "Choissiez une option",
  position = "left-0",
  className = "w-full",
  debounce = 300,
  loading = false,
  getLabel = (o) => o,
  getValue = (o) => o,
  getCount = null,
}) => {
  const ref = useRef(null);
  const inputRef = useRef(null);
  const [listRef, setListRef] = useState(options.map(() => undefined));
  const [show, setShow] = useState(false);
  const [selection, setSelection] = useState(values || []);
  const [search, setSearch] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    setListRef(options.map(() => undefined));
  }, [options]);

  useEffect(() => {
    setSelection(values || []);
  }, [values]);

  useEffect(() => {
    if (debounce > 0) {
      const timeout = setTimeout(async () => {
        onSearch(search);
      }, debounce);
      return () => clearTimeout(timeout);
    } else {
      onSearch(search);
    }
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = (option) => {
    let newSelection = [];
    if (selection.some((o) => getValue(o) === getValue(option))) {
      newSelection = selection.filter((o) => getValue(o) !== getValue(option));
    } else {
      newSelection = [...selection, option];
    }
    onChange(newSelection);
  };

  const handleButtonKeyDown = (e) => {
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

  const handleListKeyDown = (e, item) => {
    switch (e.key) {
      case "Tab":
        if (e.shiftKey) {
          if (inputRef && inputRef.current) {
            e.preventDefault();
            inputRef.current.focus();
          }
        } else {
          setShow(false);
        }
        break;
      case " ":
      case "Space":
      case "Enter": {
        e.preventDefault();
        handleToggle(item);
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
    <div className="relative w-full min-w-24" ref={ref}>
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
        className="select relative w-full truncate text-left"
        onClick={() => setShow(!show)}
        onKeyDown={handleButtonKeyDown}
      >
        {!values || values.some((o) => o === undefined)
          ? placeholder
          : values.length > 0
            ? `${getLabel(values[0])}${values.length > 1 ? ` +${values.length - 1}` : ""}`
            : placeholder}

        {show ? (
          <RiArrowDownSLine className="absolute top-1/2 right-4 -translate-y-1/2 rotate-180 transform text-base" aria-hidden="true" />
        ) : (
          <RiArrowDownSLine className="absolute top-1/2 right-4 -translate-y-1/2 text-base" aria-hidden="true" />
        )}
      </button>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className={`absolute ${position} z-50 mt-1 ${className} border-grey-border border bg-white py-4 shadow-md ${show ? "block" : "hidden"}`}
      >
        <div className="relative mx-4 mb-4">
          <input
            ref={inputRef}
            aria-label={`Rechercher dans ${placeholder.toLowerCase()}`}
            role="searchbox"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder}
            className="input w-full"
          />
          <RiSearchLine className="absolute top-1/2 right-4 -translate-y-1/2 text-base text-black" aria-hidden="true" />
        </div>

        <p className="mx-4 mb-2 text-base">{placeholder}</p>
        <ul id={`${id}-list`} className="max-h-60 w-full overflow-auto py-2" tabIndex={-1} role="listbox" aria-multiselectable="true">
          {options?.length === 0 ? (
            <li className="py-2 text-center text-sm">Aucune option disponible</li>
          ) : loading ? (
            <li className="py-2 text-center text-sm">Chargement des options...</li>
          ) : (
            options.map((item, index) => {
              const selected = selection?.some((option) => getValue(option) === getValue(item));
              return (
                <li
                  ref={(el) => {
                    listRef[index] = el || undefined;
                  }}
                  key={index}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-label={getLabel(item)}
                  aria-checked={selected}
                  tabIndex={index === focusedIndex ? 0 : -1}
                  className="list-item"
                  onClick={() => {
                    handleToggle(item);
                  }}
                  onKeyDown={(e) => handleListKeyDown(e, item)}
                >
                  <div className="flex items-center">
                    <div className="flex w-[90%] items-center">
                      <Checkbox selected={selected} />
                      <p className="ml-2 flex-1 truncate text-sm text-nowrap">{getLabel(item)}</p>
                    </div>
                    {getCount && <p className="text-text-mention text-right text-sm">{getCount(item)}</p>}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
};

const Checkbox = ({ selected }) => {
  return (
    <div
      className="flex h-4 w-4 items-center justify-center rounded-sm border text-base"
      style={{ borderColor: selected ? "var(--color-blue-france)" : "black", backgroundColor: selected ? "var(--color-blue-france)" : "transparent" }}
    >
      {selected && <RiCheckFill className="text-white" aria-hidden="true" />}
    </div>
  );
};

export default Combobox;
