import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";

import Announcer from "./Announcer";
import Apercu from "./Apercu";
import Broacaster from "./Broacaster";

const Index = () => (
  <div className="space-y-12">
    <h1 className="text-4xl font-bold">Statistiques</h1>

    <div>
      <nav className="flex items-center space-x-4 pl-4 font-semibold text-black">
        <Tab title="Aperçu" route="" />
        <Tab title="Diffuseurs" route="diffuseur" />
        <Tab title="Annonceurs" route="annonceur" />
      </nav>

      <section className="bg-white shadow-lg">
        <Routes>
          <Route path="/" element={<Apercu />} />
          <Route path="/diffuseur" element={<Broacaster />} />
          <Route path="/annonceur" element={<Announcer />} />
        </Routes>
      </section>
    </div>
  </div>
);

const Tab = ({ title, route = "" }) => {
  const [active, setActive] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const current = location.pathname.split("/admin-stats")[1];
    setActive(route === current.replace("/", ""));
  }, [location]);

  return (
    <Link to={`/admin-stats/${route}`}>
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

export default Index;
