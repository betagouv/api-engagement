import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";

import Publishers from "./Publishers";
import Users from "./Users";

const Index = () => {
  return (
    <div className="space-y-12">
      <h1 className="text-4xl font-bold">Liste des comptes de l'API Engagement</h1>

      <div>
        <nav className="flex items-center space-x-4 pl-4 font-semibold text-black">
          <Tab title="Utilisateurs" />
          <Tab title="Partenaires" route="publishers" />
        </nav>
        <section className="bg-white shadow-lg">
          <Routes>
            <Route path="/" element={<Users />} />
            <Route path="/publishers" element={<Publishers />} />
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
    const current = location.pathname.split("/admin-account")[1].split("/")[1] || "";
    setActive(actives.includes(current));
  }, [location]);

  return (
    <Link to={`/admin-account/${route}`}>
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
