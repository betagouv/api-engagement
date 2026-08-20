import type { ReactNode } from "react";

// Tag bleu résumant une caractéristique de mission (cartes mission, modale profil).
export default function MissionTag({ children }: { children: ReactNode }) {
  return <p className="text-blue-france-sun! bg-blue-france-925! m-0! rounded-[4px]! px-[6px]! py-0! text-[12px]! leading-[20px]! font-bold">{children}</p>;
}
