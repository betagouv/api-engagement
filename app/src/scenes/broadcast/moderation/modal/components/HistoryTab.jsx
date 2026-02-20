import { Fragment, useEffect, useState } from "react";
import { RiCheckboxCircleFill, RiCloseFill, RiTimeLine } from "react-icons/ri";

import Loader from "@/components/Loader";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";
import { JVA_MODERATION_COMMENTS_LABELS, STATUS } from "@/scenes/broadcast/moderation/components/Constants";

const HistoryTab = ({ data }) => {
  const { publisher } = useStore();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState([]);
  const [modifications, setModifications] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.post(`/moderation-event/search`, { missionId: data.missionId, moderatorId: publisher.id });
        if (!res.ok) throw res;

        setStatus(res.data.filter((event) => event.newStatus || event.newComment));
        setModifications(res.data.filter((event) => event.newNote || event.newTitle || event.newSiren || event.newRNA));
      } catch (error) {
        captureError(error, { extra: { data, publisherId: publisher.id } });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [data?.missionId, data?.updatedAt, publisher.id]);

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <Loader />
      </div>
    );

  return (
    <div className="p-8">
      <h3 className="text-text-mention mb-4 text-xs font-bold uppercase">Évolution des statuts</h3>
      <div className="space-y-2">
        {status.length === 0 && modifications.length === 0 && <div className="text-text-mention text-center">Aucun événement de modération trouvé.</div>}
        {status.map((event, index) => (
          <Fragment key={index}>
            {event.newStatus !== null && (
              <>
                {index !== 0 && <div className="ml-4 h-[30px] w-px bg-gray-900" />}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-1 items-center gap-4">
                    {
                      {
                        ONGOING: (
                          <div className="bg-blue-info-425 flex h-8 w-8 items-center justify-center rounded-full">
                            <RiTimeLine className="text-white" size={16} />
                          </div>
                        ),
                        PENDING: (
                          <div className="bg-warning flex h-8 w-8 items-center justify-center rounded-full">
                            <RiTimeLine className="text-white" size={16} />
                          </div>
                        ),
                        ACCEPTED: (
                          <div className="bg-success flex h-8 w-8 items-center justify-center rounded-full">
                            <RiCheckboxCircleFill className="text-white" size={16} />
                          </div>
                        ),
                        REFUSED: (
                          <div className="bg-error flex h-8 w-8 items-center justify-center rounded-full">
                            <RiCloseFill className="text-white" size={16} />
                          </div>
                        ),
                      }[event.newStatus]
                    }
                    <p className="text-text-mention flex-1 text-base">
                      <span className="text-black">{event.userName}</span> a passé le statut à <span className="font-semibold text-black">{STATUS[event.newStatus]}</span>
                    </p>
                  </div>

                  <span className="text-text-mention text-sm">{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                </div>
              </>
            )}

            {(event.newStatus === "REFUSED" || event.newComment !== null) && (
              <>
                {(event.newStatus !== null || index !== 0) && <div className="ml-4 h-[30px] w-px bg-gray-900" />}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-1 items-center gap-4">
                    <div className="bg-error flex h-8 w-8 items-center justify-center rounded-full">
                      <RiCloseFill className="text-white" size={16} />
                    </div>
                    <p className="text-text-mention flex-1 text-base">
                      <span className="text-black">{event.userName}</span> a modifié le motif de refus en{" "}
                      <span className="font-semibold text-black">{JVA_MODERATION_COMMENTS_LABELS[event.newComment] || event.newComment}</span>
                    </p>
                  </div>
                  <span className="text-text-mention text-sm">{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                </div>
              </>
            )}
          </Fragment>
        ))}
      </div>

      <h3 className="text-text-mention mt-8 mb-4 text-xs font-bold uppercase">Modifications</h3>
      <div className="space-y-4">
        {modifications.length === 0 && <p className="text-text-mention">Aucune modification</p>}
        {modifications.map((event, index) => (
          <div key={index} className="space-y-2">
            {event.newNote !== null && event.userId && (
              <div className="flex items-center justify-between">
                <div className="text-text-mention text-sm">
                  <span className="text-black">{event.userName}</span> a modifié la note en <span className="font-semibold text-black">{event.newNote}</span>
                </div>
                <div className="text-text-mention text-sm">
                  <span>{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                </div>
              </div>
            )}
            {event.newNote !== null && !event.userId && (
              <div className="flex items-center justify-between">
                <div className="text-text-mention text-sm">
                  Modération automatique a enregistré les données suivantes au moment de la modération automatique:{" "}
                  <span className="font-semibold text-black">{event.newNote}</span>
                </div>
                <div className="text-text-mention text-sm">
                  <span>{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                </div>
              </div>
            )}
            {event.newTitle !== null && (
              <div className="mt-2 text-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-text-mention">
                    <span className="font-normal text-black">{event.userName}</span> a modifié le <span className="font-semibold text-black">titre de la mission</span>
                  </div>
                  <div className="border-grey-border mx-2 flex-1 border-t"></div>
                  <div className="text-text-mention">
                    <span>{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                  </div>
                </div>

                <div className="flex justify-between">
                  <div className="flex-1">
                    <p className="text-sm">Avant</p>
                    <p className="text-text-mention mt-4 text-sm">{event.initialTitle || data.title}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Après</p>
                    <p className="text-text-mention mt-4 text-sm">{event.newTitle}</p>
                  </div>
                </div>
              </div>
            )}
            {event.newSiren !== null && (
              <div className="mt-2 text-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-text-mention">
                    <span className="font-normal text-black">{event.userName}</span> a modifié le <span className="font-semibold text-black">SIREN</span>
                  </div>
                  <div className="border-grey-border mx-2 flex-1 border-t"></div>
                  <div className="text-text-mention">
                    <span>{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                  </div>
                </div>

                <div className="flex">
                  <div className="flex-1">
                    <p className="text-sm">Avant</p>
                    <p className="text-text-mention mt-4 text-sm">{event.initialSiren || "-"}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Après</p>
                    <p className="text-text-mention mt-4 text-sm">{event.newSiren}</p>
                  </div>
                </div>
              </div>
            )}
            {event.newRNA !== null && (
              <div className="mt-2 text-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-text-mention">
                    <span className="font-normal text-black">{event.userName}</span> a modifié le <span className="font-semibold text-black">RNA</span>
                  </div>
                  <div className="border-grey-border mx-2 flex-1 border-t"></div>

                  <div className="text-text-mention">
                    <span>{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                  </div>
                </div>

                <div className="flex">
                  <div className="flex-1">
                    <p className="text-sm">Avant</p>
                    <p className="text-text-mention mt-4 text-sm">{event.initialRNA || "-"}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Après</p>
                    <p className="text-text-mention mt-4 text-sm">{event.newRNA}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryTab;
