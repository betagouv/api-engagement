import { usePlausible } from "next-plausible";
import { useEffect, useRef, useState } from "react";
import { RiArrowDownSLine, RiCheckFill } from "react-icons/ri";

import useStore from "../utils/store";

const DURATION_OPTIONS = [
  { label: "6 mois", value: 6 },
  { label: "7 mois", value: 7 },
  { label: "8 mois", value: 8 },
  { label: "9 mois", value: 9 },
  { label: "10 mois", value: 10 },
  { label: "11 mois", value: 11 },
  { label: "12 mois", value: 12 },
];

const DurationFilter = ({ selected, onChange, position = "left-0", width = "w-80" }) => {
  const { url, color } = useStore();
  const plausible = usePlausible();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(e.key === "ArrowUp" ? DURATION_OPTIONS.length - 1 : 0);
      }
      return;
    }

    // Navigation when dropdown is open
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => {
          // Only navigate through DURATION_OPTIONS, not the reset button
          const maxIndex = DURATION_OPTIONS.length - 1;
          return prev < maxIndex ? prev + 1 : 0;
        });
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => {
          const maxIndex = DURATION_OPTIONS.length - 1;
          return prev > 0 ? prev - 1 : maxIndex;
        });
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusedIndex >= 0 && DURATION_OPTIONS[focusedIndex]) {
          // Duration option selected
          const item = DURATION_OPTIONS[focusedIndex];
          onChange(item);
          setIsOpen(false);
          setFocusedIndex(-1);
          plausible(`Filter duration selected`, { props: { filter: item.label }, u: url });
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  return (
    <div className="relative w-full min-w-[6rem]" ref={ref}>
      <label htmlFor="duration" className="sr-only">
        Durée
      </label>
      <button
        id="duration"
        aria-label="durée"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-activedescendant={focusedIndex >= 0 ? `duration-option-${focusedIndex}` : undefined}
        onKeyDown={handleKeyDown}
        className={`w-full cursor-pointer rounded-t-md h-[40px] bg-[#EEE] border-b-2 border-[#3A3A3A] p-3 focus:outline-none focus-visible:ring focus-visible:ring-blue-800 flex items-center justify-between ${
          !selected ? "text-[#666666]" : "text-[#161616]"
        }`}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setFocusedIndex(0);
          } else {
            setFocusedIndex(-1);
          }
        }}
      >
        <span className="pr-3 truncate max-w-60">{selected ? selected.label : "Durée"}</span>
        {isOpen ? <RiArrowDownSLine className="text-xl transform rotate-180" /> : <RiArrowDownSLine className="text-xl" />}
      </button>

      <div className={`absolute ${position} mt-1 z-50 ${width} border border-[#DDDDDD] bg-white shadow-md ${isOpen ? "block" : "hidden"}`}>
        <ul className="p-6 w-full overflow-auto" role="listbox" aria-label="Durée maximale de la mission">
          <div className="mb-4">
            <label className="text-base font-bold">Durée maximale de la mission</label>
          </div>
          {DURATION_OPTIONS.map((item, index) => {
            return (
              <li
                key={index}
                id={`duration-option-${index}`}
                role="option"
                aria-selected={selected?.value === item.value}
                className={`w-full flex items-center text-sm px-4 py-2 cursor-pointer ${index === focusedIndex ? "bg-[#0000000A]" : "hover:bg-[#0000000A]"}`}
                onClick={() => {
                  onChange(item);
                  setIsOpen(false);
                  setFocusedIndex(-1);
                  plausible(`Filter duration selected`, { props: { filter: item.label }, u: url });
                }}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                <p className="text-sm">{item.label}</p>
                {selected?.value === item.value && <RiCheckFill style={{ color }} className="ml-2" />}
              </li>
            );
          })}
        </ul>
        <div className="p-4 w-full border-t border-[#DDDDDD]">
          <button
            className="text-sm cursor-pointer px-2"
            style={{ color: color ? color : "" }}
            onClick={() => {
              onChange(null);
              setIsOpen(false);
              setFocusedIndex(-1);
              plausible("Filter duration erased", { u: url });
            }}
          >
            Réinitialiser
          </button>
        </div>
      </div>
    </div>
  );
};

export default DurationFilter;
