import { useEffect, useState } from "react";

import { useSearchParams } from "react-router-dom";
import dataViz from "../../assets/svg/data-visualization.svg";
import APILogo from "../../assets/svg/logo.svg";
import Distribution from "./components/Distribution";
import SomeNumbers from "./components/SomeNumbers";

const PublicStats = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    department: searchParams.get("department") || "",
    type: searchParams.get("type") || "",
    year: searchParams.get("year") || new Date().getFullYear(),
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const query = new URLSearchParams();
    if (filters.department) query.append("department", filters.department);
    if (filters.type) query.append("type", filters.type);
    if (filters.year) query.append("year", filters.year);
    setSearchParams(query);
  }, [filters]);

  return (
    <div className="flex w-full flex-col bg-white">
      <title>API Engagement - Statistiques</title>
      <div className="mx-auto my-14 w-4/5 max-w-[1200px] flex-1">
        <div className="flex justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold">Statistiques de l'API Engagement</h1>
            <p className="text-text-mention text-lg font-medium">L'API Engagement facilite la diffusion des missions de bénévolat et de volontariat partout en France.</p>
          </div>

          <img className="h-18 w-18" src={APILogo} alt="API Engagement" />
        </div>
      </div>
      <div className="bg-beige-gris-galet-975">
        <div className="mx-auto my-14 w-4/5 max-w-[1200px] flex-1">
          <div className="flex">
            <img className="h-18 w-18" src={dataViz} alt="API Engagement" />
            <div className="ml-5 flex flex-col">
              <h2 className="text-3xl font-bold">Vue d'ensemble</h2>
              <p className="text-text-mention text-lg">
                <strong>Quelques indicateurs </strong>
                pour observer d'un coup d'oeil l'impact de l'API Engagement
              </p>
            </div>
          </div>
        </div>
        <div className="mx-auto my-14 w-4/5 max-w-[1200px] border bg-white p-12">
          <h2 className="text-3xl font-bold">En quelques mots</h2>
          <div className="flex-start flex gap-6">
            <div className="text-text-mention mt-8 flex-1 text-lg leading-loose">
              <strong className="text-black">
                L'API Engagement est un service public numérique qui permet aux plateformes d'engagement associatives, publiques et privées de mettre en commun leurs missions.
              </strong>
              <div>
                Elle permet au plus grand nombre d'accéder aux opportunités d'engagement en renforçant / démultipliant la visibilité des annonces, et augmente ainsi le nombre de
                personnes qui candidatent aux actions.
              </div>
            </div>
            <div className="text-text-mention mt-8 flex-1 text-lg leading-loose">
              L'API Engagement permet de faciliter l'engagement en simplifiant l'accès à une pluralité d'annonces actualisées. Avec cette technologie, les points de rencontres sont
              multipliés : les annonces sont accessible aux bons endroits, c'est-à-dire là où les personnes qui souhaitent s'engager se trouvent : site de mairie, applications,
              plateformes d'engagement, etc.
            </div>
          </div>
        </div>

        <SomeNumbers filters={filters} onFiltersChange={setFilters} />
        <Distribution filters={filters} onFiltersChange={setFilters} />
      </div>
    </div>
  );
};

export default PublicStats;
