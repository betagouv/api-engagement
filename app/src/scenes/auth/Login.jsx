import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { RiErrorWarningFill } from "react-icons/ri";
import { Link, useNavigate } from "react-router-dom";

import { toast } from "react-toastify";
import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";
import { isValidEmail } from "../../services/utils";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { setAuth } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    const loggedout = new URLSearchParams(window.location.search).get("loggedout");
    if (loggedout) toast.info("Vous avez été déconnecté");
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const values = {
      email: event.target.email.value,
      password: event.target.password.value,
    };

    const errors = {};
    if (!isValidEmail(values.email)) errors.email = "Adresse email invalide";
    if (values.password.trim() === "") errors.password = "Ce champ est requis";

    if (Object.keys(errors).length) {
      setErrors(errors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await api.post("/user/login", values);
      if (!res.ok) {
        if (res.code === "NOT_FOUND") {
          setErrors({ login: "E-mail ou mot de passe erroné" });
          return setLoading(false);
        } else throw res;
      }
      api.setToken(res.data.token);
      setAuth(res.data.user, res.data.publisher);
      navigate("/performance");
    } catch (error) {
      captureError(error, "Erreur lors de la connexion");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col bg-white px-32 py-10">
      <Helmet>
        <title>Connexion - API Engagement</title>
      </Helmet>
      <h2 className="font-light">Connexion</h2>
      <h1 className="text-4xl font-bold">Accedez à votre espace</h1>

      <label className="mb-2 mt-6 text-sm" htmlFor="email">
        E-mail
      </label>
      <input className={`input mb-2 ${errors.email ? "border-b-red-error" : "border-b-black"}`} name="email" id="email" type="email" />
      {errors.email && (
        <div className="flex items-center text-sm text-red-error">
          <RiErrorWarningFill className="mr-2" />
          {errors.email}
        </div>
      )}

      <label className="mb-2 mt-6 text-sm" htmlFor="password">
        Mot de passe
      </label>
      <input className={`input mb-2 ${errors.password ? "border-b-red-error" : "border-b-black"}`} name="password" type="password" id="password" />
      {errors.password && (
        <div className="flex items-center text-sm text-red-error">
          <RiErrorWarningFill className="mr-2" />
          {errors.password}
        </div>
      )}

      <div className="mb-6 mt-2 text-right text-xs">
        <Link to="/forgot-password" className="text-back underline">
          Mot de passe oublié ?
        </Link>
      </div>
      <button type="submit" className="button bg-blue-france text-white hover:bg-blue-france-hover" disabled={loading}>
        {loading ? "Chargement..." : "Se connecter"}
      </button>
      {errors.login && (
        <div className="mt-4 flex items-center text-sm text-red-error">
          <RiErrorWarningFill className="mr-2" />
          {errors.login}
        </div>
      )}
    </form>
  );
};

export default Login;
