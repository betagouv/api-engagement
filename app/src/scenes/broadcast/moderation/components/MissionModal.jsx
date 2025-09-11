import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { HiX } from "react-icons/hi";
import { RiCheckboxCircleFill, RiCloseFill, RiErrorWarningFill, RiExternalLinkLine, RiTimeLine } from "react-icons/ri";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import Loader from "../../../../components/Loader";
import Modal from "../../../../components/Modal";
import api from "../../../../services/api";
import { captureError } from "../../../../services/error";
import useStore from "../../../../services/store";
import { DOMAINS, JVA_MODERATION_COMMENTS_LABELS, STATUS, STATUS_COLORS } from "./Constants";
import Note from "./Note";
import Organization from "./Organization";
import OrganizationRefusedModal from "./OrganizationRefusedModal";

const MissionModal = ({ onChange }) => {
  const { publisher } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState("mission");
  const [data, setData] = useState();
  const [values, setValues] = useState({});
  const [history, setHistory] = useState({ ACCEPTED: 0, REFUSED: 0, PENDING: 0 });
  const [isOrganizationRefusedOpen, setIsOrganizationRefusedOpen] = useState(false);

  useEffect(() => {
    if (!data || !data.organizationName) return;
    const fetchData = async () => {
      try {
        const res = await api.post("/moderation/search-history", { organizationName: data.organizationName, moderatorId: publisher._id });
        if (!res.ok) throw res;
        setHistory(res.data.organization[data.organizationName] || { ACCEPTED: 0, REFUSED: 0, PENDING: 0 });
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données historiques");
      }
    };
    fetchData();
  }, [data?.organizationName]);

  useEffect(() => {
    if (!searchParams.has("mission")) return;
    const fetchData = async () => {
      try {
        const res = await api.get(`/moderation/${searchParams.get("mission")}?moderatorId=${publisher._id}`);
        if (!res.ok) throw res;

        setData(res.data);
        setValues(res.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete("mission");
        setSearchParams(newSearchParams);
      }
    };
    fetchData();
  }, [searchParams]);

  const handleClose = () => {
    setData(null);
    setValues({});
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete("mission");
    setSearchParams(newSearchParams);
  };

  const handleChange = async (doc) => {
    try {
      setValues({ ...values, ...doc });
      if (doc.status === "REFUSED" && !doc.comment) return;
      const res = await api.put(`/moderation/${data._id}`, { ...doc, moderatorId: publisher._id });
      if (!res.ok) {
        if (res.error === "COMMENT_REQUIRED") {
          toast.error("Le commentaire est requis pour refuser la mission");
          return;
        }
        throw res;
      }
      toast.success("La mission a été modérée avec succès", {
        position: "bottom-right",
      });

      setData(res.data);
      onChange(res.data);

      if (doc.status === "REFUSED" && ["ORGANIZATION_NOT_COMPLIANT", "ORGANIZATION_ALREADY_PUBLISHED"].includes(doc.comment)) setIsOrganizationRefusedOpen(true);
    } catch (error) {
      captureError(error, "Erreur lors de la mise à jour de la mission", {
        position: "bottom-right",
      });
    }
  };

  if (!data)
    return (
      <Modal isOpen={searchParams.has("mission")} onClose={handleClose} className="w-3/4 bg-beige">
        <div className="flex justify-center py-10">
          <Loader />
        </div>
      </Modal>
    );

  return (
    <Dialog open={searchParams.has("mission")} as="div" className="relative z-10 focus:outline-none" onClose={handleClose}>
      <DialogBackdrop className="fixed inset-0 bg-black/30" />
      <div className="fixed inset-0 flex w-screen items-center justify-center">
        <DialogPanel transition className="w-full h-full bg-beige p-6 backdrop-blur-2xl duration-300 ease-out data-closed:transform-[scale(95%)] data-closed:opacity-0">
          <div className="absolute right-2 top-2 cursor-pointer p-3">
            <HiX className="text-blue-france text-lg" onClick={handleClose} />
          </div>
          <div className="max-h-full overflow-y-auto">
            <OrganizationRefusedModal
              isOpen={isOrganizationRefusedOpen}
              onClose={() => setIsOrganizationRefusedOpen(false)}
              organizationName={data.organizationName}
              comment={values.comment}
              onChange={onChange}
            />
            <div className="px-20">
              <div className="flex gap-8 pb-8 justify-between items-center sticky top-0 z-50 h-full bg-beige border-b border-gray-900">
                <div className="space-y-2 max-w-[50%]">
                  <h1 className="mb-1">{DOMAINS[data.domain]}</h1>
                  <h2 className="text-xl">{data.newTitle || data.title}</h2>
                </div>

                <div className="space-y-2 relative pt-4">
                  <div className="flex justify-end items-center gap-2">
                    <select
                      className="select w-56 pr-2 border-b-2"
                      style={{ borderBottomColor: STATUS_COLORS[values.status] }}
                      name="status"
                      value={values.status}
                      onChange={(e) => handleChange({ status: e.target.value })}
                    >
                      {Object.entries(STATUS).map(([key, value]) => (
                        <option key={key} value={key}>
                          {value}
                        </option>
                      ))}
                    </select>
                    {values.status === "REFUSED" && (
                      <select className="select w-64" name="motif" value={values.comment} onChange={(e) => handleChange({ status: "REFUSED", comment: e.target.value })}>
                        <option value="">Motif de refus</option>
                        {Object.entries(JVA_MODERATION_COMMENTS_LABELS).map(([key, value]) => (
                          <option key={key} value={key}>
                            {value}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="absolute -bottom-6 right-0 text-right w-screen text-xs italic">
                    {values.status === "REFUSED" && !values.comment ? "Veuillez renseigner un motif de refus pour sauvegarder le changement de statut" : ""}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 px-20">
                <div className="flex flex-col flex-1 mt-8">
                  <nav className="flex items-center space-x-2 pl-4 font-semibold text-black">
                    <Tab name="mission" title="Mission" tab={tab} setTab={setTab} />
                    <Tab name="organization" title="Organisation" tab={tab} setTab={setTab} />
                    <Tab name="history" title="Historique" tab={tab} setTab={setTab} />
                  </nav>
                  <div className="flex gap-6 mb-12 w-full">
                    <div className="w-2/3 border border-gray-900 bg-white">
                      {
                        {
                          mission: <MissionTab data={data} onChange={handleChange} />,
                          organization: <OrganizationTab data={data} onChange={handleChange} />,
                          history: <HistoryTab data={data} />,
                        }[tab]
                      }
                    </div>
                    <div className="flex flex-col gap-4 w-1/3">
                      <div>
                        <Note data={data} onChange={handleChange} />
                      </div>
                      <div>
                        <Organization data={data} history={history} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

const MissionTab = ({ data, onChange }) => {
  const [newTitle, setNewTitle] = useState(data.newTitle || data.title);
  const [error, setError] = useState(null);

  useEffect(() => {
    setNewTitle(data.newTitle || data.title);
    setError(null);
  }, [data.newTitle, data.title]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return setError("Le nom est requis");
    onChange({ newTitle });
  };

  return (
    <form className="flex divide-x pb-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4 p-8 w-full">
        <div className="flex flex-col">
          <label className="mb-2 text-sm" htmlFor="new-mission-title">
            Nom de la mission
          </label>
          <input
            className={`input mb-2 ${error ? "border-b-red-error" : "border-b-black"}`}
            id="new-mission-title"
            name="new-mission-title"
            placeholder={data.title}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          {error && (
            <div className="flex items-center text-sm text-red-error">
              <RiErrorWarningFill className="mr-2" />
              {error}
            </div>
          )}
          <p className="text-xs text-gray-425">
            <span className="mr-1 font-semibold">Titre d'origine:</span>
            {data.title}
          </p>
          {newTitle !== data.title && newTitle !== data.newTitle && (
            <button className="button bg-blue-france text-white hover:bg-blue-france-hover mt-4 w-[25%]" type="submit">
              Enregistrer
            </button>
          )}
        </div>
        <div className="border-t border-gray-900" />
        <div className="flex flex-col space-y-2">
          <label className="mb-2 text-sm" htmlFor="description">
            Description
          </label>
          <div
            className="rounded-t overflow-hidden p-6 text-sm text-gray-425 border border-gray-900 bg-gray-950"
            dangerouslySetInnerHTML={{ __html: data.description.replace(/\n/g, "<br />") }}
          />
        </div>
        <div className="border-t border-gray-900" />
        <div className="flex flex-col space-y-2 py-2">
          <label className="text-sm" htmlFor="title">
            Lieu de la mission
          </label>
          <p className="text-sm text-gray-425">
            {data.departmentName} ({data.departmentCode})
          </p>
        </div>
        <div className="border-t border-gray-900" />
        <div className="flex flex-col space-y-2 py-2">
          <label className="text-sm" htmlFor="title">
            Date de la mission
          </label>
          <p className="text-sm text-gray-425">À partir du {new Date(data.startAt).toLocaleDateString("fr", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <div className="border-t border-gray-900" />
        <div className="flex flex-col space-y-2 py-2">
          <label className="text-sm" htmlFor="title">
            Date de création
          </label>
          <p className="text-sm text-gray-425">
            Postée le {new Date(data.postedAt).toLocaleDateString("fr")} sur {data.publisherName}
          </p>
        </div>
        <div className="border-t border-gray-900" />
        <div className="flex flex-col space-y-2 py-2">
          <label className="text-sm" htmlFor="title">
            Lien de la mission
          </label>
          <div className="flex items-center gap-2">
            <Link
              to={data.applicationUrl.includes("http") ? data.applicationUrl : `https://${data.applicationUrl}`}
              className="text-sm text-blue-france underline w-fit"
              target="_blank"
            >
              Ouvrir le lien de la mission
            </Link>
            <RiExternalLinkLine />
          </div>
        </div>
        <div className="border-t border-gray-900" />
        <div className="flex flex-col space-y-2 py-2">
          <label className="text-sm" htmlFor="title">
            ID
          </label>
          <p className="text-sm text-gray-425">{data._id}</p>
        </div>
      </div>
    </form>
  );
};

const OrganizationTab = ({ data, onChange }) => {
  const [values, setValues] = useState({
    organizationSirenVerified: data.organizationSirenVerified,
    organizationRNAVerified: data.organizationRNAVerified,
  });

  useEffect(() => {
    setValues({
      organizationSirenVerified: data.organizationSirenVerified,
      organizationRNAVerified: data.organizationRNAVerified,
    });
  }, [data]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const obj = {};
    if (values.organizationSirenVerified !== data.organizationSirenVerified) obj.organizationSirenVerified = values.organizationSirenVerified;
    if (values.organizationRNAVerified !== data.organizationRNAVerified) obj.organizationRNAVerified = values.organizationRNAVerified;
    onChange(obj);
  };

  return (
    <form className="flex h-full divide-x" onSubmit={handleSubmit}>
      <div className="flex flex-1 flex-col gap-2 p-8">
        <div className="flex flex-col gap-2">
          <label className="text-sm" htmlFor="organization-name">
            Nom de l'organisation
          </label>
          <input id="organization-name" className="input mb-2" disabled name="organization-name" defaultValue={data.organizationName} />
        </div>
        <div className="flex flex-col gap-2 py-2">
          <label className="text-sm" htmlFor="organization-siren">
            SIREN
          </label>
          <input
            id="organization-siren"
            className="input mb-2"
            name="organization-siren"
            placeholder={data.organizationSirenVerified}
            value={values.organizationSirenVerified}
            onChange={(e) => setValues({ ...values, organizationSirenVerified: e.target.value })}
          />
          <p className="text-xs text-gray-425">
            <span className="mr-1 font-semibold">SIREN d'origine:</span>
            {data.organizationSiren ? data.organizationSiren : "/"}
          </p>
        </div>
        <div className="flex flex-col space-y-2 py-2">
          <label className="text-sm" htmlFor="organization-rna">
            RNA
          </label>
          <input
            id="organization-rna"
            className="input mb-2"
            name="organization-rna"
            placeholder={data.organizationRNAVerified}
            value={values.organizationRNAVerified}
            onChange={(e) => setValues({ ...values, organizationRNAVerified: e.target.value })}
          />
          <p className="text-xs text-gray-425">
            <span className="mr-1 font-semibold">RNA d'origine:</span>
            {data.organizationRNA ? data.organizationRNA : "/"}
          </p>
        </div>
        {(values.organizationSirenVerified !== data.organizationSirenVerified || values.organizationRNAVerified !== data.organizationRNAVerified) && (
          <button className="button bg-blue-france text-white hover:bg-blue-france-hover mt-4 w-[25%]" type="submit">
            Enregistrer
          </button>
        )}

        <div className="flex flex-col gap-2 border-t border-gray-900 py-4">
          <label className="text-sm" htmlFor="title">
            Adresse
          </label>
          <p className="text-sm text-gray-425">{data.organizationFullAddress ? data.organizationFullAddress : "/"}</p>
        </div>
        <div className="flex flex-col gap-2 border-t border-gray-900 py-4">
          <label className="text-sm" htmlFor="title">
            Domaine d'action
          </label>
          <p className="text-sm text-gray-425">{DOMAINS[data.domain]}</p>
        </div>
        <div className="flex flex-col gap-2 border-t border-gray-900 py-4">
          <label className="text-sm" htmlFor="title">
            Organisation déjà inscrite sur
          </label>
          <p className="text-sm text-gray-425">
            {data.associationSources?.length ? data.associationSources.map((s) => (s === "Je veux aider" ? "JeVeuxAider.gouv.fr" : s)).join(", ") : "/"}
          </p>
        </div>
        <div className="flex flex-col gap-2 border-t border-gray-900 py-4">
          <label className="text-sm" htmlFor="title">
            Site internet
          </label>
          <a href={data.organizationUrl} className="text-sm text-blue-france underline" target="_blank">
            {data.organizationUrl}
          </a>
        </div>
      </div>
    </form>
  );
};

const HistoryTab = ({ data }) => {
  const { publisher } = useStore();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState([]);
  const [modifications, setModifications] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.post(`/moderation-event/search`, { missionId: data._id, moderatorId: publisher._id });
        if (!res.ok) throw res;

        setStatus(res.data.filter((event) => event.newStatus || event.newComment));
        setModifications(res.data.filter((event) => event.newNote || event.newTitle || event.newSiren || event.newRNA));
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [data, publisher._id]);

  if (loading) return <Loader />;

  return (
    <div className="p-8">
      <h3 className="text-gray-425 text-xs font-bold uppercase mb-4">Évolution des statuts</h3>
      <div className="space-y-2">
        {status.length === 0 && modifications.length === 0 && <div className="text-center text-gray-425">Aucun événement de modération trouvé.</div>}
        {status.map((event, index) => (
          <Fragment key={index}>
            {index !== 0 && <div className="h-[30px] w-px ml-4 bg-gray-900" />}
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 flex items-center gap-4">
                {
                  {
                    PENDING: (
                      <div className="w-8 h-8 flex items-center justify-center bg-[#B34000] rounded-full">
                        <RiTimeLine className="text-white" size={16} />
                      </div>
                    ),
                    ACCEPTED: (
                      <div className="w-8 h-8 flex items-center justify-center bg-[#18753C] rounded-full">
                        <RiCheckboxCircleFill className="text-white" size={16} />
                      </div>
                    ),
                    REFUSED: (
                      <div className="w-8 h-8 flex items-center justify-center bg-[#CE0500] rounded-full">
                        <RiCloseFill className="text-white" size={16} />
                      </div>
                    ),
                  }[event.newStatus]
                }
                <p className="flex-1 text-gray-425 text-base">
                  <span className="text-black">{event.userName}</span> a passé le statut à <span className="font-semibold text-black">{STATUS[event.newStatus]}</span>
                </p>
              </div>

              <span className="text-gray-425 text-sm">{new Date(event.createdAt).toLocaleDateString("fr")}</span>
            </div>

            {event.newStatus === "REFUSED" && (
              <>
                <div className="h-[30px] w-px ml-4 bg-gray-900" />
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 flex items-center gap-4">
                    <div className="w-8 h-8 flex items-center justify-center bg-[#CE0500] rounded-full">
                      <RiCloseFill className="text-white" size={16} />
                    </div>
                    <p className="flex-1 text-gray-425 text-base">
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

      <h3 className="text-gray-425 text-xs font-bold uppercase mt-8 mb-4">Modifications</h3>
      <div className="space-y-4">
        {modifications.length === 0 && <p className="text-gray-425">Aucune modification</p>}
        {modifications.map((event, index) => (
          <div key={index} className="space-y-2">
            {event.newNote !== null && event.userId && (
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-425">
                  <span className="text-black">{event.userName}</span> a modifié la note en <span className="font-semibold text-black">{event.newNote}</span>
                </div>
                <div className="text-gray-425 text-sm">
                  <span>{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                </div>
              </div>
            )}
            {event.newNote !== null && !event.userId && (
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-425">
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
                <div className="mb-4 flex justify-between items-center">
                  <div className="text-gray-425">
                    <span className="font-normal text-black">{event.userName}</span> a modifié le <span className="font-semibold text-black">titre de la mission</span>
                  </div>
                  <div className="border-t border-gray-900 mx-2 flex-1"></div>
                  <div className="text-gray-425">
                    <span>{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                  </div>
                </div>

                <div className="flex justify-between">
                  <div className="flex-1">
                    <p className="text-sm">Avant</p>
                    <p className="text-sm text-gray-425 mt-4">{event.initialTitle || data.title}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Après</p>
                    <p className="text-sm text-gray-425 mt-4">{event.newTitle}</p>
                  </div>
                </div>
              </div>
            )}
            {event.newSiren !== null && (
              <div className="mt-2 text-sm">
                <div className="mb-4 flex justify-between items-center">
                  <div className="text-gray-425">
                    <span className="font-normal text-black">{event.userName}</span> a modifié le <span className="font-semibold text-black">SIREN</span>
                  </div>
                  <div className="border-t border-gray-900 mx-2 flex-1"></div>
                  <div className="text-gray-425">
                    <span>{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                  </div>
                </div>

                <div className="flex">
                  <div className="flex-1">
                    <p className="text-sm">Avant</p>
                    <p className="text-sm text-gray-425 mt-4">{event.initialSiren || "-"}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Après</p>
                    <p className="text-sm text-gray-425 mt-4">{event.newSiren}</p>
                  </div>
                </div>
              </div>
            )}
            {event.newRNA !== null && (
              <div className="mt-2 text-sm">
                <div className="mb-4 flex justify-between items-center">
                  <div className="text-gray-425">
                    <span className="font-normal text-black">{event.userName}</span> a modifié le <span className="font-semibold text-black">RNA</span>
                  </div>
                  <div className="border-t border-gray-900 mx-2 flex-1"></div>

                  <div className="text-gray-425">
                    <span>{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                  </div>
                </div>

                <div className="flex">
                  <div className="flex-1">
                    <p className="text-sm">Avant</p>
                    <p className="text-sm text-gray-425 mt-4">{event.initialRNA || "-"}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Après</p>
                    <p className="text-sm text-gray-425 mt-4">{event.newRNA}</p>
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
          active ? "border-t-2 border-blue-france bg-white text-blue-france hover:bg-gray-975" : "border-0 bg-tab-main hover:bg-tab-hover"
        } flex translate-y-px cursor-pointer items-center border-x border-x-gray-900 px-4 py-2`}
      >
        <p>{title}</p>
      </div>
    </div>
  );
};

export default MissionModal;
