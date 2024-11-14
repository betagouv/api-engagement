import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AiFillCloseCircle } from "react-icons/ai";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import { RiCheckboxCircleFill, RiErrorWarningFill } from "react-icons/ri";
import { Link, useSearchParams } from "react-router-dom";

import ErrorAlert from "../../components/ErrorAlert";
import WarningAlert from "../../components/WarningAlert";
import api from "../../services/api";
import { captureError } from "../../services/error";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [user, setUser] = useState();
  const [error, setError] = useState();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.post("/user/verify-reset-password-token", { token });
        if (!res.ok) {
          if (res.code === "NOT_FOUND") return setError("invalide");
          else if (res.code === "REQUEST_EXPIRED") return setError("expired");
          else throw res;
        }
        setUser(res.data);
      } catch {
        captureError("Erreur lors de la vérification du token");
      }
    };
    fetchData();
  }, [token]);

  return (
    <div className="h-full w-full bg-white px-32 py-10">
      <Helmet>
        <title>Réinitialisation du mot de passe - API Engagement</title>
      </Helmet>
      {error === "invalide" ? (
        <ErrorAlert>
          <p className="text-xl font-bold">La clé n'est pas valide</p>
          <p className="text-sm text-[#3a3a3a]">La clé fournie n'est pas valide, veuillez nous contacter pour accedez à votre compte</p>
        </ErrorAlert>
      ) : error === "expired" ? (
        <WarningAlert>
          <p className="text-xl font-bold">La clé a expiré</p>
          <p className="text-sm text-[#3a3a3a]">La clé fournie est expirée, contactez nous pour avoir un nouveau mail d'inscription</p>
        </WarningAlert>
      ) : (
        <ResetPasswordForm user={user} token={token} />
      )}
    </div>
  );
};

