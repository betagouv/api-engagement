import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";

import Tabs from "@/components/Tabs";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";
import Flux from "@/scenes/my-missions/Flux";
import Moderation from "@/scenes/my-missions/Moderation";

const MyMissions = () => {
  const { publisher } = useStore();
  const publisherId = publisher?.id;
  const [moderated, setModerated] = useState(false);
  const location = useLocation();

  const currentRoute = location.pathname.split("/my-missions")[1]?.replace("/", "") || "";

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

  const tabs = [
    {
      key: "missions",
      label: "Missions partagées",
      to: `/${publisherId}/my-missions`,
      isActive: currentRoute === "" || currentRoute === "my-missions",
    },
    ...(moderated
      ? [
          {
            key: "moderation",
            label: "Modération",
            to: `/${publisherId}/my-missions/moderated-mission`,
            isActive: currentRoute === "moderated-mission",
          },
        ]
      : []),
  ].map((tab) => ({
    ...tab,
    id: `my-missions-tab-${tab.key}`,
  }));

  return (
    <div className="space-y-12">
      <h1 className="text-4xl font-bold">Vos missions partagées</h1>

      <div>
        <Tabs tabs={tabs} ariaLabel="Vos missions" panelId="my-missions-panel" className="flex items-center gap-4 pl-4 font-semibold text-black" variant="primary" />
        <section id="my-missions-panel" className="bg-white shadow-lg">
          <Routes>
            <Route path="/" element={<Flux moderated={moderated} />} />
            <Route path="/moderated-mission" element={<Moderation />} />
          </Routes>
        </section>
      </div>
    </div>
  );
};

export default MyMissions;
