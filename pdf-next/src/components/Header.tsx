"use client";

import { Publisher } from "@/types";

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

const Header = ({ publisher, month, year, page, pages }: { publisher: Publisher; month: number; year: number; page: number; pages: number }) => {
  return (
    <header className="w-full bg-[#F5F5FE] h-[192px] flex items-start p-8 gap-8 border-b border-[#E3E3FD]">
      <div className="w-[176px] h-full bg-white rounded-lg p-4">
        <img src={publisher.logo} className="w-full h-full object-scale-down" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-4 mb-3">
          <img src="/assets/svg/logo.svg" className="w-12" />
          <h2 className="text-xl font-bold">API Engagement x {publisher.name}</h2>
        </div>
        <h1 className="text-3xl font-bold mb-1">
          Rapport d’impact {MONTHS[month]} {year}
        </h1>
        <a
          href={`https://app.api-engagement.beta.gouv.fr/performance?from=${new Date(year, month, 1).toISOString()}&to=${new Date(year, month + 1, 1).toISOString()}`}
          className="text-[#000091] text-sm font-bold underline"
        >
          Retrouvez l’ensemble de vos statistiques sur votre tableau de bord
        </a>
      </div>
      <p className="text-xs text-[#666]">
        Page {page} / {pages}
      </p>
    </header>
  );
};

export default Header;
