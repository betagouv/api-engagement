import { toast } from "@/services/toast";
import { useEffect, useId, useRef, useState } from "react";
import { BsDot } from "react-icons/bs";
import { RiCalendarEventFill, RiCheckboxCircleFill, RiCloseCircleFill, RiErrorWarningFill, RiMapPin2Fill, RiMoreFill, RiPencilFill, RiTimeLine } from "react-icons/ri";
import { useSearchParams } from "react-router-dom";

import Modal from "@/components/Modal";
import { JVA_MODERATION_COMMENTS_LABELS, STATUS, STATUS_COLORS } from "@/scenes/broadcast/moderation/components/Constants";
import OrganizationRefusedModal from "@/scenes/broadcast/moderation/components/OrganizationRefusedModal";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";

const MissionItem = ({ data, history, selected, onChange, onSelect, onFilter, onChangeMany }) => {
  const { publisher } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [values, setValues] = useState(data);
  const [missionToRefuse, setMissionToRefuse] = useState(0);

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

      if (v.status === "REFUSED" && !v.comment) {
        return;
      }

      const res = await api.put(`/moderation/${data.id}`, { ...v, moderatorId: publisher.id });
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
        const resO = await api.post("/moderation/search", { moderatorId: publisher.id, organizationIds: [data.missionPublisherOrganizationId], status: "PENDING", size: 0 });
        if (!resO.ok) {
          throw resO;
        }
        setMissionToRefuse(resO.total);
      }
    } catch (error) {
      captureError(error, { extra: { data } });
    }
  };

  const handleMissionClick = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("mission", data.id);
    setSearchParams(newSearchParams);
  };

  return (
    <>
      <OrganizationRefusedModal open={missionToRefuse > 0} onClose={() => setMissionToRefuse(0)} data={data} update={values} onChange={onChangeMany} total={missionToRefuse} />
      <td className="table-cell align-middle">
        <div className="flex items-center">
          <label className="flex w-14 items-center">
            <span className="sr-only">Sélectionner la mission</span>
            <input type="checkbox" className="checkbox" onChange={handleSelectModeration} checked={selected} />
          </label>

          <div className="flex flex-1 flex-col justify-between py-2">
            <button
              type="button"
              className="hover:text-blue-france my-2 line-clamp-3 flex items-center text-left text-base font-semibold hover:cursor-pointer"
              onClick={handleMissionClick}
            >
              {data.title || data.missionTitle}
            </button>
            <div className="text-text-mention mb-2 flex items-center gap-4 text-xs">
              {data.missionCity && (
                <span className="flex items-center">
                  <RiMapPin2Fill className="mr-2" aria-hidden="true" />
                  {`${data.missionCity} ${data.missionDepartmentCode ? `(${data.missionDepartmentCode})` : ""}`}
                </span>
              )}
              <span className="flex items-center text-xs">
                <RiCalendarEventFill className="mr-2" aria-hidden="true" />
                {data.missionStartAt && `Du ${new Date(data.missionStartAt).toLocaleDateString("fr")}`}
                {data.missionEndAt && ` au ${new Date(data.missionEndAt).toLocaleDateString("fr")}`}
              </span>
            </div>
            <div className="text-text-mention flex items-center text-xs">
              <RiTimeLine className="mr-2 text-xs" aria-hidden="true" />
              Postée le {new Date(data.missionPostedAt).toLocaleDateString("fr")} sur {data.missionPublisherName}
            </div>
          </div>
        </div>
      </td>
      <td className="table-cell">
        <div className="flex flex-1 flex-col justify-between gap-2 text-xs">
          <p className="w-full text-ellipsis">{data.missionOrganizationName}</p>

          {data.associationSources?.length ? (
            <span className="text-text-mention">
              {data.associationSources.length > 0 && `Inscrite sur ${data.associationSources.map((a) => (a === "Je veux aider" ? "JeVeuxAider.gouv.fr" : a)).join(", ")}`}
            </span>
          ) : (
            <span className="text-text-mention">Pas d'inscription retrouvée</span>
          )}

          <div className="border-grey-border my-2 inline-flex w-fit flex-wrap items-center gap-1 rounded border p-1">
            <span>Missions</span>
            <RiCheckboxCircleFill role="img" aria-label="Acceptées" className="text-success" />
            <span className="text-success">{history["ACCEPTED"] || "0"}</span>
            <BsDot className="text-text-mention" />
            <RiCloseCircleFill role="img" aria-label="Refusées" className="text-error" />
            <span className="text-error">{history["REFUSED"] || "0"}</span>
          </div>
        </div>
      </td>
      <td className="table-cell align-middle">
        <div className="flex w-full flex-col gap-3">
          <div className="flex w-full items-center gap-3">
            <select
              className="select flex-1 border-b-2 pr-2"
              style={{ borderBottomColor: STATUS_COLORS[values.status] }}
              name="status"
              aria-label="Statut de la mission"
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
            <select
              className="select mt-4 w-full border-b-2"
              name="motif"
              aria-label="Motif de refus"
              value={values.comment}
              onChange={(e) => handleSubmit({ status: "REFUSED", comment: e.target.value })}
            >
              <option value="">Motif de refus</option>
              {Object.entries(JVA_MODERATION_COMMENTS_LABELS).map(([key, value]) => (
                <option key={key} value={key} className="whitespace-nowrap text-black">
                  {value}
                </option>
              ))}
            </select>
          )}
          {values.note && (
            <div className="mt-1 flex items-center gap-2 text-xs">
              <RiPencilFill aria-hidden="true" />
              <div className="italic">{values.note}</div>
            </div>
          )}
        </div>
      </td>
    </>
  );
};

