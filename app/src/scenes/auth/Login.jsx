import { useEffect, useState } from "react";
import { RiErrorWarningFill } from "react-icons/ri";
import { Link, useNavigate } from "react-router-dom";

import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";
import { toast } from "@/services/toast";
import { isValidEmail } from "@/utils/string";

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
    if (!isValidEmail(values.email)) errors.email = "Le format de l'adresse e-mail n'est pas valide. Exemple de format valide : jane.doe@gmail.com.";
    if (values.password.trim() === "") errors.password = "Le mot de passe est requis.";

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
      captureError(error, { extra: { values } });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col bg-white px-4 py-10 sm:px-32">
      <title>API Engagement - Connexion</title>
      <h1 className="font-light">Connexion</h1>
      <h2 className="text-4xl font-bold">Accedez à votre espace</h2>

      <p className="text-text-mention mt-4 text-sm">
        <span className="text-error" aria-hidden="true">
          *
        </span>{" "}
        : champ obligatoire
      </p>

      <label className="mt-6 mb-2 text-sm" htmlFor="email">
        E-mail
        <span className="text-error ml-1" aria-hidden="true">
          *
        </span>
      </label>
      <input
        className={`input mb-2 ${errors.email ? "border-b-error" : "border-b-black"}`}
        name="email"
        id="email"
        type="email"
        autoComplete="email"
        required
        aria-required="true"
        aria-invalid={errors.email ? true : undefined}
        aria-describedby={errors.email ? "email-error" : undefined}
      />
      {errors.email && (
        <p id="email-error" className="text-error flex items-center text-sm" aria-live="polite">
          <RiErrorWarningFill className="mr-2 shrink-0" aria-hidden="true" />
          {errors.email}
        </p>
      )}

      <label className="mt-6 mb-2 text-sm" htmlFor="password">
        Mot de passe
        <span className="text-error ml-1" aria-hidden="true">
          *
        </span>
      </label>
      <input
        className={`input mb-2 ${errors.password ? "border-b-error" : "border-b-black"}`}
        name="password"
        type="password"
        id="password"
        autoComplete="current-password"
        required
        aria-required="true"
        aria-invalid={errors.password ? true : undefined}
        aria-describedby={errors.password ? "password-error" : undefined}
      />
      {errors.password && (
        <p id="password-error" className="text-error flex items-center text-sm" aria-live="polite">
          <RiErrorWarningFill className="mr-2 shrink-0" aria-hidden="true" />
          {errors.password}
        </p>
      )}

      <div className="mt-2 mb-6 text-right text-xs">
        <Link to="/forgot-password" className="text-back underline">
          Mot de passe oublié ?
        </Link>
      </div>
      <button type="submit" className="primary-btn w-full" disabled={loading}>
        {loading ? "Chargement..." : "Se connecter"}
      </button>
      {errors.login && (
        <p className="text-error mt-4 flex items-center text-sm" role="alert">
          <RiErrorWarningFill className="mr-2 shrink-0" aria-hidden="true" />
          {errors.login}
        </p>
      )}
    </form>
  );
};

export default Login;
