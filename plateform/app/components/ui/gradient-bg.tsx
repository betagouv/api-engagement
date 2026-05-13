import React from "react";

interface GradientBgProps {
  children: React.ReactNode;
  className?: string;
}

export default function GradientBg({ children, className = "bg-size-[100%_360px]" }: GradientBgProps) {
  return <div className={`bg-no-repeat bg-gradient-to-l from-blue-france-950/40 md:from-blue-france-950  ${className}`}>{children}</div>;
}
