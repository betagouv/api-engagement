import { RiErrorWarningFill } from "react-icons/ri";

const LabelledSelect = ({ id, label, options, placeholder = null, error, value, onChange, className, ...props }) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-sm" htmlFor={id}>
        {label}
      </label>
      <select id={id} className={`select ${error ? "border-b-error" : "border-b-black"} ${className}`} value={value} onChange={onChange} {...props}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <div className="text-error flex items-center text-sm">
          <RiErrorWarningFill className="mr-2" aria-hidden="true" />
          {error}
        </div>
      )}
    </div>
  );
};

export default LabelledSelect;
