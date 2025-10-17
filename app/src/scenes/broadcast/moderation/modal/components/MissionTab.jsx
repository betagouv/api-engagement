import { useEffect, useState } from "react";
import { RiErrorWarningFill, RiExternalLinkLine } from "react-icons/ri";
import { Link } from "react-router-dom";

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
      <div className="flex w-full flex-col gap-4 p-8">
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
            <div className="text-red-error flex items-center text-sm">
              <RiErrorWarningFill className="mr-2" />
              {error}
            </div>
          )}
          <p className="text-gray-425 text-xs">
            <span className="mr-1 font-semibold">Titre d'origine:</span>
            {data.title}
          </p>
          {newTitle !== data.title && newTitle !== data.newTitle && (
            <button className="primary-btn mt-4 w-[25%]" type="submit">
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
            className="text-gray-425 overflow-hidden rounded-t border border-gray-900 bg-gray-950 p-6 text-sm"
            dangerouslySetInnerHTML={{ __html: data.description.replace(/\n/g, "<br />") }}
          />
        </div>
        <div className="border-t border-gray-900" />
        <div className="flex flex-col space-y-2 py-2">
          <label className="text-sm" htmlFor="title">
            Lieu de la mission
          </label>
          <p className="text-gray-425 text-sm">
            {data.departmentName} ({data.departmentCode})
          </p>
        </div>
        <div className="border-t border-gray-900" />
        <div className="flex flex-col space-y-2 py-2">
          <label className="text-sm" htmlFor="title">
            Date de la mission
          </label>
          <p className="text-gray-425 text-sm">À partir du {new Date(data.startAt).toLocaleDateString("fr", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <div className="border-t border-gray-900" />
        <div className="flex flex-col space-y-2 py-2">
          <label className="text-sm" htmlFor="title">
            Date de création
          </label>
          <p className="text-gray-425 text-sm">
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
              className="text-blue-france w-fit text-sm underline"
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
          <p className="text-gray-425 text-sm">{data._id}</p>
        </div>
      </div>
    </form>
  );
};

export default MissionTab;
