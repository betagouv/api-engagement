import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import fr from "date-fns/locale/fr";
import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { RiArrowDownSLine, RiArrowLeftSLine, RiArrowRightSLine } from "react-icons/ri";

const NOW = new Date();
const YESTERDAY = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 1);

const RANGES = [
  { label: "7 jours", from: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 7), to: YESTERDAY },
  { label: "30 jours", from: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 30), to: YESTERDAY },
  { label: "6 mois", from: new Date(NOW.getFullYear(), NOW.getMonth() - 6, NOW.getDate()), to: YESTERDAY },
  { label: "12 mois", from: new Date(NOW.getFullYear() - 1, NOW.getMonth(), NOW.getDate()), to: YESTERDAY },
  { label: "Total", from: new Date(2020, 0, 1), to: YESTERDAY },
];

const DateRangePicker = ({ value, onChange }) => {
  return (
    <div className="flex gap-4">
      <div className="flex items-center border rounded-sm">
        {RANGES.map((range, i) => (
          <div
            key={i}
            className={`text-sm py-2 px-4 cursor-pointer 
                    ${value.from.toLocaleDateString() === range.from.toLocaleDateString() ? "border border-blue-france text-blue-france rounded-sm" : ""} 
                    hover:bg-gray-100`}
            onClick={() => onChange(range)}
          >
            {range.label}
          </div>
        ))}
      </div>

      <DateInput value={value} onChange={onChange} />
    </div>
  );
};

export const DateInput = ({ value, onChange }) => {
  const [from, setFrom] = useState(value.from);
  const [to, setTo] = useState(value.to);

  useEffect(() => {
    if (value.from === from && value.to === to) return;
    setFrom(value.from);
    setTo(value.to);
  }, [value]);

  const handleChange = (dates) => {
    const [start, end] = dates;
    setFrom(start);
    setTo(end);
    if (start && end) {
      onChange({ from: start, to: new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1, 0, 0, 0, -1) });
    }
  };

  return (
    <Popover className="relative">
      <PopoverButton className="select px-4 h-full flex items-center">
        <span>du</span>
        <span className="mx-3 font-semibold">{value.from ? value.from.toLocaleDateString("fr") : "-"}</span>
        <span>au</span>
        <span className="mx-3 font-semibold">{value.to ? value.to.toLocaleDateString("fr") : "-"}</span>
        <RiArrowDownSLine />
      </PopoverButton>
      <PopoverPanel
        transition
        anchor="bottom"
        className="origin-top mt-1 bg-white border p-10 border-gray-900 divide-y divide-gray-900 shadow-lg focus:outline-none transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0"
      >
        <div className="flex gap-6">
          <div className="flex w-44 flex-col gap-4 overflow-x-scroll text-base">
            <button
              className="w-full cursor-pointer px-3 py-1 hover:bg-gray-975 text-left text-base"
              onClick={() => handleChange([new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 7), YESTERDAY])}
            >
              Depuis 7 jours
            </button>
            <button
              className="w-full cursor-pointer px-3 py-1 hover:bg-gray-975 text-left text-base"
              onClick={() => handleChange([new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 30), YESTERDAY])}
            >
              Depuis 30 jours
            </button>
            <button
              className="w-full cursor-pointer px-3 py-1 hover:bg-gray-975 text-left text-base"
              onClick={() => handleChange([new Date(NOW.getFullYear() - 1, NOW.getMonth(), NOW.getDate()), YESTERDAY])}
            >
              Depuis 1 an
            </button>
            <button className="w-full cursor-pointer px-3 py-1 hover:bg-gray-975 text-left text-base" onClick={() => handleChange([new Date(2020, 0, 1), YESTERDAY])}>
              Depuis toujours
            </button>
            <button
              className="w-full cursor-pointer px-3 py-1 hover:bg-gray-975 text-left text-base"
              onClick={() => handleChange([new Date(NOW.getFullYear(), NOW.getMonth(), 1), YESTERDAY])}
            >
              Ce mois-ci
            </button>
            <button
              className="w-full cursor-pointer px-3 py-1 hover:bg-gray-975 text-left text-base"
              onClick={() => handleChange([new Date(NOW.getFullYear(), NOW.getMonth() - 1, 1), new Date(NOW.getFullYear(), NOW.getMonth(), 1, 0, 0, 0, -1)])}
            >
              Le mois dernier
            </button>
            <button className="w-full cursor-pointer px-3 py-1 hover:bg-gray-975 text-left text-base" onClick={() => handleChange([new Date(NOW.getFullYear(), 0, 1), YESTERDAY])}>
              Cette année
            </button>
            <button
              className="w-full cursor-pointer px-3 py-1 hover:bg-gray-975 text-left text-base"
              onClick={() => handleChange([new Date(NOW.getFullYear() - 1, 0, 1), new Date(NOW.getFullYear(), 0, 1, 0, 0, 0, -1)])}
            >
              L'année dernière
            </button>
          </div>

          <DatePicker
            renderCustomHeader={DatePickerHeader}
            onChange={handleChange}
            startDate={from}
            endDate={to}
            maxDate={NOW}
            locale={fr}
            selectsRange
            inline
            monthsShown={2}
            calendarContainer={DatePickerContainer}
          />
        </div>
      </PopoverPanel>
    </Popover>
  );
};

const DatePickerContainer = ({ children }) => (
  <div className="flex gap-4">
    <div className="flex items-start">{children}</div>
  </div>
);

const DatePickerHeader = ({ monthDate, customHeaderCount, decreaseMonth, increaseMonth }) => (
  <div className="flex items-center justify-between gap-8 pb-4">
    <button aria-label="Previous Month" className="hover:bg-gray-975" style={customHeaderCount === 1 ? { visibility: "hidden" } : null} onClick={decreaseMonth}>
      <RiArrowLeftSLine className="text-blue-france text-[32px]" />
    </button>
    <span className="text-base font-bold">
      {monthDate.toLocaleString("fr-Fr", {
        month: "long",
        year: "numeric",
      })}
    </span>
    <button aria-label="Next Month" className="hover:bg-gray-975" style={customHeaderCount === 0 ? { visibility: "hidden" } : null} onClick={increaseMonth}>
      <RiArrowRightSLine className="text-blue-france text-[32px]" />
    </button>
  </div>
);

export default DateRangePicker;
