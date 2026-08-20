import type { ReactNode } from "react";

// Tag bleu résumant une caractéristique de mission (cartes mission, modale profil).
export default function MissionTag({ children }: { children: ReactNode }) {
  return (
    <p className="text-blue-france-sun! dark:text-blue-france-525! bg-blue-france-925! dark:bg-background-contrast-blue-france! m-0! rounded-[4px]! px-[6px]! py-0! text-[12px]! leading-[20px]! font-bold">
      {children}
    </p>
  );
}
