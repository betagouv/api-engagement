import React from "react";

export default function GradientBg({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-no-repeat bg-gradient-to-l from-blue-france-950/40 md:from-blue-france-950"
      style={{
        backgroundSize: "100% 360px",
      }}
    >
      {children}
    </div>
  );
}
