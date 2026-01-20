import { useEffect, useRef, useState } from "react";

const Dropdown = ({ renderTrigger, children, position = "bottom", align = "end", className = "min-w-40" }) => {
  const ref = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Position classes
  const positionClasses = {
    bottom: "top-full",
    top: "bottom-full",
    left: "right-full",
    right: "left-full",
  };

  // Alignment classes
  const alignClasses = {
    start: position === "bottom" || position === "top" ? "left-0" : "top-0",
    end: position === "bottom" || position === "top" ? "right-0" : "bottom-0",
    center: position === "bottom" || position === "top" ? "left-1/2 -translate-x-1/2" : "top-1/2 -translate-y-1/2",
  };

  // Spacing classes
  const spacingClasses = {
    bottom: "mt-2",
    top: "mb-2",
    left: "mr-2",
    right: "ml-2",
  };

  const handleTriggerClick = () => {
    setIsOpen(!isOpen);
  };

  // Transform origin based on position
  const transformOriginClasses = {
    bottom: "origin-top",
    top: "origin-bottom",
    left: "origin-right",
    right: "origin-left",
  };

  return (
    <div className="relative w-fit" ref={ref}>
      {renderTrigger({ onClick: handleTriggerClick })}
      <div
        className={`absolute ${positionClasses[position]} ${alignClasses[align]} ${spacingClasses[position]} ${transformOriginClasses[position]} z-10 overflow-y-auto bg-white shadow-lg transition-all duration-200 ease-out ${className} ${
          isOpen ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
        style={{
          visibility: isOpen ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default Dropdown;
