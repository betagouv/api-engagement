import { FilterOption } from "@/types";

interface SelectFilterProps {
  options: FilterOption[];
  value: FilterOption | null;
  onChange: (option: FilterOption | null) => void;
  id: string;
  placeholder?: string;
  position?: string;
  className?: string;
}

const SelectFilter = ({ options, value, onChange, id, placeholder = "Choissiez une option", className = "w-80" }: SelectFilterProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (value?.value === e.target.value) {
      onChange(null);
      return;
    }
    const option = options.find((o) => o.value === e.target.value);
    onChange(option || null);
  };
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <select
        id={id}
        aria-label={placeholder}
        className={`select select-chevron ${className}`}
        value={value?.value ? String(value.value) : ""}
        onChange={handleChange}
        style={{ color: value?.value ? undefined : "#666" }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {(options || []).map((item, index) => (
          <option key={index} value={String(item.value)}>
            {item.label}
          </option>
        ))}
      </select>
    </>
  );
};

export default SelectFilter;
