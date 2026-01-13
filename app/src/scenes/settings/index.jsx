import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";

import useStore from "../../services/store";
import Flux from "./Flux";
import RealTime from "./RealTime";
import TrackingAnnounce from "./TrackingAnnounce";
import TrackingBroadcast from "./TrackingBroadcast";

const Settings = () => {
  const { flux } = useStore();

  if (flux === "from")
    return (
      <div className="space-y-12">
        <title>API Engagement - Paramètres de tracking</title>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Paramètres de tracking</h1>
          <p className="text-gray-425 text-base">
            Suivez les instructions ci-dessous pour que les impressions de vos liens de campagnes et des missions que vous diffusez par API soient comptabilisées.
          </p>
        </div>
        <TrackingBroadcast />
      </div>
    );

  return (
    <div className="space-y-12">
      <h1 className="text-4xl font-bold">Paramètres</h1>
      <div>
        <div className="flex items-center space-x-4 pl-4 font-semibold text-black">
          <Tab title="Flux de missions" />
          <Tab title="Tracking des événements" route="tracking" />
          <Tab title="Événements en temps réel" route="real-time" />
        </div>
        <section className="bg-white shadow-lg">
          <Routes>
            <Route path="/" element={<Flux />} />
            <Route path="/tracking" element={<TrackingAnnounce />} />
            <Route path="/real-time" element={<RealTime />} />
          </Routes>
        </section>
      </div>
    </div>
  );
};

const Tab = ({ title, route = "" }) => {
  const [active, setActive] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const current = location.pathname.split("/settings")[1];
    setActive(route === current.replace("/", ""));
  }, [location]);

  return (
    <Link to={`/settings/${route}`}>
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

export default Settings;
