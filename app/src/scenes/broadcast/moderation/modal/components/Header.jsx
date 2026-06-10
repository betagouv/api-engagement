import { toast } from "@/services/toast";
import { useEffect, useState } from "react";

import STATUS, { DOMAINS, JVA_MODERATION_COMMENTS_LABELS, STATUS_COLORS } from "@/scenes/broadcast/moderation/components/Constants";
import OrganizationRefusedModal from "@/scenes/broadcast/moderation/components/OrganizationRefusedModal";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";

const Header = ({ data, onChange }) => {
  const { publisher } = useStore();
  const [values, setValues] = useState({
    status: data.status,
    comment: data.comment,
  });
  const [missionToRefuse, setMissionToRefuse] = useState(0);

  useEffect(() => {
    setValues({
      status: data.status,
      comment: data.comment,
    });
  }, [data]);

  const handleChange = async (v) => {
    try {
      setValues({ ...values, ...v });
      if (v.status === "REFUSED" && !v.comment) {
        return;
      }
      const resM = await api.put(`/moderation/${data.id}`, { ...values, ...v, moderatorId: publisher.id });
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
        const resO = await api.post("/moderation/search", { moderatorId: publisher.id, organizationIds: [data.missionPublisherOrganizationId], status: "PENDING", size: 0 });
        if (!resO.ok) {
          throw resO;
        }
        setMissionToRefuse(resO.total);
      }
    } catch (error) {
      toast.error("Une erreur est survenue lors de la modération de la mission", {
        position: "bottom-right",
      });
      captureError(
        error,
        { extra: { data, values } },
        {
          position: "bottom-right",
        },
      );
    }
  };

  return (
    <>
      <OrganizationRefusedModal open={missionToRefuse > 0} onClose={() => setMissionToRefuse(0)} data={data} update={values} onChange={onChange} total={missionToRefuse} />
      <div className="bg-global-background border-grey-border sticky top-0 z-50 flex flex-col gap-4 border-b pt-4 pb-8 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="max-w-full space-y-2 md:max-w-[50%]">
          <h1 className="mb-1">{DOMAINS[data.missionDomain]}</h1>
          <h2 className="text-xl font-semibold">{data.title || data.missionTitle}</h2>
        </div>

        <div className="relative space-y-2 pt-4">
          <div className="flex flex-col items-stretch gap-2 md:flex-row md:flex-wrap md:items-center md:justify-end">
            <select
              className="select w-full border-b-2 pr-2 md:w-56"
              style={{ borderBottomColor: STATUS_COLORS[values.status] }}
              name="status"
              aria-label="Statut de la mission"
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
              <select
                className="select border-error w-full border-b-2 md:w-64"
                name="motif"
                aria-label="Motif de refus"
                value={values.comment}
                onChange={(e) => handleChange({ status: "REFUSED", comment: e.target.value })}
              >
                <option value="">Motif de refus</option>
                {Object.entries(JVA_MODERATION_COMMENTS_LABELS).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="absolute right-0 -bottom-6 w-full text-right text-xs italic md:w-screen">
            {values.status === "REFUSED" && !values.comment ? "Veuillez renseigner un motif de refus pour sauvegarder le changement de statut" : ""}
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
