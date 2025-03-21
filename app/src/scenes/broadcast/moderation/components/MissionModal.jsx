import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { useEffect, useState } from "react";
import { HiX } from "react-icons/hi";
import { RiCheckboxCircleFill, RiCloseCircleFill, RiErrorWarningFill, RiExternalLinkLine, RiTimeFill } from "react-icons/ri";
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
      if (!res.ok) throw res;
      toast.success("La mission a été modérée avec succès", {
        position: "bottom-right",
      });

      setData(res.data);
      onChange(res.data);

      if (doc.status === "REFUSED" && doc.comment.includes("L'organisation")) setIsOrganizationRefusedOpen(true);
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
        <DialogPanel transition className="w-full h-full bg-beige p-6 backdrop-blur-2xl duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0">
          <div className="absolute right-2 top-2 cursor-pointer p-3">
            <HiX className="text-blue-dark text-lg" onClick={handleClose} />
          </div>
          <div className="max-h-[100%] overflow-y-auto">
            <OrganizationRefusedModal
              isOpen={isOrganizationRefusedOpen}
              onClose={() => setIsOrganizationRefusedOpen(false)}
              organizationName={data.organizationName}
              comment={values.comment}
              onChange={onChange}
            />
            <div className="px-20">
              <div className="flex gap-8 pb-8 justify-between items-center sticky top-0 z-50 h-full bg-beige border-b border-gray-border">
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
                    <div className="w-2/3 border border-gray-border bg-white">
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
            className={`input mb-2 ${error ? "border-b-red-main" : "border-b-black"}`}
            id="new-mission-title"
            name="new-mission-title"
            placeholder={data.title}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          {error && (
            <div className="flex items-center text-sm text-red-main">
              <RiErrorWarningFill className="mr-2" />
              {error}
            </div>
          )}
          <p className="text-xs text-gray-dark">
            <span className="mr-1 font-semibold">Titre d'origine:</span>
            {data.title}
          </p>
          {newTitle !== data.title && newTitle !== data.newTitle && (
            <button className="button bg-blue-dark text-white hover:bg-blue-main mt-4 w-[25%]" type="submit">
              Enregistrer
            </button>
          )}
        </div>
        <div className="border-t border-gray-border" />
        <div className="flex flex-col space-y-2">
          <label className="mb-2 text-sm" htmlFor="description">
            Description
          </label>
          <div
            className="rounded-t overflow-hidden p-6 text-sm text-gray-dark border border-gray-border bg-gray-light"
            dangerouslySetInnerHTML={{ __html: data.description.replace(/\n/g, "<br />") }}
          />
        </div>
        <div className="border-t border-gray-border" />
        <div className="flex flex-col space-y-2 py-2">
          <label className="text-sm" htmlFor="title">
            Lieu de la mission
          </label>
          <p className="text-sm text-gray-dark">
            {data.departmentName} ({data.departmentCode})
          </p>
        </div>
        <div className="border-t border-gray-border" />
        <div className="flex flex-col space-y-2 py-2">
          <label className="text-sm" htmlFor="title">
            Date de la mission
          </label>
          <p className="text-sm text-gray-dark">À partir du {new Date(data.startAt).toLocaleDateString("fr", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <div className="border-t border-gray-border" />
        <div className="flex flex-col space-y-2 py-2">
          <label className="text-sm" htmlFor="title">
            Date de création
          </label>
          <p className="text-sm text-gray-dark">
            Postée le {new Date(data.postedAt).toLocaleDateString("fr")} sur {data.publisherName}
          </p>
        </div>
        <div className="border-t border-gray-border" />
        <div className="flex flex-col space-y-2 py-2">
          <label className="text-sm" htmlFor="title">
            Lien de la mission
          </label>
          <div className="flex items-center gap-2">
            <Link
              to={data.applicationUrl.includes("http") ? data.applicationUrl : `https://${data.applicationUrl}`}
              className="text-sm text-blue-dark underline w-fit"
              target="_blank"
            >
              Ouvrir le lien de la mission
            </Link>
            <RiExternalLinkLine />
          </div>
        </div>
        <div className="border-t border-gray-border" />
        <div className="flex flex-col space-y-2 py-2">
          <label className="text-sm" htmlFor="title">
            ID
          </label>
          <p className="text-sm text-gray-dark">{data._id}</p>
        </div>
      </div>
    </form>
  );
};

