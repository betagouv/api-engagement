import { RiCheckboxCircleFill, RiCloseCircleFill, RiFileCopyLine, RiPencilFill } from "react-icons/ri";
import { toast } from "@/services/toast";

const Organization = ({ data, history }) => {
  return (
    <div className="border-grey-border flex flex-col gap-2 border bg-white p-6">
      <div className="mb-2 flex items-center gap-2">
        <RiPencilFill className="text-text-mention" />
        <label className="text-text-mention text-xs font-semibold" htmlFor="note">
          ORGANISATION
        </label>
      </div>
      <div className="flex flex-col">
        <span className="font-semibold">{data.organizationName}</span>
        <span className="text-text-mention text-xs">
          Inscrite sur
          {/* TODO: Add association sources */}
        </span>
      </div>
      <div>
        <div className="border-grey-border my-2 inline-flex flex-wrap items-center gap-1 rounded border p-2">
          <span className="text-text-mention text-xs">Missions</span>
          <RiCheckboxCircleFill className="text-success text-xs" />
          <span className="text-success text-xs">{history["ACCEPTED"] || "0"}</span>
          <div className="bg-gray-425 mx-1 h-[2px] w-[2px] rounded-full" />
          <RiCloseCircleFill className="text-error text-xs" />
          <span className="text-error text-xs">{history["REFUSED"] || "0"}</span>
        </div>
      </div>
      <div className="items-middle flex flex-col gap-1">
        <div className="flex items-center gap-6">
          <span className="text-text-mention text-xs">SIREN</span>
          <span className="text-text-mention text-xs">{data.missionOrganizationSirenVerified || "/"}</span>
          <RiFileCopyLine
            className="text-text-mention text-xs hover:cursor-pointer"
            onClick={() => {
              if (!data.missionOrganizationSirenVerified) return;
              navigator.clipboard.writeText(data.missionOrganizationSirenVerified);
              toast.success("Copié dans le presse-papier");
            }}
          />
        </div>
        <div className="flex items-center gap-6">
          <span className="text-text-mention text-xs">RNA</span>
          <span className="text-text-mention text-xs">{data.missionOrganizationRNAVerified || "/"}</span>
          <RiFileCopyLine
            className="text-text-mention text-xs hover:cursor-pointer"
            onClick={() => {
              if (!data.missionOrganizationRNAVerified) return;
              navigator.clipboard.writeText(data.missionOrganizationRNAVerified);
              toast.success("Copié dans le presse-papier");
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Organization;
