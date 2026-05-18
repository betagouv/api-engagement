import fr from "date-fns/locale/fr";
import { useEffect, useId, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { RiArrowLeftSLine, RiArrowRightSLine, RiCalendarLine, RiInformationLine } from "react-icons/ri";

const NOW = new Date();
const YESTERDAY = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 1);

const RANGES = [
  { label: "7 jours", from: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 7), to: YESTERDAY },
  { label: "30 jours", from: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 30), to: YESTERDAY },
  { label: "6 mois", from: new Date(NOW.getFullYear(), NOW.getMonth() - 6, NOW.getDate()), to: YESTERDAY },
  { label: "12 mois", from: new Date(NOW.getFullYear() - 1, NOW.getMonth(), NOW.getDate()), to: YESTERDAY },
  { label: "Total", from: new Date(2020, 0, 1), to: YESTERDAY },
];

function parseDateFr(str) {
  const match = str.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const day = Number(d),
    month = Number(m),
    year = Number(y);
  const date = new Date(year, month - 1, day);
  if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) return null;
  return date;
}

function formatDateFr(date) {
  if (!date) return "";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function toEndOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, -1);
}

const DateRangePicker = ({ value, onChange }) => {
  const radioRefs = useRef([]);
  const selectedIndex = RANGES.findIndex((r) => r.from.toLocaleDateString() === value.from.toLocaleDateString());

  const handleKeyDown = (e, index) => {
    let newIndex;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      newIndex = (index + 1) % RANGES.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      newIndex = (index - 1 + RANGES.length) % RANGES.length;
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(RANGES[index]);
      return;
    } else {
      return;
    }
    radioRefs.current[newIndex]?.focus();
  };

  return (
    <div className="flex flex-wrap gap-4 sm:items-center">
      <fieldset className="m-0 border-0 p-0">
        <legend className="sr-only">Période</legend>
        <div className="border-grey-border flex flex-col items-stretch gap-2 rounded-sm border sm:w-fit sm:flex-row sm:items-center sm:gap-x-2" role="radiogroup">
          {RANGES.map((range, i) => {
            const isSelected = selectedIndex === i;
            return (
              <div
                key={i}
                ref={(el) => (radioRefs.current[i] = el)}
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected || (selectedIndex === -1 && i === 0) ? 0 : -1}
                className={`focus cursor-pointer rounded-sm px-4 py-2 text-sm whitespace-nowrap ${isSelected ? "border-blue-france text-blue-france -my-px border" : ""} hover:bg-gray-100`}
                onClick={() => onChange(range)}
                onKeyDown={(e) => handleKeyDown(e, i)}
              >
                {range.label}
              </div>
            );
          })}
        </div>
      </fieldset>

      <DateInput value={value} onChange={onChange} />
    </div>
  );
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
};

