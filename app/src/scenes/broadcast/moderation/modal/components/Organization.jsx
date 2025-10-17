import { RiCheckboxCircleFill, RiCloseCircleFill, RiFileCopyLine, RiPencilFill } from "react-icons/ri";
import { toast } from "react-toastify";

const Organization = ({ data, history }) => {
  return (
    <div className="flex flex-col gap-2 border border-gray-900 bg-white p-6">
      <div className="mb-2 flex items-center gap-2">
        <RiPencilFill className="text-gray-425" />
        <label className="text-gray-425 text-xs font-semibold" htmlFor="note">
          ORGANISATION
        </label>
      </div>
      <div className="flex flex-col">
        <span className="font-semibold">{data.organizationName}</span>
        <span className="text-gray-425 text-xs">
          Inscrite sur
          {data.associationSources?.length ? data.associationSources.map((s) => (s === "Je veux aider" ? "JeVeuxAider.gouv.fr" : s)).join(", ") : " /"}
        </span>
      </div>
      <div>
        <div className="my-2 inline-flex flex-wrap items-center gap-1 rounded border border-gray-900 p-2">
          <span className="text-gray-425 text-xs">Missions</span>
          <RiCheckboxCircleFill className="text-green-success text-xs" />
          <span className="text-green-success text-xs">{history["ACCEPTED"] || "0"}</span>
          <div className="bg-gray-425 mx-1 h-[2px] w-[2px] rounded-full" />
          <RiCloseCircleFill className="text-red-error text-xs" />
          <span className="text-red-error text-xs">{history["REFUSED"] || "0"}</span>
        </div>
      </div>
      <div className="items-middle flex flex-col gap-1">
        <div className="flex items-center gap-6">
          <span className="text-gray-425 text-xs">SIREN</span>
          <span className="text-gray-425 text-xs">{data.organizationSirenVerified || "/"}</span>
          <RiFileCopyLine
            className="text-gray-425 text-xs hover:cursor-pointer"
            onClick={() => {
              if (!data.organizationSirenVerified) return;
              navigator.clipboard.writeText(data.organizationSirenVerified);
              toast.success("Copié dans le presse-papier");
            }}
          />
        </div>
        <div className="flex items-center gap-6">
          <span className="text-gray-425 text-xs">RNA</span>
          <span className="text-gray-425 text-xs">{data.organizationRNAVerified || "/"}</span>
          <RiFileCopyLine
            className="text-gray-425 text-xs hover:cursor-pointer"
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