const ResetPasswordForm = ({ user, token }) => {
  const [done, setDone] = useState(false);
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) setValues({ ...values, email: user.email });
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues({ ...values, [name]: value });
    setErrors((prevErrors) => ({ ...prevErrors, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);

    const errors = {};
    // if (values.password.length < 12 || !/[a-zA-Z]/.test(values.password) || !/[0-9]/.test(values.password) || !/[!@#$%^&*(),.?":{}|<>]/.test(values.password)) {
    //   errors.password = "Le mot de passe ne respecte pas les critères de sécurité";
    // }
    if (values.password === user.email) {
      errors.password = "Le mot de passe ne peut pas être identique à l'adresse email";
    }
    if (values.password !== values.confirmPassword) {
      errors.confirmPassword = "Les mots de passe ne sont pas identiques";
    }

    setErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      const res = await api.put("/user/reset-password", { token, password: values.password });
      if (!res.ok) {
        if (res.status === 404) setErrors({ expired: "Réinitialisation expirée" });
        else throw res;
      }
      setDone(true);
    } catch (error) {
      captureError(error, "Erreur lors de la réinitialisation du mot de passe");
    }
  };

  if (!user) return <div>Chargement...</div>;

  return (
    <form className="flex h-full flex-col py-10" onSubmit={handleSubmit}>
      <h2 className="font-light">Mot de passe</h2>
      <h1 className="text-4xl font-bold">Définissez un nouveau mot de passe</h1>

      <div className="flex flex-col mt-4">
        <label className="mb-2 mt-6 text-sm" htmlFor="email">
          Email
        </label>
        <input className="input mb-2" name="email" type="email" value={values.email} disabled />
        <div className="flex justify-between mt-6">
          <label className="mb-2 text-sm" htmlFor="password">
            Nouveau mot de passe
          </label>
          <div className="flex items-center gap-1 cursor-pointer" onClick={() => setShow(!show)}>
            {show ? <IoMdEyeOff className="text-blue-dark" /> : <IoMdEye className="text-blue-dark" />}
            <span className="text-xs font-bold text-blue-dark">{show ? "CACHER" : "AFFICHER"}</span>
          </div>
        </div>

        <input
          className={`input mb-2 ${submitted && errors.password ? "border-2 border-b-red-main" : "border-b-black"}`}
          name="password"
          type={show ? "text" : "password"}
          value={values.password}
          onChange={handleChange}
          autoComplete="new-password"
        />
        {submitted && errors.password && (
          <div className="flex items-center text-sm text-red-main">
            <RiErrorWarningFill className="mr-2" />
            {errors.password}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 mt-2">
        <div className="flex gap-2 items-center">
          {(values.password || "").length >= 12 ? <AiFillCloseCircle className="text-green-700" /> : <AiFillCloseCircle className="text-gray-600" />}
          <span className={`align-middle text-sm ${values.password && (values.password || "").length >= 12 ? "text-green-600" : "text-gray-600"}`}>Au moins 12 caractères</span>
        </div>
        <div className="flex gap-2 items-center">
          {/[a-zA-Z]/.test(values.password) ? <AiFillCloseCircle className="text-green-700" /> : <AiFillCloseCircle className="text-gray-600" />}
          <span className={`align-middle text-sm ${values.password && /[a-zA-Z]/.test(values.password) ? "text-green-600" : "text-gray-600"}`}>Au moins une lettre</span>
        </div>
        <div className="flex gap-2 items-center">
          {/[0-9]/.test(values.password) ? <AiFillCloseCircle className="text-green-700" /> : <AiFillCloseCircle className="text-gray-600" />}
          <span className={`align-middle text-sm ${values.password && /[0-9]/.test(values.password) ? "text-green-600" : "text-gray-600"}`}>Au moins un chiffre</span>
        </div>
        <div className="flex gap-2 items-center">
          {/[!@#$%^&*(),.?":{}|<>]/.test(values.password) ? <AiFillCloseCircle className="text-green-700" /> : <AiFillCloseCircle className="text-gray-600" />}
          <span className={`align-middle text-sm ${values.password && /[!@#$%^&*(),.?":{}|<>]/.test(values.password) ? "text-green-600" : "text-gray-600"}`}>
            Au moins un caractère spécial
          </span>
        </div>
      </div>

      <div className="flex flex-col mt-4">
        <div className="flex justify-between mt-6">
          <label className="mb-2 text-sm" htmlFor="confirmPassword">
            Confirmez ce mot de passe
          </label>
          <div className="flex items-center gap-1 cursor-pointer" onClick={() => setShowConfirm(!showConfirm)}>
            {showConfirm ? <IoMdEyeOff className="text-blue-dark" /> : <IoMdEye className="text-blue-dark" />}
            <span className="text-xs font-bold text-blue-dark">{showConfirm ? "CACHER" : "AFFICHER"}</span>
          </div>
        </div>
        <input
          className={`input mb-2 ${submitted && errors.confirmPassword ? "border-b-red-main" : "border-b-black"}`}
          name="confirmPassword"
          type={showConfirm ? "text" : "password"}
          value={values.confirmPassword}
          onChange={handleChange}
        />
        {submitted && errors.confirmPassword && (
          <div className="flex items-center text-sm text-red-main">
            <RiErrorWarningFill className="mr-2" />
            {errors.confirmPassword}
          </div>
        )}
      </div>

      {submitted && errors.expired && (
        <div className="flex items-center text-sm text-red-main">
          <RiErrorWarningFill className="mr-2" />
          <Link to="/forgot-password" className="underline">
            Réinitialisation expirée
          </Link>
        </div>
      )}

      <button type="submit" className="button mt-6 bg-blue-dark text-white hover:bg-blue-main" disabled={errors.confirmPassword || errors.password || errors.expired}>
        Enregister
      </button>

      {done && (
        <div className="mt-4 flex items-center text-sm text-green-main">
          <RiCheckboxCircleFill className="mr-2" />
          <p>
            Nouveau mot de passe enregistré <br />
            <Link to="/login" className="underline">
              Retourner à la page de connexion
            </Link>
          </p>
        </div>
      )}
    </form>
  );
};

export default ResetPassword;
