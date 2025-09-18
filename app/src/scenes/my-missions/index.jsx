import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";

import Flux from "./Flux";
import Moderation from "./Moderation";

const MyMissions = () => {
  return (
    <div className="space-y-12">
      <h1 className="text-4xl font-bold">Vos missions partagées</h1>

      <div>
        <div className="flex items-center space-x-4 pl-4 font-semibold text-black">
          <Tab title="Mission partagées" />
        </div>
        <section className="bg-white shadow-lg">
          <Routes>
            <Route path="/" element={<Flux />} />
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
          active ? "border-blue-france text-blue-france hover:bg-gray-975 border-t-2 bg-white" : "bg-blue-france-925 hover:bg-blue-france-925-hover border-0"
        } flex translate-y-px cursor-pointer items-center border-x border-x-gray-900 px-4 py-2`}
      >
        <p>{title}</p>
      </div>
    </Link>
  );
};

export default MyMissions;
