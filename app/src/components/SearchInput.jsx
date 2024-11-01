import { useEffect, useState } from "react";

import MagnifyIconSvg from "../assets/svg/magnify-icon.svg";

const SearchInput = ({ value, onChange, className, ...props }) => {
  const [input, setInput] = useState(value);

  useEffect(() => {
    setInput(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      onChange(input);
    }, 400);
    return () => clearTimeout(handler);
  }, [input]);

  return (
    <div className={`relative ${className || "w-full"}`}>
      <input {...props} className="input w-full" value={input} onChange={(e) => setInput(e.target.value)} />
      <img src={MagnifyIconSvg} className="absolute top-1/2 right-4 transform -translate-y-1/2" />
    </div>
  );
};

export default SearchInput;
