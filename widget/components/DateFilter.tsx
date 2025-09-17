import { fr } from "date-fns/locale/fr";
import { usePlausible } from "next-plausible";
import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { RiArrowDownSLine } from "react-icons/ri";

import "react-day-picker/dist/style.css";
import useStore from "../utils/store";

interface DateFilterProps {
  selected: { label: string; value: Date } | null;
  onChange: (date: { label: string; value: Date } | null) => void;
  position?: string;
  width?: string;
}

const DateFilter = ({ selected, onChange, position = "left-0", width = "w-80" }: DateFilterProps) => {
  const { url, color } = useStore();
  const plausible = usePlausible();
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full min-w-[6rem]" ref={ref}>
      <label htmlFor="date" className="sr-only">
        Date
      </label>
      <button
        id="date"
        aria-label="date"
        className={`w-full cursor-pointer rounded-t-md bg-[#EEE] h-[40px] border-b-2 border-[#3A3A3A] p-3 focus:outline-none focus-visible:ring focus-visible:ring-[#000091] flex items-center justify-between ${
          !selected ? "text-[#666666]" : "text-[#161616]"
        }`}
        onClick={() => setShow(!show)}
      >
        <span className="pr-3 truncate max-w-60">{selected ? selected.label : "Date"}</span>
        {show ? <RiArrowDownSLine className="text-xl transform rotate-180" /> : <RiArrowDownSLine className="text-xl" />}
      </button>

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Calendrier de disponibilité"
        className={`absolute ${position} mt-1 z-50 ${width} min-w-[384px] p-6 border border-gray-900 bg-white shadow-md ${show ? "block" : "hidden"}`}
      >
        <div className="border-b border-gray-900 pb-4">
          <p>Je suis disponible à partir du</p>
        </div>
        <div className="mt-4 flex items-center justify-center">
          <DayPicker
            mode="single"
            locale={fr}
            aria-label="disponible à partir du"
            role="dialog"
            selected={selected?.value}
            onDayClick={(date) => {
              if (date) {
                onChange({ label: date.toLocaleDateString("fr"), value: date });
                setShow(false);
                plausible("Date selected", { props: { date: date.toLocaleDateString("fr") }, u: url || undefined });
              }
            }}
            style={
              {
                "--rdp-accent-color": color,
                "--rdp-day_button-width": "48px",
                "--rdp-day_button-height": "48px",
              } as React.CSSProperties
            }
            modifiers={{
              selected: (date) => !!selected && date.toLocaleDateString("fr") === selected.value.toLocaleDateString("fr"),
            }}
            autoFocus
            modifiersStyles={{
              today: {
                backgroundColor: "transparent",
                color: "black",
                textDecoration: "underline",
              },
              selected: {
                backgroundColor: color,
                color: "white",
                fontWeight: "normal",
                borderRadius: "9999px",
                textAlign: "center",
              },
            }}
            labels={{
              labelDayButton: (date, { today, selected }) => {
                return `${today ? "Aujourd'hui, " : ""}${date.toLocaleDateString("fr", { weekday: "long", day: "numeric", month: "long" })}${selected ? ", sélectionné" : ""}`;
              },
              labelNext: () => "Mois suivant",
              labelPrevious: () => "Mois précédent",
            }}
          />
        </div>
        <div className="p-4 w-full border-t border-gray-900">
          <button
            className="text-sm cursor-pointer"
            style={{ color: color ? color : "" }}
            onClick={() => {
              onChange(null);
              setShow(false);
              plausible("Date erased", { u: url || undefined });
            }}
          >
            Réinitialiser
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateFilter;
