import React from "react";

type Props = {
  children: React.ReactNode;
};

export default function Title({ children }: Props) {
  return <h1 className="fr-h3">{children}</h1>;
}
