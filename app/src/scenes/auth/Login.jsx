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
  const [step, setStep] = useState("credentials");
  const [mfaToken, setMfaToken] = useState(null);
  const { setAuth } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    const loggedout = new URLSearchParams(window.location.search).get("loggedout");
    if (loggedout) toast.info("Vous avez été déconnecté");
  }, []);

  const completeLogin = (data) => {
    api.setToken(data.token);
    setAuth(data.user, data.publisher);
    navigate("/performance");
  };

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
        } else if (res.code === "SERVICE_UNAVAILABLE") {
          setErrors({ login: "Envoi du code impossible pour le moment, veuillez réessayer." });
          return setLoading(false);
        } else throw res;
      }
      if (res.data.mfaRequired) {
        setMfaToken(res.data.mfaToken);
        setStep("mfa");
        toast.info("Un code de vérification vous a été envoyé par e-mail");
      } else {
        completeLogin(res.data);
      }
    } catch (error) {
      captureError(error);
    }
    setLoading(false);
  };

  // Retour à l'étape identifiants quand le challenge n'est plus exploitable (expiré / essais épuisés).
  const resetToCredentials = (message) => {
    setMfaToken(null);
    setStep("credentials");
    setErrors({ login: message });
  };

  const handleVerifyMfa = async (event) => {
    event.preventDefault();
    const code = event.target.code.value.trim();
    const rememberDevice = event.target.rememberDevice.checked;

    if (!code) {
      setErrors({ code: "Le code est requis." });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await api.post("/user/login/mfa", { code, rememberDevice }, { headers: { Authorization: `jwt ${mfaToken}` }, skipAuthRedirect: true });
      if (!res.ok) {
        setLoading(false);
        if (res.code === "TOO_MANY_ATTEMPTS") {
          return resetToCredentials("Trop de tentatives. Veuillez recommencer la connexion.");
        }
        if (res.code === "REQUEST_EXPIRED") {
          return resetToCredentials("Votre session a expiré, veuillez vous reconnecter.");
        }
        if (res.code === "SERVICE_UNAVAILABLE") {
          return setErrors({ code: "Service momentanément indisponible, veuillez réessayer." });
        }
        return setErrors({ code: "Code incorrect ou expiré." });
      }
      completeLogin(res.data);
    } catch (error) {
      captureError(error);
    }
    setLoading(false);
  };

  const handleResend = async () => {
    try {
      const res = await api.post("/user/login/mfa/resend", {}, { headers: { Authorization: `jwt ${mfaToken}` }, skipAuthRedirect: true });
      if (!res.ok) {
        if (res.code === "TOO_MANY_ATTEMPTS") return toast.info("Veuillez patienter avant de demander un nouveau code");
        if (res.code === "REQUEST_EXPIRED") return resetToCredentials("Votre session a expiré, veuillez vous reconnecter.");
        return toast.error("Impossible d'envoyer un nouveau code, veuillez réessayer.");
      }
      toast.info("Un nouveau code vous a été envoyé");
    } catch (error) {
      captureError(error);
    }
  };

  if (step === "mfa") {
    return (
      <form onSubmit={handleVerifyMfa} noValidate className="flex h-full flex-col bg-white px-4 py-10 sm:px-32">
        <title>API Engagement - Vérification</title>
        <h1 className="font-light">Vérification</h1>
        <h2 className="text-4xl font-bold">Saisissez votre code</h2>
        <p className="text-text-mention mt-4 text-sm">Un code à 6 chiffres vous a été envoyé par e-mail.</p>

        <label className="mt-6 mb-2 text-sm" htmlFor="code">
          Code de vérification
          <span className="text-error ml-1" aria-hidden="true">
            *
          </span>
        </label>
        <input
          className={`input mb-2 ${errors.code ? "border-b-error" : "border-b-black"}`}
          name="code"
          id="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          required
          aria-required="true"
          aria-invalid={errors.code ? true : undefined}
          aria-describedby={errors.code ? "code-error" : undefined}
        />
        {errors.code && (
          <p id="code-error" className="text-error flex items-center text-sm" aria-live="polite">
            <RiErrorWarningFill className="mr-2 shrink-0" aria-hidden="true" />
            {errors.code}
          </p>
        )}

        <label className="mt-4 mb-6 flex items-center gap-2 text-sm">
          <input type="checkbox" name="rememberDevice" className="size-4" />
          Se souvenir de cet appareil (30 jours)
        </label>

        <button type="submit" className="primary-btn w-full" disabled={loading}>
          {loading ? "Chargement..." : "Vérifier"}
        </button>
        <button type="button" onClick={handleResend} className="text-back mt-4 text-xs underline">
          Renvoyer le code
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex h-full flex-col bg-white px-4 py-10 sm:px-32">
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
      <p id="email-hint" className="text-text-mention mb-2 text-xs">
        Exemple de format attendu : jane.doe@gmail.com
      </p>
      <input
        className={`input mb-2 ${errors.email ? "border-b-error" : "border-b-black"}`}
        name="email"
        id="email"
        type="email"
        autoComplete="email"
        required
        aria-required="true"
        aria-invalid={errors.email ? true : undefined}
        aria-describedby={errors.email ? "email-error email-hint" : "email-hint"}
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
