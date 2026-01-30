import { useEffect, useState } from "react";

import Table from "../../../components/Table";
import api from "../../../services/api";
import { captureError } from "../../../services/error";

const Members = ({ values, onChange }) => {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.post("/user/search", {
          publisherId: values.id,
        });
        if (!res.ok) throw res;
        setMembers(res.data);
      } catch (error) {
        captureError(error, { extra: { publisherId: values.id } });
      }
    };
    fetchData();
  }, [values.id]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Membres</h2>
      <Table header={[{ title: "Membre" }, { title: "Email" }, { title: "Envoyer le rapport", position: "center" }, { title: "Rôle", position: "center" }]} className="max-h-96">
        {members.map((item, index) => (
          <tr key={index} className={`${index % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-item`}>
            <td className="p-4">{`${item.firstname} ${item.lastname}`}</td>
            <td className="p-4">{item.email}</td>
            <td className="p-4">
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={values.sendReportTo.includes(item.id)}
                  onChange={(e) => onChange({ ...values, sendReportTo: e.target.checked ? [...values.sendReportTo, item.id] : values.sendReportTo.filter((id) => id !== item.id) })}
                />
              </div>
            </td>
            <td className="p-4">
              <div className="flex justify-center">
                {item.role === "admin" ? <span className="bg-red-marianne-950 rounded p-2">Admin</span> : <span className="bg-success-950 rounded p-2">Utilisateur</span>}
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
};

export default Members;
