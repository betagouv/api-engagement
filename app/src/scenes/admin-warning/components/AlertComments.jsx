import { useEffect, useState } from "react";

import Avatar from "@/components/Avatar";
import LabelledTextarea from "@/components/form/LabelledTextarea";
import { formatDateTime } from "@/scenes/admin-warning/components/Alerts";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";

// Fil des commentaires (détails de résolution) : ajout et édition de ses propres commentaires.
const AlertComments = ({ alertId }) => {
  const { user } = useStore();
  const [comments, setComments] = useState([]);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    api
      .get(`/warning/${alertId}/comments`)
      .then((res) => {
        if (!res.ok) throw res;
        setComments(res.data);
      })
      .catch((error) => {
        setLoadError(true);
        captureError(error, { extra: { alertId } });
      });
  }, [alertId]);

  const submit = async (e) => {
    e.preventDefault();
    const edited = editing;
    const body = (edited ? edited.body : draft).trim();
    if (!body) return;
    setSaving(true);
    try {
      const res = edited ? await api.put(`/warning/${alertId}/comments/${edited.id}`, { body }) : await api.post(`/warning/${alertId}/comments`, { body });
      if (!res.ok) throw res;
      setComments((list) => (edited ? list.map((c) => (c.id === edited.id ? res.data : c)) : [...list, res.data]));
      if (edited) setEditing(null);
      else setDraft("");
    } catch (error) {
      captureError(error, { message: "Impossible d'enregistrer le commentaire", extra: { alertId } });
    }
    setSaving(false);
  };

  return (
    <section aria-labelledby="alert-comments" className="space-y-4">
      <h3 id="alert-comments" className="text-xl font-bold">
        Commentaires
      </h3>
      {loadError && (
        <p role="alert" className="text-error">
          Impossible de charger les commentaires
        </p>
      )}
      {!loadError && !comments.length && <p className="text-text-mention">Aucun commentaire</p>}
      <ul className="space-y-4">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            {c.author ? <Avatar user={c.author} className="h-10 w-10" /> : <div className="bg-grey-200 h-10 w-10 shrink-0 rounded-full" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-bold">{c.author ? `${c.author.firstname} ${c.author.lastname ?? ""}` : "Utilisateur supprimé"}</span>
                <span className="text-text-mention"> · {formatDateTime(c.createdAt)}</span>
                {c.updatedAt !== c.createdAt && <span className="text-text-mention"> · modifié</span>}
              </p>
              {editing?.id === c.id ? (
                <form onSubmit={submit} className="mt-2 space-y-2">
                  <LabelledTextarea
                    id={`comment-${c.id}`}
                    label="Modifier le commentaire"
                    value={editing.body}
                    onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                    maxLength={5000}
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="primary-btn" disabled={saving}>
                      Enregistrer
                    </button>
                    <button type="button" className="tertiary-btn" onClick={() => setEditing(null)}>
                      Annuler
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="whitespace-pre-line">{c.body}</p>
                  {c.author?.id === user?.id && (
                    <button
                      type="button"
                      className="link text-sm"
                      aria-label={`Modifier le commentaire de ${c.author.firstname} du ${formatDateTime(c.createdAt)}`}
                      onClick={() => setEditing({ id: c.id, body: c.body })}
                    >
                      Modifier
                    </button>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="space-y-2">
        <LabelledTextarea id="new-comment" label="Ajouter un commentaire" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={5000} />
        <button type="submit" className="primary-btn" disabled={saving || !draft.trim()}>
          Commenter
        </button>
      </form>
    </section>
  );
};

export default AlertComments;
