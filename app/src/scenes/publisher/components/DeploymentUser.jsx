import { useEffect, useMemo, useState } from "react";

import Select from "@/components/Select";
import api from "@/services/api";
import { captureError } from "@/services/error";

const DeploymentUser = ({ value, onChange }) => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const res = await api.post("/user/search", { role: "admin" });
        if (!res.ok) {
          throw res;
        }
        setAdmins(res.data);
      } catch (error) {
        captureError(error);
      } finally {
        setLoading(false);
      }
    };
    fetchAdmins();
  }, []);

  const options = useMemo(() => admins.map((user) => ({ value: user.id, label: [user.firstname, user.lastname].filter(Boolean).join(" ") || user.email })), [admins]);

  return (
    <div className="flex max-w-md flex-col gap-2">
      <span className="text-base font-bold">Chargé de déploiement responsable</span>
      <Select options={options} value={value} loading={loading} placeholder="Sélectionner un chargé de déploiement" onChange={(option) => onChange(option.value || null)} />
    </div>
  );
};

export default DeploymentUser;