export const DateInput = ({ value, onChange }) => {
  const id = useId();
  const isMobile = useIsMobile();
  const [from, setFrom] = useState(value.from);
  const [to, setTo] = useState(value.to);
  const [fromText, setFromText] = useState(formatDateFr(value.from));
  const [toText, setToText] = useState(formatDateFr(value.to));
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && show) {
        setShow(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [show]);

  useEffect(() => {
    if (value.from === from && value.to === to) return;
    setFrom(value.from);
    setTo(value.to);
    setFromText(formatDateFr(value.from));
    setToText(formatDateFr(value.to));
  }, [value]);

  const handleCalendarChange = (dates) => {
    const [start, end] = dates;
    setFrom(start);
    setTo(end);
    setFromText(formatDateFr(start));
    setToText(end ? formatDateFr(end) : "");
    if (start && end) {
      onChange({ from: start, to: toEndOfDay(end) });
      setShow(false);
      buttonRef.current?.focus();
    }
  };

  const handleFromTextChange = (e) => {
    const text = e.target.value;
    setFromText(text);
    const parsed = parseDateFr(text);
    if (parsed) {
      setFrom(parsed);
      if (to) onChange({ from: parsed, to: toEndOfDay(to) });
    }
  };

  const handleToTextChange = (e) => {
    const text = e.target.value;
    setToText(text);
    const parsed = parseDateFr(text);
    if (parsed) {
      setTo(parsed);
      if (from) onChange({ from, to: toEndOfDay(parsed) });
    }
  };

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-2">
        <div className="input flex items-center gap-1 px-2 py-1">
          <label htmlFor={`${id}-from`} className="text-sm text-gray-500">
            Du
          </label>
          <input
            id={`${id}-from`}
            type="text"
            inputMode="numeric"
            value={fromText}
            onChange={handleFromTextChange}
            placeholder="JJ/MM/AAAA"
            aria-describedby={`${id}-format`}
            className="w-24 border-0 bg-transparent p-0 text-sm font-semibold outline-none focus:ring-0"
          />
        </div>
        <div className="input flex items-center gap-1 px-2 py-1">
          <label htmlFor={`${id}-to`} className="text-sm text-gray-500">
            Au
          </label>
          <input
            id={`${id}-to`}
            type="text"
            inputMode="numeric"
            value={toText}
            onChange={handleToTextChange}
            placeholder="JJ/MM/AAAA"
            aria-describedby={`${id}-format`}
            className="w-24 border-0 bg-transparent p-0 text-sm font-semibold outline-none focus:ring-0"
          />
        </div>
        <span id={`${id}-format`} className="sr-only">
          Format attendu : JJ/MM/AAAA
        </span>
        <button
          ref={buttonRef}
          className="focus flex items-center rounded-sm p-2 hover:bg-gray-100"
          aria-label="Ouvrir le calendrier"
          aria-expanded={show}
          onClick={() => setShow(!show)}
        >
          <RiCalendarLine className="text-lg" aria-hidden="true" />
        </button>
      </div>

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sélection de période"
        className={`border-grey-border fixed inset-0 z-50 overflow-y-auto border bg-white px-4 pt-4 pb-4 shadow-lg sm:absolute sm:inset-auto sm:right-0 sm:mt-1 sm:overflow-visible sm:px-8 sm:pt-6 ${show ? "block" : "hidden"}`}
      >
        <div className="mb-4 flex justify-end sm:hidden">
          <button
            type="button"
            className="tertiary-btn"
            onClick={() => {
              setShow(false);
              buttonRef.current?.focus();
            }}
            aria-label="Fermer le calendrier"
          >
            Fermer
          </button>
        </div>
        <div className="flex flex-col gap-6 sm:flex-row">
          <ul className="m-0 flex list-none flex-col p-0 text-base sm:w-44" role="list" aria-label="Périodes disponibles">
            <li>
              <button
                className="hover:bg-gray-975 w-full cursor-pointer p-3 text-left text-base"
                onClick={() => handleCalendarChange([new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 7), YESTERDAY])}
              >
                Depuis 7 jours
              </button>
            </li>
            <li>
              <button
                className="hover:bg-gray-975 w-full cursor-pointer p-3 text-left text-base"
                onClick={() => handleCalendarChange([new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 30), YESTERDAY])}
              >
                Depuis 30 jours
              </button>
            </li>
            <li>
              <button
                className="hover:bg-gray-975 w-full cursor-pointer p-3 text-left text-base"
                onClick={() => handleCalendarChange([new Date(NOW.getFullYear() - 1, NOW.getMonth(), NOW.getDate()), YESTERDAY])}
              >
                Depuis 1 an
              </button>
            </li>
            <li>
              <button className="hover:bg-gray-975 w-full cursor-pointer p-3 text-left text-base" onClick={() => handleCalendarChange([new Date(2020, 0, 1), YESTERDAY])}>
                Depuis toujours
              </button>
            </li>
            <li>
              <button
                className="hover:bg-gray-975 w-full cursor-pointer p-3 text-left text-base"
                onClick={() => handleCalendarChange([new Date(NOW.getFullYear(), NOW.getMonth(), 1), YESTERDAY])}
              >
                Ce mois-ci
              </button>
            </li>
            <li>
              <button
                className="hover:bg-gray-975 w-full cursor-pointer p-3 text-left text-base"
                onClick={() => handleCalendarChange([new Date(NOW.getFullYear(), NOW.getMonth() - 1, 1), new Date(NOW.getFullYear(), NOW.getMonth(), 1, 0, 0, 0, -1)])}
              >
                Le mois dernier
              </button>
            </li>
            <li>
              <button
                className="hover:bg-gray-975 w-full cursor-pointer p-3 text-left text-base"
                onClick={() => handleCalendarChange([new Date(NOW.getFullYear(), 0, 1), YESTERDAY])}
              >
                Cette année
              </button>
            </li>
            <li>
              <button
                className="hover:bg-gray-975 w-full cursor-pointer p-3 text-left text-base"
                onClick={() => handleCalendarChange([new Date(NOW.getFullYear() - 1, 0, 1), new Date(NOW.getFullYear(), 0, 1, 0, 0, 0, -1)])}
              >
                L&apos;année dernière
              </button>
            </li>
          </ul>

          <AccessibleCalendar>
            <DatePicker
              renderCustomHeader={(props) => <DatePickerHeader {...props} isMobile={isMobile} />}
              onChange={handleCalendarChange}
              startDate={from}
              endDate={to}
              maxDate={YESTERDAY}
              locale={fr}
              selectsRange
              inline
              monthsShown={isMobile ? 1 : 2}
              calendarContainer={DatePickerContainer}
              ariaLabelPrefix="Choisir"
            />
          </AccessibleCalendar>
        </div>
        <p className="text-grey-text flex items-center gap-1 pt-4 text-sm">
          <RiInformationLine className="shrink-0" aria-hidden="true" />
          Les données du jour en cours ne sont pas encore disponibles.
        </p>
      </div>
    </div>
  );
};

const AccessibleCalendar = ({ children }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.querySelectorAll('[aria-current="date"]').forEach((el) => el.removeAttribute("aria-current"));
    const today = ref.current.querySelector(".react-datepicker__day--today");
    if (today) today.setAttribute("aria-current", "date");
  });
  return <div ref={ref}>{children}</div>;
};

const DatePickerContainer = ({ children }) => (
  <div className="flex gap-4">
    <div className="flex items-start">{children}</div>
  </div>
);

const DatePickerHeader = ({ monthDate, customHeaderCount, decreaseMonth, increaseMonth, isMobile }) => (
  <div className="flex items-center justify-between gap-8 pb-4">
    <button aria-label="Mois précédent" className="hover:bg-gray-975" style={!isMobile && customHeaderCount === 1 ? { visibility: "hidden" } : null} onClick={decreaseMonth}>
      <RiArrowLeftSLine className="text-blue-france text-[32px]" aria-hidden="true" />
    </button>
    <span className="text-base font-bold">
      {monthDate.toLocaleString("fr-Fr", {
        month: "long",
        year: "numeric",
      })}
    </span>
    <button aria-label="Mois suivant" className="hover:bg-gray-975" style={!isMobile && customHeaderCount === 0 ? { visibility: "hidden" } : null} onClick={increaseMonth}>
      <RiArrowRightSLine className="text-blue-france text-[32px]" aria-hidden="true" />
    </button>
  </div>
);

export default DateRangePicker;
