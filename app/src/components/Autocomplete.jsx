import { useEffect, useId, useRef, useState } from "react";

import Loader from "./Loader";

const Autocomplete = ({ options, value, onChange, onSelect, loading = false, placeholder, className, id }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [listRef, setListRef] = useState(options.map(() => undefined));
  const generatedId = useId();
  const inputId = id || `autocomplete-${generatedId}`;
  const listboxId = `${inputId}-listbox`;

  useEffect(() => {
    setListRef(options.map(() => undefined));
    setFocusedIndex(-1);
  }, [options]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputKeyDown = (e) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setIsOpen(true);
      const index = e.key === "ArrowDown" ? 0 : options.length - 1;
      setFocusedIndex(index);
      requestAnimationFrame(() => listRef[index]?.focus());
      return;
    }

    if (!isOpen) {
      return;
    }

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const newIndex = focusedIndex < options.length - 1 ? focusedIndex + 1 : 0;
        setFocusedIndex(newIndex);
        listRef[newIndex]?.focus();
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const newIndex = focusedIndex > 0 ? focusedIndex - 1 : options.length - 1;
        setFocusedIndex(newIndex);
        listRef[newIndex]?.focus();
        break;
      }
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          onSelect(options[focusedIndex]);
          setIsOpen(false);
          setFocusedIndex(-1);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      case "Tab":
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      default:
        break;
    }
  };

  const handleListKeyDown = (e, option, index) => {
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const newIndex = index < options.length - 1 ? index + 1 : 0;
        setFocusedIndex(newIndex);
        listRef[newIndex]?.focus();
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const newIndex = index > 0 ? index - 1 : options.length - 1;
        setFocusedIndex(newIndex);
        listRef[newIndex]?.focus();
        break;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        onSelect(option);
        setIsOpen(false);
        setFocusedIndex(-1);
        inputRef.current?.focus();
        break;
      }
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        inputRef.current?.focus();
        break;
      case "Tab":
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      case "Home": {
        e.preventDefault();
        setFocusedIndex(0);
        listRef[0]?.focus();
        break;
      }
      case "End": {
        e.preventDefault();
        const last = options.length - 1;
        setFocusedIndex(last);
        listRef[last]?.focus();
        break;
      }
      default:
        break;
    }
  };

  const visibleCount = loading ? 0 : options.length;

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative w-full">
        <label htmlFor={inputId} className="sr-only">
          {placeholder}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          name={inputId}
          className="input w-full pr-10"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={focusedIndex >= 0 ? `${inputId}-option-${focusedIndex}` : undefined}
          onChange={(e) => {
            setIsOpen(true);
            onChange(e.target.value);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          value={value || ""}
        />
      </div>

      <ul
        id={listboxId}
        role="listbox"
        aria-label={placeholder}
        className={`absolute top-10 z-10 max-h-80 w-full overflow-y-auto bg-white shadow-lg transition duration-100 ease-in ${className || "w-full"} ${isOpen ? "" : "hidden"}`}
      >
        {isOpen &&
          (loading ? (
            <li role="option" aria-selected={false} className="flex cursor-default items-center justify-center px-4 py-2">
              <Loader />
              <span className="sr-only">Chargement des résultats</span>
            </li>
          ) : (
            options.map((option, i) => (
              <li
                ref={(el) => {
                  listRef[i] = el || undefined;
                }}
                key={i}
                id={`${inputId}-option-${i}`}
                role="option"
                aria-selected={i === focusedIndex}
                tabIndex={i === focusedIndex ? 0 : -1}
                className="flex list-item"
                onClick={() => {
                  onSelect(option);
                  setIsOpen(false);
                  setFocusedIndex(-1);
                  inputRef.current?.focus();
                }}
                onKeyDown={(e) => handleListKeyDown(e, option, i)}
              >
                <p className="flex-1 truncate">{option.label}</p>
                {option.doc_count && <span>{option.doc_count}</span>}
              </li>
            ))
          ))}
      </ul>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isOpen && !loading && visibleCount > 0 && `${visibleCount} résultat${visibleCount > 1 ? "s" : ""} disponible${visibleCount > 1 ? "s" : ""}`}
        {isOpen && !loading && visibleCount === 0 && "Aucun résultat"}
      </div>
    </div>
  );
};

export default Autocomplete;
