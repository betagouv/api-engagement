import { fr } from "date-fns/locale/fr";
import { usePlausible } from "next-plausible";
import { useEffect, useRef, useState } from "react";
import ReactDatePicker from "react-datepicker";
import { RiArrowDownSLine, RiArrowLeftSLine, RiArrowRightSLine } from "react-icons/ri";

import "react-datepicker/dist/react-datepicker.css";
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
      <button id="date" aria-label="date" className={`select relative truncate text-left ${!selected ? "text-[#666666]" : "text-[#161616]"}`} onClick={() => setShow(!show)}>
        {selected ? selected.label : "Date"}
        {show ? (
          <RiArrowDownSLine className="text-base transform rotate-180 absolute right-4 top-1/2 -translate-y-1/2" />
        ) : (
          <RiArrowDownSLine className="text-base absolute right-4 top-1/2 -translate-y-1/2" />
        )}
      </button>

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Calendrier de disponibilité"
        className={`absolute ${position} mt-1 z-50 ${width} min-w-[384px] p-6 border border-[#DDDDDD] bg-white shadow-md ${show ? "block" : "hidden"}`}
        style={{ "--dp-accent-color": color, "--dp-accent-color-hover": `${color}30` } as React.CSSProperties}
      >
        <div className="border-b border-[#DDDDDD] pb-4">
          <p>Je suis disponible à partir du</p>
        </div>

        <div className="mt-4 flex items-center justify-center">
          <ReactDatePicker
            inline
            locale={fr}
            ariaLabelledBy="date"
            calendarContainer={CalendarContainer}
            renderCustomHeader={(props) => <CalendarHeader color={color} {...props} />}
            selected={selected?.value ?? null}
            dateFormat="ddd"
            chooseDayAriaLabelPrefix="Choisir le"
            disabledDayAriaLabelPrefix="Non disponible le"
            minDate={new Date()}
            onChange={(date) => {
              if (date instanceof Date && !isNaN(date.getTime())) {
                onChange({ label: date.toLocaleDateString("fr"), value: date });
                setShow(false);
                plausible("Date selected", { props: { date: date.toLocaleDateString("fr") }, u: url || undefined });
              }
            }}
          />
        </div>

        <div className="p-4 w-full border-t border-[#DDDDDD]">
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

const CalendarContainer = ({ children }: { children: React.ReactNode; className: string }) => {
  return <div className="bg-white flex-1 w-full">{children}</div>;
};

const CalendarHeader = ({
  date,
  color,
  decreaseMonth,
  increaseMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
}: {
  color: string;
  date: Date;
  decreaseMonth: () => void;
  increaseMonth: () => void;
  prevMonthButtonDisabled: boolean;
  nextMonthButtonDisabled: boolean;
}) => {
  return (
    <div className="p-4 flex items-center justify-between gap-4">
      <h2 className="text-base font-bold" aria-live="polite">
        {date.toLocaleString("fr-FR", {
          month: "long",
          year: "numeric",
        })}
      </h2>
      <div className="flex items-center">
        <button aria-label="Mois précédent" className="hover:bg-gray-975" style={prevMonthButtonDisabled ? { visibility: "hidden" } : undefined} onClick={decreaseMonth}>
          <RiArrowLeftSLine className="text-[32px]" style={{ color }} />
        </button>
        <button aria-label="Mois suivant" className="hover:bg-gray-975" style={nextMonthButtonDisabled ? { visibility: "hidden" } : undefined} onClick={increaseMonth}>
          <RiArrowRightSLine className="text-[32px]" style={{ color }} />
        </button>
      </div>
    </div>
  );
};

export default DateFilter;
