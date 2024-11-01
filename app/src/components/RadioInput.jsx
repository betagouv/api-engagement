import { useRef, useState } from "react";

const RadioInput = ({ id, name, value, label, checked, onChange }) => {
  const ref = useRef();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="flex items-center gap-2 relative">
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
        className="opacity-0 absolute w-4 h-4"
      />
      <div className={`w-4 h-4 border border-blue-dark rounded-full flex items-center justify-center ${isFocused ? "ring-offset-2 ring-2 ring-[#0a76f6]" : ""}`}>
        {checked && <div className="w-1.5 h-1.5 bg-blue-dark rounded-full"></div>}
      </div>
      <label htmlFor={id} className="flex-1 text-sm text-black">
        {label}
      </label>
    </div>
  );
};

export default RadioInput;
