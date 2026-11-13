import { useEffect, useState } from "react";
import { RiArrowLeftLine, RiExternalLinkLine } from "react-icons/ri";
import { Link, useParams } from "react-router-dom";

import Avatar from "@/components/Avatar";
import Loader from "@/components/Loader";
import Modal from "@/components/Modal";
import Select from "@/components/Select";
import Tabs from "@/components/Tabs";
import LabelledTextarea from "@/components/form/LabelledTextarea";
import { WARNING_STATUS, WARNINGS } from "@/constants";
import AlertComments from "@/scenes/admin-warning/components/AlertComments";
import AlertOccurrences from "@/scenes/admin-warning/components/AlertOccurrences";
import { formatDateTime } from "@/scenes/admin-warning/components/Alerts";
import api from "@/services/api";
import { captureError } from "@/services/error";

const DETAIL_TABS = [
  { key: "comments", label: "Commentaires" },
  { key: "history", label: "Historique des réceptions" },
];

const STATUS_OPTIONS = Object.entries(WARNING_STATUS).map(([value, { name }]) => ({ value, label: name }));

// Passages qui demandent une confirmation (commentaire optionnel) avant d'être enregistrés.
const CONFIRM_STATUS = {
  IGNORED: { title: "Ignorer l’alerte", action: "Ignorer l’alerte", hint: "Pourquoi cette alerte est-elle ignorée ?" },
  RESOLVED: { title: "Résoudre l’alerte", action: "Résoudre l’alerte", hint: "Comment cette alerte a-t-elle été résolue ?" },
};

const formatDate = (date) => new Date(date).toLocaleDateString("fr-FR");

