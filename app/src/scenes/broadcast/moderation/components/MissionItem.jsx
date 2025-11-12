import { Menu, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { BsDot } from "react-icons/bs";
import { RiCalendarEventFill, RiCheckboxCircleFill, RiCloseCircleFill, RiMapPin2Fill, RiMoreFill, RiPencilFill, RiTimeLine } from "react-icons/ri";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import Modal from "../../../../components/Modal";
import api from "../../../../services/api";
import { captureError } from "../../../../services/error";
import useStore from "../../../../services/store";
import { JVA_MODERATION_COMMENTS_LABELS, STATUS, STATUS_COLORS } from "./Constants";
import OrganizationRefusedModal from "./OrganizationRefusedModal";

const MissionItem = ({ data, history, selected, onChange, onSelect, onFilter, onChangeMany }) => {
  const { publisher } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [values, setValues] = useState(data);
  const [potentialUpdates, setPotentialUpdates] = useState(0);
  const [isOrganizationRefusedOpen, setIsOrganizationRefusedOpen] = useState(false);

  useEffect(() => {
    setValues(data);
  }, [data]);

  const handleSelectModeration = (e) => {
    e.stopPropagation();
    onSelect();
  };

  const handleSubmit = async (v) => {
    try {
      setValues({ ...values, ...v });

      if (v.status === "REFUSED" && !v.comment) return;

      const res = await api.put(`/moderation/${data._id}`, { ...v, moderatorId: publisher.id });
      if (!res.ok) {
        if (res.error === "COMMENT_REQUIRED") {
          toast.error("Le commentaire est requis pour refuser la mission");
          return;
        }
        throw res;
      }
      toast.success("La mission a été modérée avec succès");
      onChange(res.data);
      if (v.status === "REFUSED" && ["ORGANIZATION_NOT_COMPLIANT", "ORGANIZATION_ALREADY_PUBLISHED"].includes(v.comment)) {
        const resO = await api.post("/moderation/search", { moderatorId: publisher.id, organizationName: data.organizationName, status: "PENDING", size: 0 });
        if (!resO.ok) throw resO;
        if (resO.total > 0) {
          setPotentialUpdates(resO.total);
          setIsOrganizationRefusedOpen(true);
        }
      }
    } catch (error) {
      captureError(error, "Une erreur est survenue");
    }
  };

  const handleMissionClick = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("mission", data._id);
    setSearchParams(newSearchParams);
  };

  return (
    <>
      <OrganizationRefusedModal
        isOpen={isOrganizationRefusedOpen}
        onClose={() => setIsOrganizationRefusedOpen(false)}
        data={data}
        update={values}
        onChange={onChangeMany}
        total={potentialUpdates}
      />
      <span className="flex w-[5%] items-center">
        <label htmlFor="moderation-select" className="sr-only">
          Sélectionner la mission
        </label>
        <input id="moderation-select" type="checkbox" className="checkbox" name="moderation-select" onChange={handleSelectModeration} checked={selected} />
      </span>
      <div className="flex flex-1 flex-col justify-between">
        <div className="hover:text-blue-france my-2 line-clamp-3 flex items-center text-base font-semibold hover:cursor-pointer" onClick={handleMissionClick}>
          {data.newTitle || data.title}
        </div>
        <div className="text-gray-425 mb-2 flex items-center gap-4">
          {data.city && (
            <span className="flex items-center">
              <RiMapPin2Fill className="mr-2" />
              {`${data.city} ${data.departmentCode ? `(${data.departmentCode})` : ""}`}
            </span>
          )}
          <span className="flex items-center">
            <RiCalendarEventFill className="mr-2" />
            {data.startAt && `Du ${new Date(data.startAt).toLocaleDateString("fr")}`}
            {data.endAt && ` au ${new Date(data.endAt).toLocaleDateString("fr")}`}
          </span>
        </div>
        <div className="text-gray-425 flex items-center">
          <RiTimeLine className="mr-2 text-xs" />
          Postée le {new Date(data.postedAt).toLocaleDateString("fr")} sur {data.publisherName}
        </div>
      </div>
      <div className="flex w-[25%] flex-col justify-between px-2">
        <span className="max-h-12 truncate">{data.organizationName}</span>
        <div>
          <div className="my-2 inline-flex flex-wrap items-center gap-1 rounded border border-gray-900 p-1">
            <span>Missions</span>
            <RiCheckboxCircleFill className="text-green-success" />
            <span className="text-green-success">{history["ACCEPTED"] || "0"}</span>
            <BsDot className="text-gray-425" />
            <RiCloseCircleFill className="text-red-error" />
            <span className="text-red-error">{history["REFUSED"] || "0"}</span>
          </div>
        </div>
        {data.associationSources?.length ? (
          <span className="text-gray-425">
            {data.associationSources.length > 0 && `Inscrite sur ${data.associationSources.map((a) => (a === "Je veux aider" ? "JeVeuxAider.gouv.fr" : a)).join(", ")}`}
          </span>
        ) : (
          <span className="text-gray-425">Pas d'inscription retrouvée</span>
        )}
      </div>

      <div className="flex h-full w-[30%] flex-col justify-center gap-3 px-2">
        <div className="flex items-center gap-3">
          <select
            className="select flex-1 border-b-2 pr-2"
            style={{ borderBottomColor: STATUS_COLORS[values.status] }}
            name="status"
            value={values.status}
            onChange={(e) => handleSubmit({ status: e.target.value })}
          >
            {Object.entries(STATUS).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>
          <MissionActionsMenu data={data} onFilter={onFilter} onChange={(v) => onChange({ ...data, ...v })} />
        </div>
        {values.status === "REFUSED" && (
          <select className="select" name="motif" value={values.comment} onChange={(e) => handleSubmit({ status: "REFUSED", comment: e.target.value })}>
            <option value="">Motif de refus</option>
            {Object.entries(JVA_MODERATION_COMMENTS_LABELS).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>
        )}
        {values.note && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            <RiPencilFill />
            <div className="italic">{values.note}</div>
          </div>
        )}
      </div>
    </>
  );
};

const MissionActionsMenu = ({ data, onFilter, onChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const handleMissionClick = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("mission", data._id);
    setSearchParams(newSearchParams);
  };

  return (
    <>
      <Menu as="div" className="relative h-full text-left">
        <Menu.Button as="div" className="hover:bg-gray-975 flex h-full cursor-pointer items-center justify-between gap-4 border border-black px-3 text-sm">
          <span className="font-semibold">
            <RiMoreFill />
          </span>
        </Menu.Button>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items as="div" className="absolute right-0 z-30 mt-2 w-64 origin-top-right border border-gray-900 bg-white text-black focus:outline-none">
            <Menu.Item>
              <button onClick={handleMissionClick} className="text-blue-france flex w-full cursor-pointer items-center border-none p-3 text-left text-sm hover:bg-gray-950">
                Aperçu de la mission
              </button>
            </Menu.Item>
            <Menu.Item>
              <a
                href={data.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-france flex w-full cursor-pointer items-center border-none p-3 text-left text-sm hover:bg-gray-950"
              >
                Lien de la mission
              </a>
            </Menu.Item>
            <Menu.Item>
              {data.note ? (
                <button
                  className="text-blue-france flex w-full cursor-pointer items-center border-none p-3 text-left text-sm hover:bg-gray-950"
                  onClick={() => setIsModalOpen(true)}
                >
                  Modifier la note
                </button>
              ) : (
                <button
                  className="text-blue-france flex w-full cursor-pointer items-center border-none p-3 text-left text-sm hover:bg-gray-950"
                  onClick={() => setIsModalOpen(true)}
                >
                  Ajouter une note interne
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              <button
                className="text-blue-france flex w-full cursor-pointer items-center border-none p-3 text-left text-sm hover:bg-gray-950"
                onClick={() => onFilter(data.organizationName)}
              >
                Filter les missions de l'organisation
              </button>
            </Menu.Item>
          </Menu.Items>
        </Transition>
      </Menu>
      <UpdateNoteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onChange={onChange} data={data} />
    </>
  );
};

const UpdateNoteModal = ({ isOpen, onChange, onClose, data }) => {
  const { publisher } = useStore();
  const [note, setNote] = useState(data.note || "");

  useEffect(() => {
    setNote(data.note || "");
  }, [data]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/moderation/${data._id}`, { note, moderatorId: publisher.id });
      if (!res.ok) throw res;
      toast.success("La note a été mise à jour avec succès");
      onChange({ note });
      onClose();
    } catch (error) {
      captureError(error, "Une erreur est survenue");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => onClose()}>
      <form className="px-32 py-16" onSubmit={handleSubmit}>
        <h1 className="mb-10">Modifier la note</h1>
        <div className="flex items-center justify-center">
          <div className="flex w-full flex-col justify-center gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="note" className="text-sm">
                Note
              </label>
              <textarea id="note" className="input" rows={4} name="note" value={note} onChange={(e) => setNote(e.target.value)} required />
              <div className="mt-6 flex justify-end">
                <button className="primary-btn w-full" type="submit">
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default MissionItem;
