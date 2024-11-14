import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AiFillCloseCircle } from "react-icons/ai";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import { RiErrorWarningFill } from "react-icons/ri";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import ErrorAlert from "../../components/ErrorAlert";
import WarningAlert from "../../components/WarningAlert";
import api from "../../services/api";
import { captureError } from "../../services/error";

const Signup = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [user, setUser] = useState();
  const [error, setError] = useState();

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const res = await api.post("/user/verify-token", { token });
      if (!res.ok) {
        if (res.code === "NOT_FOUND") return setError("invalide");
        else if (res.code === "REQUEST_EXPIRED") return setError("expired");
        else throw res;
      }
      setUser(res.data);
    } catch (error) {
      captureError(error, "Erreur lors de la vérification du token");
    }
  };

  return (
    <div className="h-full w-full bg-white px-32 py-10">
      <Helmet>
        <title>Inscription - API Engagement</title>
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
        <SignupForm user={user} />
      )}
    </div>
  );
};

const SignupForm = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [values, setValues] = useState({
    firstname: "",
    lastname: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (user) {
      setValues({
        firstname: user.firstname || "",
        lastname: user.lastname || "",
        email: user.email || "",
        password: "",
        confirmPassword: "",
      });
    }
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
    if (values.firstname.trim() === "") {
      errors.firstname = "Le prénom est requis";
    }
    if (values.password.length < 12 || !/[a-zA-Z]/.test(values.password) || !/[0-9]/.test(values.password) || !/[!@#$%^&*(),.?":{}|<>]/.test(values.password)) {
      errors.password = "Le mot de passe ne respecte pas les critères de sécurité";
    }
    if (values.password === values.email) {
      errors.password = "Le mot de passe ne peut pas être identique à l'adresse email";
    }
    if (values.password !== values.confirmPassword) {
      errors.confirmPassword = "Les mots de passe ne sont pas identiques";
    }

    if (Object.keys(errors).length > 0) {
      setErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/user/signup", { ...values, id: user._id.toString() });
      if (!res.ok) throw res;
      toast.success("Compte créé avec succès");
      navigate("/login");
    } catch (error) {
      captureError(error, "Erreur lors de la création du compte");
    }
    setLoading(false);
  };

  if (!user) return <div>Chargement...</div>;

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <h2 className="font-light">Complétez votre compte</h2>
      <h1 className="leading-tight">Renseignez vos informations</h1>
      <div className="flex flex-col">
        <label className="mb-2" htmlFor="firstname">
          Prénom
        </label>
        <input
          className={`input mb-2 ${submitted && errors.firstname ? "border-b-red-main" : "border-b-black"}`}
          name="firstname"
          value={values.firstname}
          onChange={handleChange}
        />
        {submitted && errors.firstname && (
          <div className="flex items-center text-sm text-red-main">
            <RiErrorWarningFill className="mr-2" />
            {errors.firstname}
          </div>
        )}
      </div>
      <div className="flex flex-col">
        <label className="mb-2" htmlFor="lastname">
          Nom de famille
        </label>
        <input className={`input mb-2 ${submitted && errors.lastname ? "border-b-red-main" : "border-b-black"}`} name="lastname" value={values.lastname} onChange={handleChange} />
        {submitted && errors.lastname && (
          <div className="flex items-center text-sm text-red-main">
            <RiErrorWarningFill className="mr-2" />
            {errors.lastname}
          </div>
        )}
      </div>
      <div className="flex flex-col">
        <div className="flex justify-between">
          <label className="mb-1" htmlFor="password">
            Mot de passe
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
        />
        {submitted && errors.password && (
          <div className="flex items-center text-sm text-red-main">
            <RiErrorWarningFill className="mr-2" />
            {errors.password}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 mt-1">
        <div className="flex gap-2 items-center">
          {values.password.length >= 12 ? <AiFillCloseCircle className="text-green-700" /> : <AiFillCloseCircle className="text-gray-600" />}
          <span className={`align-middle text-sm ${values.password.length >= 12 ? "text-green-600" : "text-gray-600"}`}>Au moins 12 caractères</span>
        </div>
        <div className="flex gap-2 items-center">
          {/[a-zA-Z]/.test(values.password) ? <AiFillCloseCircle className="text-green-700" /> : <AiFillCloseCircle className="text-gray-600" />}
          <span className={`align-middle text-sm ${/[a-zA-Z]/.test(values.password) ? "text-green-600" : "text-gray-600"}`}>Au moins une lettre</span>
        </div>
        <div className="flex gap-2 items-center">
          {/[0-9]/.test(values.password) ? <AiFillCloseCircle className="text-green-700" /> : <AiFillCloseCircle className="text-gray-600" />}
          <span className={`align-middle text-sm ${/[0-9]/.test(values.password) ? "text-green-600" : "text-gray-600"}`}>Au moins un chiffre</span>
        </div>
        <div className="flex gap-2 items-center">
          {/[!@#$%^&*(),.?":{}|<>]/.test(values.password) ? <AiFillCloseCircle className="text-green-700" /> : <AiFillCloseCircle className="text-gray-600" />}
          <span className={`align-middle text-sm ${/[!@#$%^&*(),.?":{}|<>]/.test(values.password) ? "text-green-600" : "text-gray-600"}`}>Au moins un caractère spécial</span>
        </div>
      </div>
      <div className="flex flex-col mt-4">
        <div className="flex justify-between">
          <label className="mb-1" htmlFor="confirmPassword">
            Confirmation du mot de passe
          </label>
          <div className="flex items-center gap-1 cursor-pointer" onClick={() => setShowConfirm(!showConfirm)}>
            {showConfirm ? <IoMdEyeOff className="text-blue-dark" /> : <IoMdEye className="text-blue-dark" />}
            <span className="text-xs font-bold text-blue-dark">{showConfirm ? "CACHER" : "AFFICHER"}</span>
          </div>
        </div>
        <input
          className={`input mb-2 ${submitted && errors.confirmPassword ? "border-2 border-b-red-main" : "border-b-black"}`}
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
      <button type="submit" className="button mt-6 bg-blue-dark text-white hover:bg-blue-main" disabled={loading}>
        {loading ? "Chargement..." : "S'inscrire"}
      </button>
    </form>
  );
};

export default Signup;