const AlertDetail = () => {
  const { id } = useParams();
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("comments");
  const [pending, setPending] = useState(null);
  const [comment, setComment] = useState("");
  const [commentsVersion, setCommentsVersion] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/warning/${id}`);
        if (!res.ok) throw res;
        setAlert(res.data);
      } catch (error) {
        captureError(error, { extra: { alertId: id } });
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const saveStatus = async (status, body) => {
    setSaving(true);
    try {
      const res = await api.put(`/warning/${id}/status`, { status, comment: body || undefined });
      if (!res.ok) throw res;
      setAlert(res.data);
      setCommentsVersion((v) => v + 1);
    } catch (error) {
      captureError(error, {
        message: error?.code === "RESSOURCE_ALREADY_EXIST" ? "Une alerte ouverte existe déjà pour ce partenaire et ce type" : "Impossible de modifier le statut",
        extra: { alertId: id },
      });
    }
    setSaving(false);
  };

  const handleStatus = ({ value }) => {
    if (!value || value === alert.status) return;
    if (CONFIRM_STATUS[value]) {
      setComment("");
      setPending(value);
    } else saveStatus(value);
  };

  const closeModal = () => setPending(null);

  const confirm = async (e) => {
    e.preventDefault();
    const status = pending;
    closeModal();
    await saveStatus(status, comment.trim());
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader />
      </div>
    );
  }

  const back = (
    <Link to="/admin-warning" className="link flex items-center gap-2">
      <RiArrowLeftLine aria-hidden="true" /> Retour aux alertes
    </Link>
  );
  if (!alert)
    return (
      <div className="space-y-4">
        {back}
        <p>Alerte introuvable</p>
      </div>
    );

  const label = WARNINGS[alert.type] || WARNINGS.OTHER_WARNING;
  return (
    <div className="space-y-8">
      {back}
      <div className="flex items-center gap-6">
        {alert.publisherLogo ? (
          <img className="h-20 w-36 shrink-0 object-contain" src={alert.publisherLogo} alt="" aria-hidden="true" />
        ) : (
          <div className="bg-grey-200 h-20 w-36 shrink-0" />
        )}
        <div>
          <p className="text-text-mention text-sm">{alert.publisherName}</p>
          <h2 className="text-2xl font-bold">{alert.title || label.name}</h2>
          <p className="text-sm">
            {label.name}
            {alert.itemLabel ? ` · ${alert.itemLabel}` : ""} · {alert.occurrences} occurrence{alert.occurrences > 1 ? "s" : ""}
          </p>
          <Link className="tertiary-btn mt-3" to={`/${alert.publisherId}/performance`}>
            Accéder à l’espace du partenaire
          </Link>
        </div>
      </div>
      {alert.description && <p className="whitespace-pre-line">{alert.description}</p>}
      <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <dt className="font-bold">Statut</dt>
          <dd className="mt-2 max-w-xs">
            <Select options={STATUS_OPTIONS} value={alert.status} onChange={handleStatus} loading={saving} placeholder="Statut" />
          </dd>
        </div>
        <div>
          <dt className="font-bold">Notifiée le</dt>
          <dd>{alert.notifiedAt ? formatDateTime(alert.notifiedAt) : "Non notifiée"}</dd>
        </div>
        <div>
          <dt className="font-bold">Créée le</dt>
          <dd>{formatDateTime(alert.createdAt)}</dd>
        </div>
        {alert.status === "IGNORED" && alert.ignoredAt && (
          <>
            <div>
              <dt className="font-bold">Ignorée le</dt>
              <dd>{formatDateTime(alert.ignoredAt)}</dd>
            </div>
            <div>
              <dt className="font-bold">Réouverture automatique le</dt>
              <dd>{formatDate(alert.ignoreUntil)}</dd>
            </div>
          </>
        )}
        {alert.status === "RESOLVED" && alert.resolvedAt && (
          <div>
            <dt className="font-bold">Résolue le</dt>
            <dd>{formatDateTime(alert.resolvedAt)}</dd>
          </div>
        )}
        <div>
          <dt className="font-bold">Chargés de déploiement</dt>
          <dd>
            {alert.assignees.length ? (
              <ul className="space-y-2">
                {alert.assignees.map((a) => (
                  <li key={a.id} className="flex items-center gap-2">
                    <Avatar user={a} className="h-10 w-10" />
                    {a.firstname} {a.lastname}
                  </li>
                ))}
              </ul>
            ) : (
              "Aucun assigné"
            )}
          </dd>
        </div>
        {alert.procedureUrl && (
          <div>
            <dt className="font-bold">Procédure</dt>
            <dd>
              <a className="primary-btn gap-2" href={alert.procedureUrl} target="_blank" rel="noopener noreferrer">
                Consulter la procédure
                <RiExternalLinkLine aria-hidden="true" />
                <span className="sr-only">(nouvel onglet)</span>
              </a>
            </dd>
          </div>
        )}
      </dl>
      <div>
        <Tabs
          tabs={DETAIL_TABS.map((tab) => ({ ...tab, id: `alert-tab-${tab.key}`, isActive: tab.key === activeTab, onSelect: () => setActiveTab(tab.key) }))}
          ariaLabel="Détail de l'alerte"
          panelId="alert-tab-panel"
          className="flex items-center gap-6 font-semibold text-black"
          variant="underline"
        />
        {/* Les deux onglets restent montés (masqués) pour conserver un commentaire en cours de saisie */}
        <section id="alert-tab-panel" role="tabpanel" aria-labelledby={`alert-tab-${activeTab}`} className="border-grey-border border-t pt-6">
          <div hidden={activeTab !== "comments"}>
            <AlertComments key={commentsVersion} alertId={id} />
          </div>
          <div hidden={activeTab !== "history"}>
            <AlertOccurrences alertId={id} />
          </div>
        </section>
      </div>
      <Modal open={!!pending} onClose={closeModal} title={pending ? CONFIRM_STATUS[pending].title : ""}>
        {pending === "IGNORED" && (
          <p>
            Le problème persiste mais ne demande pas de correction. Aucune nouvelle alerte ne sera envoyée pour ce partenaire et ce type avant le {formatDate(alert.ignoreUntil)},
            date à laquelle l’alerte sera rouverte si le problème persiste.
          </p>
        )}
        <form onSubmit={confirm} className="flex flex-col gap-6">
          <LabelledTextarea
            id="alert-status-comment"
            label="Commentaire (optionnel)"
            hint={pending ? CONFIRM_STATUS[pending].hint : undefined}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={5000}
            rows={4}
            className=""
          />
          <div className="flex justify-end gap-4">
            <button type="button" className="secondary-btn" onClick={closeModal}>
              Annuler
            </button>
            <button type="submit" className="primary-btn">
              {pending ? CONFIRM_STATUS[pending].action : ""}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AlertDetail;
