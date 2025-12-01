import { useEffect, useState } from "react";
import { HiOutlinePlus } from "react-icons/hi";
import { RiInformationLine, RiLoginBoxLine } from "react-icons/ri";
import { Link } from "react-router-dom";

import Loader from "../../components/Loader";
import { Table } from "../../components/Table";
import api from "../../services/api";
import { captureError } from "../../services/error";
import { withLegacyPublishers } from "../../utils/publisher";

const Users = () => {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(false);

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
        captureError(error, "Erreur lors de la récupération des données");
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

      <div className="border border-gray-900 p-6">
        <div className="mb-6 flex items-center gap-4">
          <label htmlFor="user-search" className="sr-only">
            Rechercher par nom ou par email
          </label>
          <input id="user-search" name="user-search" className="input flex-1" placeholder="Chercher par nom ou par email" onChange={(e) => setSearch(e.target.value)} />
          <Link to="/user/new" className="primary-btn flex items-center">
            Nouvel utilisateur <HiOutlinePlus className="ml-2" />
          </Link>
        </div>
        {loading ? (
          <Loader />
        ) : (
          <Table
            data={users.filter((u) => {
              if (!search) return true;
              return (
                u.firstname.toLowerCase().includes(search.toLowerCase()) ||
                u.lastname?.toLowerCase().includes(search.toLowerCase()) ||
                u.email.toLowerCase().includes(search.toLowerCase())
              );
            })}
            renderHeader={() => (
              <>
                <h4 className="w-[15%]">Nom</h4>
                <h4 className="w-[20%]">Email</h4>
                <h4 className="flex-1 text-center">Partenaires</h4>
                <h4 className="w-[12%] text-center">Rôle</h4>
                <h4 className="w-[12%] text-center">Accès données</h4>
                <h4 className="flex w-[10%] justify-center">
                  <div className="group relative">
                    <div className="ml-2 flex items-center">
                      Dernière activité
                      <RiInformationLine className="text-gray-425 ml-2" />
                    </div>
                    <div className="absolute top-[-20px] right-6 hidden w-56 group-hover:block">
                      <div className="bg-white p-2 shadow-lg">
                        <p className="text-sm">Dernière fois que l'utilisateur à utilisé la plateforme</p>
                      </div>
                    </div>
                  </div>
                </h4>
                <h4 className="w-[12%] text-center">Se connecter en tant que</h4>
              </>
            )}
            itemHeight="min-h-12"
            renderItem={(item) => (
              <>
                <Link to={`/user/${item.id}`} className="link w-[15%] truncate">
                  {item.firstname} {item.lastname}
                </Link>
                <span className="w-[20%] truncate">{item.email}</span>
                <div className="gap-y-.5 flex flex-1 flex-wrap justify-center gap-x-2 py-1">
                  {item.role === "admin" ? (
                    <span className="text-2xs bg-blue-france-975 max-w-48 truncate rounded p-1">Tous</span>
                  ) : (
                    <>
                      {item.publishers.slice(0, 2).map((p, i) => {
                        const publisher = publishers.find((pub) => pub.id === p || pub._id === p);
                        if (!publisher) return null;
                        return (
                          <span key={i} className="text-2xs bg-blue-france-975 max-w-48 truncate rounded p-1">
                            {publisher.name}
                          </span>
                        );
                      })}
                      {item.publishers.length > 2 && <span className="text-2xs bg-blue-france-975 max-w-48 truncate rounded p-1">+ {item.publishers.length - 2} autres</span>}
                    </>
                  )}
                </div>
                <span className="w-[12%] text-center">
                  {item.role === "admin" ? <span className="rounded bg-red-300 px-1">Admin</span> : <span className="rounded bg-green-300 px-1">Utilisateur</span>}
                </span>
                <span className="w-[12%] text-center">{new Date(item.createdAt).toLocaleDateString("fr")}</span>
                <span className="flex w-[10%] justify-center">{item.lastActivityAt ? new Date(item.lastActivityAt).toLocaleDateString("fr") : "-"}</span>
                <Link to={`/connect?id=${item.id}`} target="_blank" className="text-blue-france flex w-[12%] items-center justify-center">
                  Se connecter
                  <RiLoginBoxLine className="ml-2" />
                </Link>
              </>
            )}
          />
        )}
      </div>
    </div>
  );
};

export default Users;