const OrganizationTab = ({ data, onChange }) => {
  const [siren, setSiren] = useState(data.associationSiren);
  const [rna, setRna] = useState(data.associationRNA);

  useEffect(() => {
    setSiren(data.associationSiren);
    setRna(data.associationRNA);
  }, [data.associationSiren, data.associationRNA]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const obj = {};
    if (siren !== data.newAssociationSiren) obj.associationSiren = siren;
    if (rna !== data.newAssociationRNA) obj.associationRNA = rna;
    onChange(obj);
  };

  return (
    <form className="flex h-full divide-x" onSubmit={handleSubmit}>
      <div className="flex flex-1 flex-col gap-2 p-8">
        <div className="flex flex-col gap-2">
          <label className="text-sm" htmlFor="association-name">
            Nom de l'organisation
          </label>
          <input id="association-name" className="input mb-2" disabled name="association-name" defaultValue={data.organizationName} />
        </div>
        <div className="flex flex-col gap-2 py-2">
          <label className="text-sm" htmlFor="association-siren">
            SIRET
          </label>
          <input
            id="association-siren"
            className="input mb-2"
            name="association-siren"
            placeholder={data.associationSiren}
            value={siren}
            onChange={(e) => setSiren(e.target.value)}
          />
          <p className="text-xs text-gray-dark">
            <span className="mr-1 font-semibold">SIRET d'origine:</span>
            {data.associationSiren ? data.associationSiren : "/"}
          </p>
        </div>
        <div className="flex flex-col space-y-2 py-2">
          <label className="text-sm" htmlFor="association-rna">
            RNA
          </label>
          <input id="association-rna" className="input mb-2" name="association-rna" placeholder={data.associationRNA} value={rna} onChange={(e) => setRna(e.target.value)} />
          <p className="text-xs text-gray-dark">
            <span className="mr-1 font-semibold">RNA d'origine:</span>
            {data.associationRNA ? data.associationRNA : "/"}
          </p>
        </div>
        {(siren !== data.associationSiren || rna !== data.associationRNA) && (
          <button className="button bg-blue-dark text-white hover:bg-blue-main mt-4 w-[25%]" type="submit">
            Enregistrer
          </button>
        )}

        <div className="flex flex-col gap-2 border-t border-gray-border py-4">
          <label className="text-sm" htmlFor="title">
            Adresse
          </label>
          <p className="text-sm text-gray-dark">{data.organizationFullAddress ? data.organizationFullAddress : "/"}</p>
        </div>
        <div className="flex flex-col gap-2 border-t border-gray-border py-4">
          <label className="text-sm" htmlFor="title">
            Domaine d'action
          </label>
          <p className="text-sm text-gray-dark">{DOMAINS[data.domain]}</p>
        </div>
        <div className="flex flex-col gap-2 border-t border-gray-border py-4">
          <label className="text-sm" htmlFor="title">
            Organisation déjà inscrite sur
          </label>
          <p className="text-sm text-gray-dark">
            {data.associationSources ? data.associationSources.map((s) => (s === "Je veux aider" ? "JeVeuxAider.gouv.fr" : s)).join(", ") : "/"}
          </p>
        </div>
        <div className="flex flex-col gap-2 border-t border-gray-border py-4">
          <label className="text-sm" htmlFor="title">
            Site internet
          </label>
          <a href={data.organizationUrl} className="text-sm text-blue-dark underline" target="_blank">
            {data.organizationUrl}
          </a>
        </div>
      </div>
    </form>
  );
};

