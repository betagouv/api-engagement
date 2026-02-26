import { useEffect, useRef, useState } from "react";
import { RiCloseFill } from "react-icons/ri";
import { useSearchParams } from "react-router-dom";

import Loader from "@/components/Loader";
import Header from "@/scenes/broadcast/moderation/modal/components/Header";
import HistoryTab from "@/scenes/broadcast/moderation/modal/components/HistoryTab";
import MissionTab from "@/scenes/broadcast/moderation/modal/components/MissionTab";
import Note from "@/scenes/broadcast/moderation/modal/components/Note";
import Organization from "@/scenes/broadcast/moderation/modal/components/Organization";
import OrganizationTab from "@/scenes/broadcast/moderation/modal/components/OrganizationTab";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";

const MissionModal = ({ onChange }) => {
  const { publisher } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState("mission");
  const [data, setData] = useState();
  const [history, setHistory] = useState({ ACCEPTED: 0, REFUSED: 0, PENDING: 0 });
  const dialogRef = useRef(null);
  const isOpen = searchParams.has("mission");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!data || !data.missionOrganizationName) {
      return;
    }
    const fetchData = async () => {
      try {
        const res = await api.post("/moderation/search-history", { organizationName: data.missionOrganizationName, moderatorId: publisher.id });
        if (!res.ok) {
          throw res;
        }
        setHistory(res.data.organization[data.missionOrganizationName] || { ACCEPTED: 0, REFUSED: 0, PENDING: 0 });
      } catch (error) {
        captureError(error, { extra: { data, publisherId: publisher.id } });
      }
    };
    fetchData();
  }, [data?.missionOrganizationName]);

  useEffect(() => {
    if (!searchParams.has("mission")) {
      return;
    }
    const fetchData = async () => {
      try {
        const res = await api.get(`/moderation/${searchParams.get("mission")}?moderatorId=${publisher.id}`);
        if (!res.ok) {
          throw res;
        }

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

  return (
    <dialog ref={dialogRef} aria-labelledby="mission-modal-title" className="fixed inset-0 m-0 h-screen max-h-none w-screen max-w-none">
      <div className="bg-global-background relative h-full w-full overflow-scroll">
        <div className="flex justify-end px-8 pt-4">
          <button type="button" className="p-3 text-xl text-black" onClick={handleClose} aria-label="Fermer">
            <RiCloseFill aria-hidden="true" />
          </button>
        </div>
        <div className="mb-16 flex flex-col gap-4 px-8">
          {!data ? (
            <div className="flex justify-center py-10">
              <Loader />
            </div>
          ) : (
            <div className="max-h-full overflow-y-auto px-20">
              <p id="mission-modal-title" className="sr-only">
                Détails de la mission
              </p>
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
                <div role="tablist" aria-label="Onglets de modération" className="flex items-center space-x-2 pl-4 font-semibold text-black">
                  <Tab name="mission" title="Mission" tab={tab} setTab={setTab} />
                  <Tab name="organization" title="Organisation" tab={tab} setTab={setTab} />
                  <Tab name="history" title="Historique" tab={tab} setTab={setTab} />
                </div>
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
          )}
        </div>
      </div>
    </dialog>
  );
};

const Tab = ({ name, title, tab, setTab, actives }) => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (actives && actives.includes(tab)) {
      setActive(true);
    } else if (tab === name) {
      setActive(true);
    } else {
      setActive(false);
    }
  }, [tab]);

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => setTab(name)}
      className={`${
        active ? "border-blue-france text-blue-france hover:bg-gray-975 border-t-2 bg-white" : "bg-blue-france-925 hover:bg-blue-france-925-hover border-0"
      } border-x-grey-border flex translate-y-px cursor-pointer items-center border-x px-4 py-2`}
    >
      {title}
    </button>
  );
};

export default MissionModal;
