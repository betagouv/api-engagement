import { useEffect, useState } from "react";
import { HiOutlinePlus } from "react-icons/hi";
import { Link } from "react-router-dom";

import Table from "@/components/Table";
import api from "@/services/api";
import { captureError } from "@/services/error";
import { withLegacyPublishers } from "@/utils/publisher";

const TABLE_HEADER = [
  { title: "Nom", key: "name", width: "20%" },
  { title: "Email", key: "email", width: "20%" },
  { title: "Partenaires", key: "publishers", position: "center", width: "1%" },
  { title: "Rôle", key: "role", position: "center", width: "10%" },
];

const PAGE_SIZE = 25;

const Users = () => {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [total, setTotal] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, role]);

  useEffect(() => {
    const fetchPublishers = async () => {
      try {
        const res = await api.post("/publisher/search");
        if (!res.ok) {
          throw res;
        }
        setPublishers(withLegacyPublishers(res.data));
      } catch (error) {
        captureError(error);
      }
    };
    fetchPublishers();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await api.post("/user/search", { search: debouncedSearch || undefined, role: role || undefined, sort: "name", page, size: PAGE_SIZE });
        if (!res.ok) {
          throw res;
        }
        if (!cancelled) {
          setUsers(res.data);
          setTotal(res.total);
        }
      } catch (error) {
        captureError(error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    fetchUsers();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, role, page]);

  return (
    <div className="space-y-12 p-4 sm:p-12">
      <title>API Engagement - Utilisateurs - Administration</title>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Liste des utilisateurs</h2>
          <p className="mt-2">Liste de comptes ayant un accès à l'API Engagement</p>
        </div>
      </div>

      <div className="border-grey-border overflow-x-auto border p-4 sm:p-6">
        <div role="search" className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <label htmlFor="user-search" className="sr-only">
            Rechercher par nom, email ou ID
          </label>
          <input id="user-search" name="user-search" className="input flex-1" placeholder="Chercher par nom, email ou ID" onChange={(e) => setSearch(e.target.value)} />
          <label htmlFor="user-role" className="sr-only">
            Filtrer par type de compte
          </label>
          <select id="user-role" className="input sm:w-48" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Tous les comptes</option>
            <option value="user">Utilisateur</option>
            <option value="admin">Admin</option>
          </select>
          <Link to="/user/new" className="primary-btn flex shrink-0 items-center">
            Nouvel utilisateur <HiOutlinePlus className="ml-2" aria-hidden="true" />
          </Link>
        </div>
        <div className="min-w-[700px]">
        <Table caption="Liste des utilisateurs" header={TABLE_HEADER} total={total} loading={loading} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} auto>
          {users.map((item, i) => (
            <tr key={item.id} className={`${i % 2 === 0 ? "bg-table-even" : "bg-table-odd"} table-row`}>
              <td className="table-cell max-w-0">
                <Link to={`/user/${item.id}`} className="text-blue-france block truncate">
                  {item.firstname} {item.lastname}
                </Link>
              </td>
              <td className="table-cell max-w-0">
                <span className="block truncate" title={item.email}>
                  {item.email}
                </span>
              </td>
              <td className="table-cell">
                <div className="gap-y-.5 flex flex-wrap justify-center gap-x-2 py-1">
                  {item.role === "admin" ? (
                    <span className="text-2xs bg-blue-france-975 max-w-48 truncate rounded p-1">Tous</span>
                  ) : (
                    <>
                      {item.publishers.slice(0, 2).map((p, j) => {
                        const publisher = publishers.find((pub) => pub.id === p || pub._id === p);
                        if (!publisher) {
                          return null;
                        }
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
            </tr>
          ))}
        </Table>
        </div>
      </div>
    </div>
  );
};

export default Users;