const HistoryTab = ({ data }) => {
  const { publisher } = useStore();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.post(`/moderation-event/search`, { missionId: data._id, moderatorId: publisher._id });
        if (!res.ok) throw res;
        setEvents(res.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
    };

    fetchData();
  }, [data, publisher._id]);

  if (!events) {
    return <Loader />;
  }

  const statusChanges = events.filter((event) => event.initialStatus !== event.newStatus || event.initialComment !== event.newComment);
  const modifications = events.filter(
    (event) => event.initialNote !== event.newNote || event.initialTitle !== event.newTitle || event.initialSiren !== event.newSiren || event.initialRNA !== event.newRNA,
  );

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {statusChanges.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-gray-dark text-xs font-semibold mb-4">EVOLUTION DES STATUTS</div>
          {statusChanges.map((event, index) => (
            <div key={index} className="flex flex-col gap-2">
              {event.initialStatus !== event.newStatus && (
                <div className="">
                  <div className="flex justify-between items-center">
                    <div className="text-gray-dark text-sm">
                      {event.newStatus === "ACCEPTED" ? (
                        <RiCheckboxCircleFill className="inline text-4xl text-green-600 mr-2" />
                      ) : event.newStatus === "REFUSED" ? (
                        <RiCloseCircleFill className="inline text-4xl text-red-600 mr-2" />
                      ) : (
                        <RiTimeFill className="inline text-4xl text-orange-600 mr-2" />
                      )}
                      <span className="font-semibold text-black">{event.userName}</span> a passé le statut à{" "}
                      <span className="font-semibold text-black">{STATUS[event.newStatus]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-dark text-sm">{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                    </div>
                  </div>
                  {index < statusChanges.length - 1 && <div className="h-[30px] ml-4 mt-2 border-l border-gray-border" />}
                </div>
              )}
              {event.newComment !== null && event.initialComment !== event.newComment && (
                <>
                  <div className="flex justify-between items-center">
                    <div className="text-gray-dark text-sm">
                      <RiCloseCircleFill className="inline text-4xl text-red-600 mr-2" />
                      <span className="font-semibold text-black">{event.userName}</span> a modifié le motif de refus en{" "}
                      <span className="font-semibold text-black">{event.newComment}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-dark text-sm">{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                    </div>
                  </div>
                  <div className="h-[30px] ml-4 border-l border-gray-border" />
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {modifications.length > 0 && (
        <div className="flex flex-col gap-4 mt-4">
          <div className="flex items-center gap-2 text-gray-dark text-xs font-semibold">MODIFICATIONS</div>
          {modifications.map((event, index) => (
            <div key={index} className="flex flex-col gap-2">
              {event.newNote !== null && event.initialNote !== event.newNote && (
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-dark">
                    <span className="text-black">{event.userName}</span> a modifié la note en <span className="font-semibold text-black">{event.newNote}</span>
                  </div>
                  <div className="text-gray-dark text-sm">
                    <span>{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                  </div>
                </div>
              )}
              {event.initialTitle !== event.newTitle && (
                <div className="mt-2 text-sm">
                  <div className="mb-4 flex justify-between items-center">
                    <div className="text-gray-dark">
                      <span className="font-normal text-black">{event.userName}</span> a modifié le <span className="font-semibold text-black">titre de la mission</span>
                    </div>
                    <div className="border-t border-gray-border mx-2 flex-1"></div>
                    <div className="text-gray-dark">
                      <span>{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <div>
                      <p className="text-xs">Avant</p>
                      <p className="text-xs text-gray-dark mt-4">{event.initialTitle}</p>
                    </div>
                    <div>
                      <p className="text-xs">Après</p>
                      <p className="text-xs text-gray-dark mt-4">{event.newTitle}</p>
                    </div>
                  </div>
                </div>
              )}
              {event.initialSiren !== event.newSiren && (
                <div className="mt-2 text-sm">
                  <div className="mb-4 flex justify-between items-center">
                    <div className="text-gray-dark">
                      <span className="font-normal text-black">{event.userName}</span> a modifié le <span className="font-semibold text-black">SIREN</span>
                    </div>
                    <div className="border-t border-gray-border mx-2 flex-1"></div>
                    <div className="text-gray-dark">
                      <span>{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                    </div>
                  </div>

                  <div className="flex">
                    <div className="flex-1">
                      <p className="text-xs">Avant</p>
                      <p className="text-xs text-gray-dark mt-4">{!event.initialSiren || event.initialSiren === "" ? "-" : event.initialSiren}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs">Après</p>
                      <p className="text-xs text-gray-dark mt-4">{event.newSiren}</p>
                    </div>
                  </div>
                </div>
              )}
              {event.initialRNA !== event.newRNA && (
                <div className="mt-2 text-sm">
                  <div className="mb-4 flex justify-between items-center">
                    <div className="text-gray-dark">
                      <span className="font-normal text-black">{event.userName}</span> a modifié le <span className="font-semibold text-black">RNA</span>
                    </div>
                    <div className="border-t border-gray-border mx-2 flex-1"></div>

                    <div className="text-gray-dark">
                      <span>{new Date(event.createdAt).toLocaleDateString("fr")}</span>
                    </div>
                  </div>

                  <div className="flex">
                    <div className="flex-1">
                      <p className="text-xs">Avant</p>
                      <p className="text-xs text-gray-dark mt-4">{!event.initialRNA || event.initialRNA === "" ? "-" : event.initialRNA}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs">Après</p>
                      <p className="text-xs text-gray-dark mt-4">{event.newRNA}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {statusChanges.length === 0 && modifications.length === 0 && <div className="text-center text-gray-dark">Aucun événement de modération trouvé.</div>}
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
          active ? "border-t-2 border-blue-dark bg-white text-blue-dark hover:bg-gray-hover" : "border-0 bg-tab-main hover:bg-tab-hover"
        } flex translate-y-[1px] cursor-pointer items-center border-x border-x-gray-border px-4 py-2`}
      >
        <p>{title}</p>
      </div>
    </div>
  );
};

export default MissionModal;
