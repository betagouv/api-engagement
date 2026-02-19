import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { useEffect, useState } from "react";
import { HiX } from "react-icons/hi";
import { useSearchParams } from "react-router-dom";

import Loader from "@/components/Loader";
import Modal from "@/components/Modal";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";
import Header from "@/scenes/broadcast/moderation/modal/components/Header";
import HistoryTab from "@/scenes/broadcast/moderation/modal/components/HistoryTab";
import MissionTab from "@/scenes/broadcast/moderation/modal/components/MissionTab";
import Note from "@/scenes/broadcast/moderation/modal/components/Note";
import Organization from "@/scenes/broadcast/moderation/modal/components/Organization";
import OrganizationTab from "@/scenes/broadcast/moderation/modal/components/OrganizationTab";

const MissionModal = ({ onChange }) => {
  const { publisher } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState("mission");
  const [data, setData] = useState();
  const [history, setHistory] = useState({ ACCEPTED: 0, REFUSED: 0, PENDING: 0 });

  useEffect(() => {
    if (!data || !data.missionOrganizationName) return;
    const fetchData = async () => {
      try {
        const res = await api.post("/moderation/search-history", { organizationName: data.missionOrganizationName, moderatorId: publisher.id });
        if (!res.ok) throw res;
        setHistory(res.data.organization[data.missionOrganizationName] || { ACCEPTED: 0, REFUSED: 0, PENDING: 0 });
      } catch (error) {
        captureError(error, { extra: { data, publisherId: publisher.id } });
      }
    };
    fetchData();
  }, [data?.missionOrganizationName]);

  useEffect(() => {
    if (!searchParams.has("mission")) return;
    const fetchData = async () => {
      try {
        const res = await api.get(`/moderation/${searchParams.get("mission")}?moderatorId=${publisher.id}`);
        if (!res.ok) throw res;

        setData(res.data);
      } catch (error) {
        captureError(error, { extra: { searchParams } });
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete("mission");
        setSearchParams(newSearchParams);
      }
    };
    fetchData();
  }, [searchParams]);

  const handleClose = () => {
    setData(null);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete("mission");
    setSearchParams(newSearchParams);
  };

  if (!data)
    return (
      <Modal isOpen={searchParams.has("mission")} onClose={handleClose} className="bg-beige-gris-galet-975 w-3/4">
        <div className="flex justify-center py-10">
          <Loader />
        </div>
      </Modal>
    );

  return (
    <Dialog open={searchParams.has("mission")} as="div" className="relative z-10 focus:outline-none" onClose={handleClose}>
      <DialogBackdrop className="fixed inset-0 bg-black/30" />
      <div className="fixed inset-0 flex w-screen items-center justify-center">
        <DialogPanel transition className="bg-beige-gris-galet-975 h-full w-full backdrop-blur-2xl duration-300 ease-out data-closed:transform-[scale(95%)] data-closed:opacity-0">
          <div className="absolute top-5 right-5 cursor-pointer p-3">
            <HiX className="text-blue-france text-lg" onClick={handleClose} />
          </div>
          <div className="max-h-full overflow-y-auto px-20">
            <Header
              data={data}
              onChange={(v) => {
                if (Array.isArray(v)) {
                  onChange(v);
                  return;
                }
                setData({ ...data, ...v });
                onChange({ ...data, ...v });
              }}
            />

            <div className="mt-8 flex w-full flex-1 flex-col">
              <nav role="navigation" aria-label="Onglets de modération" className="flex items-center space-x-2 pl-4 font-semibold text-black">
                <Tab name="mission" title="Mission" tab={tab} setTab={setTab} />
                <Tab name="organization" title="Organisation" tab={tab} setTab={setTab} />
                <Tab name="history" title="Historique" tab={tab} setTab={setTab} />
              </nav>
              <div className="mb-12 grid w-full grid-cols-3 gap-6">
                <div className="border-grey-border col-span-2 border bg-white">
                  {
                    {
                      mission: (
                        <MissionTab
                          data={data}
                          onChange={(v) => {
                            setData({ ...data, ...v });
                            onChange({ ...data, ...v });
                          }}
                        />
                      ),
                      organization: (
                        <OrganizationTab
                          data={data}
                          onChange={(v) => {
                            setData({ ...data, ...v });
                            onChange({ ...data, ...v });
                          }}
                        />
                      ),
                      history: <HistoryTab data={data} />,
                    }[tab]
                  }
                </div>
                <div className="col-span-1 flex flex-col gap-4">
                  <Note
                    data={data}
                    onChange={(v) => {
                      setData({ ...data, ...v });
                      onChange({ ...data, ...v });
                    }}
                  />

                  <Organization data={data} history={history} />
                </div>
              </div>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

const Tab = ({ name, title, tab, setTab, actives }) => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (actives && actives.includes(tab)) setActive(true);
    else if (tab === name) setActive(true);
    else setActive(false);
  }, [tab]);

  return (
    <div onClick={() => setTab(name)}>
      <div
        className={`${
          active ? "border-blue-france text-blue-france hover:bg-gray-975 border-t-2 bg-white" : "bg-blue-france-925 hover:bg-blue-france-925-hover border-0"
        } border-x-grey-border flex translate-y-px cursor-pointer items-center border-x px-4 py-2`}
      >
        <p>{title}</p>
      </div>
    </div>
  );
};

export default MissionModal;
