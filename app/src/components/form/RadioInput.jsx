import { useRef, useState } from "react";

const RadioInput = ({ id, name, value, label, checked, onChange, className, size = 16 }) => {
  const ref = useRef();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`relative flex items-center gap-2 ${className}`}>
      <input
        ref={ref}
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="absolute h-full w-full opacity-0"
      />
      <div
        className={`border-blue-france flex items-center justify-center rounded-full border ${isFocused ? "ring-outline-blue ring-2 ring-offset-2" : ""}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {checked && <div className="bg-blue-france h-3/5 w-3/5 rounded-full" />}
      </div>
      <label htmlFor={id} className="flex-1 text-base text-black">
        {label}
      </label>
    </div>
  );
};

export default RadioInput;
