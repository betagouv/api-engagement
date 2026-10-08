import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import LabelledInput from "@/components/form/LabelledInput";
import LabelledTextarea from "@/components/form/LabelledTextarea";
import WarningAlert from "@/components/WarningAlert";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";
import { toast } from "@/services/toast";

const toDateInput = (date) => (date ? new Date(date).toISOString().slice(0, 10) : "");

const splitList = (value) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const toDraft = (mission) => ({
  title: mission.title ?? "",
  description: mission.description ?? "",
  domainLogo: mission.domainLogo ?? "",
  applicationUrl: mission.applicationUrl ?? "",
  activities: (mission.activities ?? []).join("\n"),
  softSkills: (mission.softSkills ?? []).join("\n"),
  startAt: toDateInput(mission.startAt),
  endAt: toDateInput(mission.endAt),
});

const Edit = () => {
  const { id, publisherId } = useParams();
  const navigate = useNavigate();
  const { user } = useStore();
  const [title, setTitle] = useState("");
  const [initialDraft, setInitialDraft] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const viewPath = `/${publisherId}/mission/${id}`;

  useEffect(() => {
    setDraft(null);
    const fetchData = async () => {
      try {
        const res = await api.get(`/mission/${id}`);
        if (!res.ok) throw res;
        setTitle(res.data.title);
        setInitialDraft(toDraft(res.data));
        setDraft(toDraft(res.data));
      } catch (error) {
        captureError(error, { extra: { id } });
      }
    };
    fetchData();
  }, [id]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.postFormData(`/mission/${id}/image`, formData);
      if (!res.ok) throw res;
      setDraft((prev) => ({ ...prev, domainLogo: res.data.url }));
    } catch (error) {
      captureError(error, { message: "Erreur lors de l'envoi de l'image", extra: { id } });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put(`/mission/${id}`, {
        title: draft.title,
        // Non envoyée si inchangée : l'API écraserait sinon le HTML d'origine par le texte aplati
        ...(draft.description !== initialDraft.description && { description: draft.description }),
        applicationUrl: draft.applicationUrl,
        activities: splitList(draft.activities),
        softSkills: splitList(draft.softSkills),
        startAt: draft.startAt || null,
        endAt: draft.endAt || null,
      });
      if (!res.ok) throw res;
      if (res.data.statusCode === "REFUSED") {
        toast.warning(`Mission mise à jour mais refusée : ${res.data.statusComment}`);
      } else {
        toast.success("Mission mise à jour");
      }
      navigate(viewPath);
    } catch (error) {
      captureError(error, { message: "Erreur lors de la mise à jour de la mission", extra: { id } });
    }
    setSaving(false);
  };

  if (user?.role !== "admin") return <Navigate to={viewPath} replace />;
  if (!draft) return <p className="p-3">Chargement...</p>;

  return (
    <div className="space-y-12">
      <title>{`API Engagement - Modifier ${title}`}</title>
      <h1 className="text-4xl leading-normal font-bold">Modifier la mission</h1>
      <p className="text-text-mention -mt-8">{title}</p>
      <form onSubmit={handleSave} className="space-y-6 bg-white p-4 sm:p-12">
        <WarningAlert>
          <p className="font-semibold">Ces modifications peuvent être écrasées par le partenaire</p>
          <p className="text-sm">Si la mission est importée depuis un flux XML ou poussée via l&apos;API, la prochaine synchronisation remplacera les valeurs modifiées ici.</p>
        </WarningAlert>
        <LabelledInput id="mission-title" label="Titre" required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <LabelledTextarea
          id="mission-description"
          label="Description"
          required
          rows={12}
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
        <div className="flex items-start gap-4">
          {draft.domainLogo && <img src={draft.domainLogo} alt="" className="h-24 w-36 shrink-0 bg-gray-950 object-cover" />}
          <LabelledInput
            id="mission-image"
            label="Image"
            hint="JPEG, PNG, WebP ou GIF, 5 Mo max"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="flex-1"
            onChange={handleImageChange}
          />
        </div>
        <LabelledInput
          id="mission-application-url"
          label="Lien vers la mission"
          value={draft.applicationUrl}
          onChange={(e) => setDraft({ ...draft, applicationUrl: e.target.value })}
        />
        <LabelledTextarea
          id="mission-activities"
          label="Activités"
          hint="Une par ligne"
          rows={4}
          value={draft.activities}
          onChange={(e) => setDraft({ ...draft, activities: e.target.value })}
        />
        <LabelledTextarea
          id="mission-soft-skills"
          label="Compétences"
          hint="Une par ligne"
          rows={4}
          value={draft.softSkills}
          onChange={(e) => setDraft({ ...draft, softSkills: e.target.value })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <LabelledInput id="mission-start-at" label="Date de début" type="date" value={draft.startAt} onChange={(e) => setDraft({ ...draft, startAt: e.target.value })} />
          <LabelledInput id="mission-end-at" label="Date de fin" type="date" value={draft.endAt} onChange={(e) => setDraft({ ...draft, endAt: e.target.value })} />
        </div>
        <div className="flex gap-2">
          <button className="primary-btn" type="submit" disabled={saving}>
            Enregistrer
          </button>
          <button className="secondary-btn" type="button" disabled={saving} onClick={() => navigate(viewPath)}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
};

export default Edit;
