import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";
import STATUS, { DOMAINS, JVA_MODERATION_COMMENTS_LABELS, STATUS_COLORS } from "../../components/Constants";
import OrganizationRefusedModal from "../../components/OrganizationRefusedModal";

const Header = ({ data, onChange }) => {
  const { publisher } = useStore();
  const [values, setValues] = useState({
    status: data.status,
    comment: data.comment,
  });
  const [isOrganizationRefusedOpen, setIsOrganizationRefusedOpen] = useState(false);

  useEffect(() => {
    setValues({
      status: data.status,
      comment: data.comment,
    });
  }, [data]);

  const handleChange = async (v) => {
    try {
      setValues({ ...values, ...v });
      if (v.status === "REFUSED" && !v.comment) return;
      const resM = await api.put(`/moderation/${data._id}`, { ...values, ...v, moderatorId: publisher.id });
      if (!resM.ok) {
        if (resM.error === "COMMENT_REQUIRED") {
          toast.error("Le commentaire est requis pour refuser la mission");
          return;
        }
        throw resM;
      }
      toast.success("La mission a été modérée avec succès", {
        position: "bottom-right",
      });
      onChange(resM.data);

      if (v.status === "REFUSED" && ["ORGANIZATION_NOT_COMPLIANT", "ORGANIZATION_ALREADY_PUBLISHED"].includes(v.comment)) {
        const resO = await api.post("/moderation/search", { moderatorId: publisher.id, organizationName: data.organizationName, status: "PENDING", size: 0 });
        if (!resO.ok) throw resO;
        if (resO.total > 0) setIsOrganizationRefusedOpen(true);
      }
    } catch (error) {
      captureError(error, "Erreur lors de la mise à jour de la mission", {
        position: "bottom-right",
      });
    }
  };

  return (
    <>
      <OrganizationRefusedModal isOpen={isOrganizationRefusedOpen} onClose={() => setIsOrganizationRefusedOpen(false)} data={data} update={values} onChange={onChange} />
      <div className="bg-beige-gris-galet-975 sticky top-0 z-50 flex h-full items-center justify-between gap-8 border-b border-gray-900 pb-8">
        <div className="max-w-[50%] space-y-2">
          <h1 className="mb-1">{DOMAINS[data.domain]}</h1>
          <h2 className="text-xl font-semibold">{data.newTitle || data.title}</h2>
        </div>

        <div className="relative space-y-2 pt-4">
          <div className="flex items-center justify-end gap-2">
            <select
              className="select w-56 border-b-2 pr-2"
              style={{ borderBottomColor: STATUS_COLORS[values.status] }}
              name="status"
              value={values.status}
              onChange={(e) => handleChange({ status: e.target.value })}
            >
              {Object.entries(STATUS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
            {values.status === "REFUSED" && (
              <select className="select w-64" name="motif" value={values.comment} onChange={(e) => handleChange({ status: "REFUSED", comment: e.target.value })}>
                <option value="">Motif de refus</option>
                {Object.entries(JVA_MODERATION_COMMENTS_LABELS).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="absolute right-0 -bottom-6 w-screen text-right text-xs italic">
            {values.status === "REFUSED" && !values.comment ? "Veuillez renseigner un motif de refus pour sauvegarder le changement de statut" : ""}
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
