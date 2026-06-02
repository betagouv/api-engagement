import { RiErrorWarningFill } from "react-icons/ri";

const LabelledSelect = ({ id, label, options, placeholder = null, error, hint, required = false, value, onChange, className, ...props }) => {
  const hintId = hint ? `${id}-hint` : null;
  const errorId = error ? `${id}-error` : null;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-sm" htmlFor={id}>
        {label}
        {required && (
          <span className="text-error ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {hint && (
        <p id={hintId} className="text-text-mention text-sm">
          {hint}
        </p>
      )}
      <select
        id={id}
        className={`select ${error ? "border-b-error" : "border-b-black"} ${className}`}
        value={value}
        onChange={onChange}
        {...props}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      >
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
        <p id={errorId} className="text-error flex items-center text-sm" aria-live="polite">
          <RiErrorWarningFill className="mr-2" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
};

export default LabelledSelect;
