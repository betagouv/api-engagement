import { useEffect, useState } from "react";
import { RiArrowLeftLine } from "react-icons/ri";
import { Link, useParams } from "react-router-dom";

import Avatar from "@/components/Avatar";
import Loader from "@/components/Loader";
import Select from "@/components/Select";
import Tabs from "@/components/Tabs";
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

const AlertDetail = () => {
  const { id } = useParams();
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("comments");

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

  const handleStatus = async ({ value }) => {
    if (!value || value === alert.status) return;
    setSaving(true);
    try {
      const res = await api.put(`/warning/${id}/status`, { status: value });
      if (!res.ok) throw res;
      setAlert(res.data);
    } catch (error) {
      captureError(error, {
        message: error?.code === "RESSOURCE_ALREADY_EXIST" ? "Une alerte ouverte existe déjà pour ce partenaire et ce type" : "Impossible de modifier le statut",
        extra: { alertId: id },
      });
    }
    setSaving(false);
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
            {label.name} · {alert.occurrences} occurrence{alert.occurrences > 1 ? "s" : ""}
          </p>
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
        {alert.status === "RESOLVED" && alert.fixedAt && (
          <div>
            <dt className="font-bold">Résolue le</dt>
            <dd>{formatDateTime(alert.fixedAt)}</dd>
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
              <a className="link" href={alert.procedureUrl} target="_blank" rel="noopener noreferrer">
                Ouvrir la procédure (nouvel onglet)
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
            <AlertComments alertId={id} />
          </div>
          <div hidden={activeTab !== "history"}>
            <AlertOccurrences alertId={id} />
          </div>
        </section>
      </div>
    </div>
  );
};

export default AlertDetail;
