import { Fragment, useEffect, useState } from "react";
import { RiCheckboxCircleFill, RiCloseFill, RiTimeLine } from "react-icons/ri";

import Loader from "@/components/Loader";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";
import { JVA_MODERATION_COMMENTS_LABELS, STATUS } from "../../components/Constants";

const HistoryTab = ({ data }) => {
  const { publisher } = useStore();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState([]);
  const [modifications, setModifications] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.post(`/moderation-event/search`, { missionId: data._id, moderatorId: publisher.id });
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
  }, [data, publisher.id]);

  if (loading) return <Loader />;

  return (
    <div className="p-8">
      <h3 className="text-gray-425 mb-4 text-xs font-bold uppercase">Évolution des statuts</h3>
      <div className="space-y-2">
        {status.length === 0 && modifications.length === 0 && <div className="text-gray-425 text-center">Aucun événement de modération trouvé.</div>}
        {status.map((event, index) => (
          <Fragment key={index}>
            {index !== 0 && <div className="ml-4 h-[30px] w-px bg-gray-900" />}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-1 items-center gap-4">
                {
                  {
                    PENDING: (
                      <div className="bg-orange-warning-425 flex h-8 w-8 items-center justify-center rounded-full">
                        <RiTimeLine className="text-white" size={16} />
                      </div>
                    ),
                    ACCEPTED: (
                      <div className="bg-green-success flex h-8 w-8 items-center justify-center rounded-full">
                        <RiCheckboxCircleFill className="text-white" size={16} />
                      </div>
                    ),
                    REFUSED: (
                      <div className="bg-red-marianne flex h-8 w-8 items-center justify-center rounded-full">
                        <RiCloseFill className="text-white" size={16} />
                      </div>
                    ),
                  }[event.newStatus]
                }
                <p className="text-gray-425 flex-1 text-base">
                  <span className="text-black">{event.userName}</span> a passé le statut à <span className="font-semibold text-black">{STATUS[event.newStatus]}</span>
                </p>
              </div>

              <span className="text-gray-425 text-sm">{new Date(event.createdAt).toLocaleDateString("fr")}</span>
            </div>

            {event.newStatus === "REFUSED" && (
              <>
                <div className="ml-4 h-[30px] w-px bg-gray-900" />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-1 items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#CE0500]">
                      <RiCloseFill className="text-white" size={16} />
                    </div>
                    <p className="text-gray-425 flex-1 text-base">
                      <span className="text-black">{event.userName}</span> a modifié le motif de refus en{" "}
                      <span className="font-semibold text-black">{JVA_MODERATION_COMMENTS_LABELS[event.newComment] || event.newComment}</span>
                    </p>
                  </div>
                  <span className="text-gray-425 text-sm">{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                </div>
              </>
            )}
          </Fragment>
        ))}
      </div>

      <h3 className="text-gray-425 mt-8 mb-4 text-xs font-bold uppercase">Modifications</h3>
      <div className="space-y-4">
        {modifications.length === 0 && <p className="text-gray-425">Aucune modification</p>}
        {modifications.map((event, index) => (
          <div key={index} className="space-y-2">
            {event.newNote !== null && event.userId && (
              <div className="flex items-center justify-between">
                <div className="text-gray-425 text-sm">
                  <span className="text-black">{event.userName}</span> a modifié la note en <span className="font-semibold text-black">{event.newNote}</span>
                </div>
                <div className="text-gray-425 text-sm">
                  <span>{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                </div>
              </div>
            )}
            {event.newNote !== null && !event.userId && (
              <div className="flex items-center justify-between">
                <div className="text-gray-425 text-sm">
                  Modération automatique a enregistré les données suivantes au moment de la modération automatique:{" "}
                  <span className="font-semibold text-black">{event.newNote}</span>
                </div>
                <div className="text-gray-425 text-sm">
                  <span>{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                </div>
              </div>
            )}
            {event.newTitle !== null && (
              <div className="mt-2 text-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-gray-425">
                    <span className="font-normal text-black">{event.userName}</span> a modifié le <span className="font-semibold text-black">titre de la mission</span>
                  </div>
                  <div className="mx-2 flex-1 border-t border-gray-900"></div>
                  <div className="text-gray-425">
                    <span>{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                  </div>
                </div>

                <div className="flex justify-between">
                  <div className="flex-1">
                    <p className="text-sm">Avant</p>
                    <p className="text-gray-425 mt-4 text-sm">{event.initialTitle || data.title}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Après</p>
                    <p className="text-gray-425 mt-4 text-sm">{event.newTitle}</p>
                  </div>
                </div>
              </div>
            )}
            {event.newSiren !== null && (
              <div className="mt-2 text-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-gray-425">
                    <span className="font-normal text-black">{event.userName}</span> a modifié le <span className="font-semibold text-black">SIREN</span>
                  </div>
                  <div className="mx-2 flex-1 border-t border-gray-900"></div>
                  <div className="text-gray-425">
                    <span>{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                  </div>
                </div>

                <div className="flex">
                  <div className="flex-1">
                    <p className="text-sm">Avant</p>
                    <p className="text-gray-425 mt-4 text-sm">{event.initialSiren || "-"}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Après</p>
                    <p className="text-gray-425 mt-4 text-sm">{event.newSiren}</p>
                  </div>
                </div>
              </div>
            )}
            {event.newRNA !== null && (
              <div className="mt-2 text-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-gray-425">
                    <span className="font-normal text-black">{event.userName}</span> a modifié le <span className="font-semibold text-black">RNA</span>
                  </div>
                  <div className="mx-2 flex-1 border-t border-gray-900"></div>

                  <div className="text-gray-425">
                    <span>{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                  </div>
                </div>

                <div className="flex">
                  <div className="flex-1">
                    <p className="text-sm">Avant</p>
                    <p className="text-gray-425 mt-4 text-sm">{event.initialRNA || "-"}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Après</p>
                    <p className="text-gray-425 mt-4 text-sm">{event.newRNA}</p>
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
