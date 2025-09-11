import { RiCheckboxCircleFill, RiCloseCircleFill, RiFileCopyLine, RiPencilFill } from "react-icons/ri";
import { toast } from "react-toastify";

const Organization = ({ data, history }) => {
  return (
    <div className="flex flex-col gap-2 bg-white p-6 border border-gray-900">
      <div className="flex items-center gap-2 mb-2">
        <RiPencilFill className="text-gray-425" />
        <label className="text-xs text-gray-425 font-semibold" htmlFor="note">
          ORGANISATION
        </label>
      </div>
      <div className="flex flex-col">
        <span className="font-semibold">{data.organizationName}</span>
        <span className="text-xs text-gray-425">
          Inscrite sur
          {data.associationSources?.length ? data.associationSources.map((s) => (s === "Je veux aider" ? "JeVeuxAider.gouv.fr" : s)).join(", ") : " /"}
        </span>
      </div>
      <div>
        <div className="my-2 inline-flex flex-wrap items-center gap-1 rounded border border-gray-900 p-2">
          <span className="text-xs text-gray-425">Missions</span>
          <RiCheckboxCircleFill className="text-green-success text-xs" />
          <span className="text-green-success text-xs">{history["ACCEPTED"] || "0"}</span>
          <div className="w-[2px] h-[2px] bg-gray-425 rounded-full mx-1" />
          <RiCloseCircleFill className="text-red-error text-xs" />
          <span className="text-red-error text-xs">{history["REFUSED"] || "0"}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 items-middle">
        <div className="flex gap-6 items-center">
          <span className="text-xs text-gray-425">SIREN</span>
          <span className="text-xs text-gray-425">{data.organizationSirenVerified || "/"}</span>
          <RiFileCopyLine
            className="text-xs text-gray-425 hover:cursor-pointer"
            onClick={() => {
              if (!data.organizationSirenVerified) return;
              navigator.clipboard.writeText(data.organizationSirenVerified);
              toast.success("Copié dans le presse-papier");
            }}
          />
        </div>
        <div className="flex gap-6 items-center">
          <span className="text-xs text-gray-425">RNA</span>
          <span className="text-xs text-gray-425">{data.organizationRNAVerified || "/"}</span>
          <RiFileCopyLine
            className="text-xs text-gray-425 hover:cursor-pointer"
            onClick={() => {
              if (!data.organizationRNAVerified) return;
              navigator.clipboard.writeText(data.organizationRNAVerified);
              toast.success("Copié dans le presse-papier");
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Organization;
