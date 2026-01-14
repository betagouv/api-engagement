import { useEffect, useState } from "react";
import { HiOutlinePlus } from "react-icons/hi";
import { RiLoginBoxLine } from "react-icons/ri";
import { Link } from "react-router-dom";

import Table from "../../components/NewTable";
import api from "../../services/api";
import { captureError } from "../../services/error";
import { withLegacyPublishers } from "../../utils/publisher";

const TABLE_HEADER = [
  { title: "Nom", key: "name" },
  { title: "Email", key: "email" },
  { title: "Partenaires", key: "publishers", position: "center" },
  { title: "Rôle", key: "role", position: "center" },
  { title: "Accès données", key: "createdAt", position: "center" },
  { title: "Dernière activité", key: "lastActivityAt", position: "center" },
  { title: "Se connecter en tant que", position: "center" },
];

const PAGE_SIZE = 25;

const Users = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(false);

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    return (
      u.firstname.toLowerCase().includes(search.toLowerCase()) || u.lastname?.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    );
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const resU = await api.post("/user/search");
        if (!resU.ok) throw resU;
        setUsers(resU.data);

        const resP = await api.post("/publisher/search");
        if (!resP.ok) throw resP;
        setPublishers(withLegacyPublishers(resP.data));
      } catch (error) {
        captureError(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-12 p-12">
      <title>Utilisateurs - Administration - API Engagement</title>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Liste des utilisateurs</h2>
          <p className="mt-2">Liste de comptes ayant un accès à l'API Engagement</p>
        </div>
      </div>

      <div className="border-grey-border border p-6">
        <div className="mb-6 flex items-center gap-4">
          <label htmlFor="user-search" className="sr-only">
            Rechercher par nom ou par email
          </label>
          <input id="user-search" name="user-search" className="input flex-1" placeholder="Chercher par nom ou par email" onChange={(e) => setSearch(e.target.value)} />
          <Link to="/user/new" className="primary-btn flex items-center">
            Nouvel utilisateur <HiOutlinePlus className="ml-2" />
          </Link>
        </div>
        <Table header={TABLE_HEADER} total={filteredUsers.length} loading={loading} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} auto>
          {filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((item, i) => (
            <tr key={item.id} className={`${i % 2 === 0 ? "bg-gray-975" : "bg-gray-1000-active"} table-item`}>
              <td className="table-cell">
                <Link to={`/user/${item.id}`} className="text-blue-france truncate">
                  {item.firstname} {item.lastname}
                </Link>
              </td>
              <td className="table-cell truncate">{item.email}</td>
              <td className="table-cell">
                <div className="gap-y-.5 flex flex-wrap justify-center gap-x-2 py-1">
                  {item.role === "admin" ? (
                    <span className="text-2xs bg-blue-france-975 max-w-48 truncate rounded p-1">Tous</span>
                  ) : (
                    <>
                      {item.publishers.slice(0, 2).map((p, j) => {
                        const publisher = publishers.find((pub) => pub.id === p || pub._id === p);
                        if (!publisher) return null;
                        return (
                          <span key={j} className="text-2xs bg-blue-france-975 max-w-48 truncate rounded p-1">
                            {publisher.name}
                          </span>
                        );
                      })}
                      {item.publishers.length > 2 && <span className="text-2xs bg-blue-france-975 max-w-48 truncate rounded p-1">+ {item.publishers.length - 2} autres</span>}
                    </>
                  )}
                </div>
              </td>
              <td className="table-cell text-center">
                {item.role === "admin" ? <span className="bg-red-marianne-950 rounded px-1">Admin</span> : <span className="bg-green-success-950 rounded px-1">Utilisateur</span>}
              </td>
              <td className="table-cell text-center">{new Date(item.createdAt).toLocaleDateString("fr")}</td>
              <td className="table-cell text-center">{item.lastActivityAt ? new Date(item.lastActivityAt).toLocaleDateString("fr") : "-"}</td>
              <td className="table-cell text-center">
                <Link to={`/connect?id=${item.id}`} target="_blank" className="text-blue-france flex items-center justify-center">
                  Se connecter
                  <RiLoginBoxLine className="ml-2" />
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
};

export default Users;
