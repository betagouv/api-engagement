import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import Api from "./Api";
import Campaigns from "./Campaigns";
import Widgets from "./Widgets";

import useStore from "../../services/store";
import Moderation from "./moderation";

const Index = () => {
  const { publisher } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!publisher) return;
    let route = location.pathname.split("/broadcast")[1].split("/")[1] || "";
    if (route === "" && !publisher.hasApiRights) route = "widgets";
    if (route === "widgets" && !publisher.hasWidgetRights) route = "campaigns";
    if (route === "campaigns" && !publisher.hasCampaignRights) route = "moderation";
    if (route === "moderation" && !publisher.moderator) route = "";

    navigate(`/broadcast/${route}`); // If route didn't change, it will not trigger a re-render, so no infinite loop
  }, [location.pathname]);

  return (
    <div className="space-y-12">
      <h1 className="text-4xl font-bold">Diffuser des missions partenaires</h1>

      <div>
        <div className="flex items-center space-x-4 pl-4 font-semibold text-black">
          {publisher.hasApiRights && <Tab title="Flux par API" />}
          {publisher.hasWidgetRights && <Tab title="Widgets" route="widgets" />}
          {publisher.hasCampaignRights && <Tab title="Campagnes" route="campaigns" />}
          {publisher.moderator && <Tab title="Modération" route="moderation" />}
        </div>

        <section className="bg-white shadow-lg">
          <Routes>
            <Route path="/" element={<Api />} />
            <Route path="/widgets" element={<Widgets />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/moderation" element={<Moderation />} />
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
    const current = location.pathname.split("/broadcast")[1].split("/")[1] || "";
    setActive(actives.includes(current));
  }, [location]);

  return (
    <Link to={`/broadcast/${route}`}>
      <div
        className={`${
          active ? "border-t-2 border-blue-dark bg-white text-blue-dark hover:bg-gray-hover" : "border-0 bg-tab-main hover:bg-tab-hover"
        } flex translate-y-[1px] cursor-pointer items-center border-x border-x-gray-border px-4 py-2`}
      >
        <p>{title}</p>
      </div>
    </Link>
  );
};

export default Index;
