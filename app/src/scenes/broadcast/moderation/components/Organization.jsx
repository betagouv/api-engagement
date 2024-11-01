import { BsDot } from "react-icons/bs";
import { RiCheckboxCircleFill, RiCloseCircleFill, RiFileCopyLine, RiPencilFill } from "react-icons/ri";
import { toast } from "react-toastify";

const Organization = ({ data, history }) => {
  const handleCopy = (type) => {
    if (type === "SIRET") {
      if (data.newAssociationSiren) {
        navigator.clipboard.writeText(data.newAssociationSiren);
      } else if (data.associationSiren) {
        navigator.clipboard.writeText(data.associationSiren);
      } else {
        return;
      }
    } else {
      if (data.newAssociationRNA) {
        navigator.clipboard.writeText(data.newAssociationRNA);
      } else if (data.associationRNA) {
        navigator.clipboard.writeText(data.associationRNA);
      } else {
        return;
      }
    }
    toast.success("Copié dans le presse-papier");
  };

  return (
    <div className="flex flex-col gap-2 bg-white p-6 border border-gray-border">
      <div className="flex items-center gap-2 mb-2">
        <RiPencilFill className="text-gray-dark" />
        <label className="text-xs text-gray-dark font-semibold" htmlFor="note">
          ORGANISATION
        </label>
      </div>
      <div className="flex flex-col">
        <span className="font-semibold">{data.organizationName}</span>
        <span className="text-xs text-gray-dark">
          Inscrite sur
          {data.associationSources ? data.associationSources.map((s) => (s === "Je veux aider" ? "JeVeuxAider.gouv.fr" : s)).join(", ") : " /"}
        </span>
      </div>
      <div>
        <div className="my-2 inline-flex flex-wrap items-center gap-1 rounded border border-gray-border p-2">
          <span className="text-xs text-gray-dark">Missions</span>
          <RiCheckboxCircleFill className="text-green-success text-xs" />
          <span className="text-green-success text-xs">{history["ACCEPTED"] || "0"}</span>
          <BsDot className="text-xs text-gray-dark" />
          <RiCloseCircleFill className="text-red-main text-xs" />
          <span className="text-red-main text-xs">{history["REFUSED"] || "0"}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 items-middle">
        <div className="flex gap-6 items-center">
          <span className="text-xs text-gray-dark">SIRET</span>
          <span className="text-xs text-gray-dark">{data.newAssociationSiren ? data.newAssociationSiren : data.associationSiren || "/"}</span>
          <RiFileCopyLine className="text-xs text-gray-dark hover:cursor-pointer" onClick={() => handleCopy("SIRET")} />
        </div>
        <div className="flex gap-6 items-center">
          <span className="text-xs text-gray-dark">RNA</span>
          <span className="text-xs text-gray-dark">{data.newAssociationRNA ? data.newAssociationRNA : data.associationRNA || "/"}</span>
          <RiFileCopyLine className="text-xs text-gray-dark hover:cursor-pointer" onClick={() => handleCopy("RNA")} />
        </div>
      </div>
    </div>
  );
};

export default Organization;
