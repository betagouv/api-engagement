import { useEffect, useRef, useState } from "react";
import { RiCloseFill } from "react-icons/ri";
import { useSearchParams } from "react-router-dom";

import Loader from "@/components/Loader";
import Tabs from "@/components/Tabs";
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

  const tabs = [
    { key: "mission", label: "Mission" },
    { key: "organization", label: "Organisation" },
    { key: "history", label: "Historique" },
  ].map((t) => ({ ...t, id: `mission-modal-tab-${t.key}`, isActive: tab === t.key, onSelect: () => setTab(t.key) }));
  const activeTabId = `mission-modal-tab-${tab}`;

  return (
    <dialog ref={dialogRef} aria-modal="true" aria-labelledby="mission-modal-title" className="fixed inset-0 m-0 h-screen max-h-none w-screen max-w-none">
      <div className="bg-global-background relative h-full w-full overflow-scroll">
        <div className="flex justify-end px-4 pt-4 md:px-8">
          <button type="button" className="p-3 text-xl text-black" onClick={handleClose} aria-label="Fermer">
            <RiCloseFill aria-hidden="true" />
          </button>
        </div>
        <div className="mb-16 flex flex-col gap-4 px-4 md:px-8">
          <p id="mission-modal-title" className="sr-only">
            Détails de la mission
          </p>
          {!data ? (
            <div className="flex justify-center py-10">
              <Loader />
            </div>
          ) : (
            <div className="max-h-full overflow-y-auto px-0 lg:px-20">
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
                <Tabs
                  tabs={tabs}
                  ariaLabel="Onglets de modération"
                  panelId="mission-modal-panel"
                  className="flex items-center gap-2 pl-0 font-semibold text-black md:pl-4"
                  variant="primary"
                />
                <div className="mb-12 grid w-full grid-cols-1 gap-6 lg:grid-cols-3">
                  <div id="mission-modal-panel" role="tabpanel" aria-labelledby={activeTabId} tabIndex={0} className="border-grey-border border bg-white lg:col-span-2">
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

export default MissionModal;
