import { useEffect, useState } from "react";
import { RiErrorWarningFill, RiExternalLinkLine } from "react-icons/ri";
import { Link } from "react-router-dom";
import { toast } from "@/services/toast";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";

const MissionTab = ({ data, onChange }) => {
  const { publisher } = useStore();
  const [title, setTitle] = useState(data.title || data.missionTitle);
  const [error, setError] = useState(null);

  useEffect(() => {
    setTitle(data.title || data.missionTitle);
    setError(null);
  }, [data.title, data.missionTitle]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/moderation/${data.id}`, { title: title.trim() || null, moderatorId: publisher.id });
      if (!res.ok) throw res;
      toast.success("Le titre a été modifié avec succès", {
        position: "bottom-right",
      });
      onChange(res.data);
    } catch (error) {
      captureError(error, { extra: { data, title, publisherId: publisher.id } }, { position: "bottom-right" });
      setError("Une erreur est survenue lors de la modification du titre");
    }
  };

  return (
    <form className="flex divide-x pb-4" onSubmit={handleSubmit}>
      <div className="flex w-full flex-col gap-4 p-8">
        <div className="flex flex-col">
          <label className="mb-2 text-sm" htmlFor="new-mission-title">
            Nom de la mission
          </label>
          <input
            className={`input mb-2 ${error ? "border-b-error" : "border-b-black"}`}
            id="new-mission-title"
            name="new-mission-title"
            placeholder={data.missionTitle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {error && (
            <div className="text-error flex items-center text-sm">
              <RiErrorWarningFill className="mr-2" />
              {error}
            </div>
          )}
          <p className="text-text-mention text-xs">
            <span className="mr-1 font-semibold">Titre d'origine:</span>
            {data.missionTitle}
          </p>
          {title !== data.title && title !== data.missionTitle && (
            <button className="primary-btn mt-4 w-[25%]" type="submit">
              Enregistrer
            </button>
          )}
        </div>
        <div className="border-grey-border border-t" />
        <div className="flex flex-col space-y-2">
          <label className="mb-2 text-sm" htmlFor="description">
            Description
          </label>
          <div
            className="text-text-mention border-grey-border overflow-hidden rounded-t border bg-gray-950 p-6 text-sm"
            dangerouslySetInnerHTML={{ __html: data.missionDescription.replace(/\n/g, "<br />") }}
          />
        </div>
        <div className="border-grey-border border-t" />
        <div className="flex flex-col space-y-2 py-2">
          <label className="text-sm" htmlFor="title">
            Lieu de la mission
          </label>
          <p className="text-text-mention text-sm">
          {data.missionDepartmentName} ({data.missionDepartmentCode})
          </p>
        </div>
        <div className="border-grey-border border-t" />
        <div className="flex flex-col space-y-2 py-2">
          <label className="text-sm" htmlFor="title">
            Date de la mission
          </label>
          <p className="text-text-mention text-sm">À partir du {new Date(data.missionStartAt).toLocaleDateString("fr", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <div className="border-grey-border border-t" />
        <div className="flex flex-col space-y-2 py-2">
          <label className="text-sm" htmlFor="title">
            Date de création
          </label>
          <p className="text-text-mention text-sm">
            Postée le {new Date(data.missionPostedAt).toLocaleDateString("fr")} sur {data.missionPublisherName}
          </p>
        </div>
        <div className="border-grey-border border-t" />
        <div className="flex flex-col space-y-2 py-2">
          <label className="text-sm" htmlFor="title">
            Lien de la mission
          </label>
          <div className="flex items-center gap-2">
            <Link
              to={data.missionApplicationUrl.includes("http") ? data.missionApplicationUrl : `https://${data.missionApplicationUrl}`}
              className="text-blue-france w-fit text-sm underline"
              target="_blank"
            >
              Ouvrir le lien de la mission
            </Link>
            <RiExternalLinkLine />
          </div>
        </div>
        <div className="border-grey-border border-t" />
        <div className="flex flex-col space-y-2 py-2">
          <label className="text-sm" htmlFor="title">
            ID
          </label>
          <p className="text-text-mention text-sm">{data.missionId}</p>
        </div>
      </div>
    </form>
  );
};

export default MissionTab;
