import { useEffect, useState } from "react";

import MagnifyIconSvg from "../assets/svg/magnify-icon.svg";

const SearchInput = ({ value, onChange, className, placeholder, timeout = 400, ...props }) => {
  const [input, setInput] = useState(value);

  useEffect(() => {
    setInput(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      onChange(input);
    }, timeout);
    return () => clearTimeout(handler);
  }, [input]);

  return (
    <div role="search" className={`relative ${className || "w-full"}`}>
      <input {...props} className="input w-full" value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder} />
      <img src={MagnifyIconSvg} className="absolute top-1/2 right-4 -translate-y-1/2 transform" />
    </div>
  );
};

export default SearchInput;
