import { RiErrorWarningFill } from "react-icons/ri";

const LabelledTextarea = ({ id, label, error, hint, required = false, value, onChange, className, ...props }) => {
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
      <textarea
        id={id}
        className={`textarea ${error ? "border-b-error" : "border-b-black"} ${className}`}
        name={id}
        value={value}
        onChange={onChange}
        {...props}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {error && (
        <p id={errorId} className="text-error flex items-center text-sm" aria-live="polite">
          <RiErrorWarningFill className="mr-2" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
};

export default LabelledTextarea;