const MissionActionsMenu = ({ data, onFilter, onChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const ref = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setShow(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    if (!show) {
      return;
    }
    const handleClose = () => setShow(false);
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    return () => {
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
    };
  }, [show]);

  const handleToggle = () => {
    if (!show && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setShow(!show);
  };

  const handleFocusOut = (e) => {
    if (ref.current && !ref.current.contains(e.relatedTarget)) {
      setShow(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setShow(false);
      buttonRef.current?.focus();
    }
  };

  const handleMissionClick = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("mission", data.id);
    setSearchParams(newSearchParams);
    setShow(false);
  };

  const handleOpenNote = () => {
    setShow(false);
    setIsModalOpen(true);
  };

  const handleFilterOrganization = () => {
    setShow(false);
    onFilter(data.missionPublisherOrganizationId);
  };

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Le conteneur délègue Échap et la sortie du focus aux éléments interactifs du menu. */}
      <div className="relative h-full text-left" ref={ref} onBlur={handleFocusOut} onKeyDown={handleKeyDown}>
        <button ref={buttonRef} type="button" className="secondary-btn shadow-border-black text-black" aria-label="Plus d'actions" aria-expanded={show} onClick={handleToggle}>
          <RiMoreFill aria-hidden="true" />
        </button>
        {/* fixed + position calculée : les conteneurs overflow-x-auto du tableau clippent tout panneau en absolute (et un panneau resté dans le DOM y crée du scroll) */}
        <div className={`border-grey-border fixed z-30 w-64 border bg-white shadow-lg ${show ? "" : "hidden"}`} style={{ top: position.top, right: position.right }}>
          <ul className="m-0 flex list-none flex-col p-0">
            <li>
              <button type="button" className="nav-link text-left" onClick={handleMissionClick}>
                Aperçu de la mission
              </button>
            </li>
            <li>
              <a href={data.missionApplicationUrl} target="_blank" rel="noopener noreferrer" className="nav-link" onClick={() => setShow(false)}>
                Lien de la mission
              </a>
            </li>
            <li>
              <button type="button" className="nav-link text-left" onClick={handleOpenNote}>
                {data.note ? "Modifier la note" : "Ajouter une note interne"}
              </button>
            </li>
            <li>
              <button type="button" className="nav-link text-left" onClick={handleFilterOrganization}>
                Filtrer les missions de l'organisation
              </button>
            </li>
          </ul>
        </div>
      </div>
      <UpdateNoteModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onChange={onChange} data={data} />
    </>
  );
};

const UpdateNoteModal = ({ open, onChange, onClose, data }) => {
  const { publisher } = useStore();
  const noteId = useId();
  const [note, setNote] = useState(data.note || "");
  const [error, setError] = useState("");

  useEffect(() => {
    setNote(data.note || "");
    setError("");
  }, [data]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (note.trim() === "") {
      setError("Le champ Note est obligatoire.");
      return;
    }
    try {
      const res = await api.put(`/moderation/${data.id}`, { note, moderatorId: publisher.id });
      if (!res.ok) {
        throw res;
      }
      toast.success("La note a été mise à jour avec succès");
      onChange({ note });
      onClose();
    } catch (error) {
      captureError(error, { extra: { data, note, moderatorId: publisher.id } });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Modifier la note" className="w-[90vw] max-w-3xl">
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex items-center justify-center">
          <div className="flex w-full flex-col justify-center gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor={noteId} className="text-sm">
                Note<span className="text-error ml-1">*</span>
              </label>
              <textarea
                id={noteId}
                className="input"
                rows={4}
                name="note"
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setError("");
                }}
                required
                aria-required="true"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${noteId}-error` : undefined}
              />
              {error && (
                <p id={`${noteId}-error`} className="text-error flex items-center text-sm" aria-live="polite">
                  <RiErrorWarningFill className="mr-2" aria-hidden="true" />
                  {error}
                </p>
              )}
              <div className="mt-6 flex justify-end">
                <button className="primary-btn w-full" type="submit" disabled={!note.trim() || error}>
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
