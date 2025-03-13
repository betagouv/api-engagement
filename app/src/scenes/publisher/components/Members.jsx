import { useEffect, useState } from "react";

import Table from "../../../components/NewTable";
import api from "../../../services/api";
import { captureError } from "../../../services/error";

const Members = ({ values, onChange }) => {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.post("/user/search", {
          publisherId: values._id,
        });
        if (!res.ok) throw res;
        setMembers(res.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des membres");
      }
    };
    fetchData();
  }, [values._id]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Membres</h2>
      <Table header={[{ title: "Membre" }, { title: "Email" }, { title: "Envoyer le rapport", position: "center" }, { title: "Rôle", position: "center" }]} className="h-96">
        {members.map((item, index) => (
          <tr key={index} className={`${index % 2 === 0 ? "bg-gray-100" : "bg-gray-50"} table-item`}>
            <td className="p-4">{`${item.firstname} ${item.lastname}`}</td>
            <td className="p-4">{item.email}</td>
            <td className="p-4">
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={values.send_report_to.includes(item._id)}
                  onChange={(e) =>
                    onChange({ ...values, send_report_to: e.target.checked ? [...values.send_report_to, item._id] : values.send_report_to.filter((id) => id !== item._id) })
                  }
                />
              </div>
            </td>
            <td className="p-4">
              <div className="flex justify-center">
                {item.role === "admin" ? <span className="rounded bg-red-light p-2">Admin</span> : <span className="rounded bg-green-light p-2">Utilisateur</span>}
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
};

export default Members;
