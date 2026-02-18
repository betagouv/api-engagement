import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";

import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";
import Flux from "./Flux";
import Moderation from "./Moderation";

const MyMissions = () => {
  const { publisher } = useStore();
  const publisherId = publisher?.id || publisher?._id;
  const [moderated, setModerated] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resM = await api.get(`/publisher/${publisher.id}/moderated`);
        if (!resM.ok) throw resM;
        setModerated(resM.data);
      } catch (error) {
        captureError(error, { extra: { publisherId: publisher.id } });
      }
    };
    fetchData();
  }, [publisher.id]);

  return (
    <div className="space-y-12">
      <h1 className="text-4xl font-bold">Vos missions partagées</h1>

      <div>
        <div className="flex items-center space-x-4 pl-4 font-semibold text-black">
          <Tab route="" title="Mission partagées" publisherId={publisherId} />
          {moderated && <Tab route="moderated-mission" title="Modération" publisherId={publisherId} />}
        </div>
        <section className="bg-white shadow-lg">
          <Routes>
            <Route path="/" element={<Flux moderated={moderated} />} />
            <Route path="/moderated-mission" element={<Moderation />} />
          </Routes>
        </section>
      </div>
    </div>
  );
};

const Tab = ({ title, route = "", actives = [route], publisherId }) => {
  const [active, setActive] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const current = location.pathname.split("/my-missions")[1].split("/")[1] || "";
    setActive(actives.includes(current));
  }, [location]);

  return (
    <Link to={`/${publisherId}/my-missions/${route}`}>
      <div
        className={`${
          active ? "border-blue-france text-blue-france hover:bg-gray-975 border-t-2 bg-white" : "bg-blue-france-925 hover:bg-blue-france-925-hover border-0"
        } border-x-grey-border flex translate-y-px cursor-pointer items-center border-x px-4 py-2`}
      >
        <p>{title}</p>
      </div>
    </Link>
  );
};

export default MyMissions;
