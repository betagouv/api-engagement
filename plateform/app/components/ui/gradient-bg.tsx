import React from "react";
interface GradientBgProps {
  children: React.ReactNode;
  fixed?: boolean;
}

export default function GradientBg({ children, fixed = false }: GradientBgProps) {
  return (
    <div
      className={`bg-no-repeat bg-gradient-to-l from-blue-france-950/40 md:from-blue-france-950 ${fixed ? "min-h-screen bg-fixed" : ""}`}
      style={{
        backgroundSize: "100% 360px",
      }}
    >
      {children}
    </div>
  );
}
