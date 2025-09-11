import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";

import Flux from "./Flux";
import Moderation from "./Moderation";
import Partners from "./Partners";
import StatsModeration from "./StatsModeration";

const MyMissions = () => {
  return (
    <div className="space-y-12">
      <h1 className="text-4xl font-bold">Vos missions partagées</h1>

      <div>
        <div className="flex items-center space-x-4 pl-4 font-semibold text-black">
          <Tab title="Mission partagées" />
          <Tab title="Statistiques de modération" route="moderation" />
          <Tab title="Partenaires diffuseurs" route="partners" actives={["partners", "moderated-mission"]} />
        </div>
        <section className="bg-white shadow-lg">
          <Routes>
            <Route path="/" element={<Flux />} />
            <Route path="/moderation" element={<StatsModeration />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/moderated-mission/:id" element={<Moderation />} />
          </Routes>
        </section>
      </div>
    </div>
  );
};

const Tab = ({ title, route = "", actives = [route] }) => {
  const [active, setActive] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const current = location.pathname.split("/my-missions")[1].split("/")[1] || "";
    setActive(actives.includes(current));
  }, [location]);

  return (
    <Link to={`/my-missions/${route}`}>
      <div
        className={`${
          active ? "border-t-2 border-blue-france bg-white text-blue-france hover:bg-gray-975" : "border-0 bg-tab-main hover:bg-tab-hover"
        } flex translate-y-px cursor-pointer items-center border-x border-x-gray-900 px-4 py-2`}
      >
        <p>{title}</p>
      </div>
    </Link>
  );
};

export default MyMissions;
