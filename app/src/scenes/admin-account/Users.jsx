import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { HiOutlinePlus } from "react-icons/hi";
import { RiInformationLine, RiLoginBoxLine } from "react-icons/ri";
import { Link } from "react-router-dom";

import Loader from "../../components/Loader";
import { Table } from "../../components/Table";
import api from "../../services/api";
import { captureError } from "../../services/error";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [displayeddUsers, setDisplayedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const resU = await api.get(`/user`);
        if (!resU.ok) throw resU;
        setUsers(resU.data);
        const filteredUsers = resU.data.filter((user) => user.deleted === false);

        // Sort by last_activity_at if exists else last_login_at (last_activity_at should be always greater than last_login_at)
        filteredUsers.sort((a, b) => {
          if (a.last_activity_at && b.last_activity_at) return new Date(b.last_activity_at) - new Date(a.last_activity_at);
          if (a.last_activity_at) return -1;
          if (b.last_activity_at) return 1;
          if (a.last_login_at && b.last_login_at) return new Date(b.last_login_at) - new Date(a.last_login_at);
          if (a.last_login_at) return -1;
          if (b.last_login_at) return 1;
          return 0;
        });
        setUsers(filteredUsers);
        setDisplayedUsers(filteredUsers);

        const resP = await api.post("/publisher/search");
        if (!resP.ok) throw resP;
        setPublishers(resP.data);
      } catch (error) {
        captureError(error, "Erreur lors de la récupération des données");
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const search = e.target.value;
    if (search)
      setDisplayedUsers(
        users.filter((u) => {
          return (
            u.firstname.toLowerCase().search(search.toLowerCase()) !== -1 ||
            u.lastname?.toLowerCase().search(search.toLowerCase()) !== -1 ||
            u.email.toLowerCase().search(search.toLowerCase()) !== -1
          );
        }),
      );
    else setDisplayedUsers(users);
  };

  return (
    <div className="space-y-12 p-12">
      <Helmet>
        <title>Administration - Utilisateurs - API Engagement</title>
      </Helmet>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Liste des utilisateurs</h2>
          <p className="mt-2">Liste de comptes ayant un accès à l'API Engagement</p>
        </div>
      </div>

      <div className="border border-gray-border p-6">
        <div className="mb-6 flex items-center gap-4">
          <input className="input flex-1" placeholder="Chercher par nom ou par email" onChange={handleSearch} />
          <Link to="/user/new" className="button flex items-center border bg-blue-dark text-white">
            Nouvel utilisateur <HiOutlinePlus className="ml-2" />
          </Link>
        </div>
        {loading ? (
          <Loader />
        ) : (
          <Table
            data={displayeddUsers}
            renderHeader={() => (
              <>
                <h4 className="w-[15%]">Nom</h4>
                <h4 className="w-[20%]">Email</h4>
                <h4 className="flex-1 text-center">Partenaires</h4>
                <h4 className="w-[12%] text-center">Rôle</h4>
                <h4 className="w-[12%] text-center">Accès données</h4>
                <h4 className="flex w-[10%] justify-center">
                  <div className="relative group">
                    <div className="ml-2 flex items-center">
                      Dernière activité
                      <RiInformationLine className="ml-2 text-gray-dark" />
                    </div>
                    <div className="hidden group-hover:block absolute right-6 top-[-20px] w-56">
                      <div className="bg-white p-2 shadow-lg">
                        <p className="text-sm">Dernière fois que l'utilisateur à utilisé la plateforme</p>
                      </div>
                    </div>
                  </div>
                </h4>
                <h4 className="w-[12%] text-center">Se connecter en tant que</h4>
              </>
            )}
            itemHeight={"min-h-[3rem]"}
            renderItem={(item) => (
              <>
                <Link to={`/user/${item._id}`} className="link w-[15%] truncate">
                  {item.firstname} {item.lastname}
                </Link>
                <span className="w-[20%] truncate">{item.email}</span>
                <div className="gap-y-.5 flex flex-1 flex-wrap justify-center gap-x-2 py-1">
                  {item.role === "admin" ? (
                    <span className="text-2xs max-w-[12rem] truncate rounded bg-blue-light p-1">Tous</span>
                  ) : (
                    <>
                      {item.publishers.slice(0, 2).map((p, i) => {
                        const publisher = publishers.find((pub) => pub._id === p);
                        if (!publisher) return null;
                        return (
                          <span key={i} className="text-2xs max-w-[12rem] truncate rounded bg-blue-light p-1">
                            {publisher.name}
                          </span>
                        );
                      })}
                      {item.publishers.length > 2 && <span className="text-2xs max-w-[12rem] truncate rounded bg-blue-light p-1">+ {item.publishers.length - 2} autres</span>}
                    </>
                  )}
                </div>
                <span className="w-[12%] text-center">
                  {item.role === "admin" ? <span className="rounded bg-red-light px-1">Admin</span> : <span className="rounded bg-green-light px-1">Utilisateur</span>}
                </span>
                <span className="w-[12%] text-center">{new Date(item.created_at).toLocaleDateString("fr")}</span>
                <span className="flex w-[10%] justify-center">{item.last_activity_at ? new Date(item.last_activity_at).toLocaleDateString("fr") : "-"}</span>
                <Link to={`/connect?id=${item._id}`} target="_blank" className="flex w-[12%] items-center justify-center text-blue-dark">
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
