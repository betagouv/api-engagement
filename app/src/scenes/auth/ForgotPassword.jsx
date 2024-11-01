import { useState } from "react";
import { RiCheckboxCircleFill, RiErrorWarningFill } from "react-icons/ri";
import validator from "validator";

import api from "../../services/api";
import { captureError } from "../../services/error";

const Forgot = () => {
  const [values, setValues] = useState({ email: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!validator.isEmail(values.email)) {
      errors.email = true;
    }
    setErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      await api.post("/user/forgot-password", { email: values.email });
      setDone(true);
    } catch (error) {
      captureError(error, "Une erreur s'est produite lors de la soumission.");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col bg-white px-32 py-10">
      <h2 className="font-light">Mot de passe oublié</h2>
      <h1 className="text-4xl font-bold">Récupérez votre mot de passe</h1>

      <label className="mb-2 mt-6 text-sm" htmlFor="email">
        E-mail
      </label>
      <input
        className={`input mb-2 ${errors.email ? "border-b-red-main" : "border-b-black"}`}
        name="email"
        id="email"
        value={values.email}
        onChange={(e) => setValues({ ...values, email: e.target.value })}
      />
      {errors.email && (
        <div className="flex items-center text-sm text-red-main">
          <RiErrorWarningFill className="mr-2" />
          Adresse email invalide
        </div>
      )}

      <button type="submit" className="button mt-6 bg-blue-dark text-white hover:bg-blue-main" disabled={errors.email || loading || done}>
        {loading ? "Chargement..." : "Réinitialisez votre mot de passe"}
      </button>

      {done && (
        <div className="mt-4 flex items-center text-sm text-green-main">
          <RiCheckboxCircleFill className="mr-2" />
          <p>Si votre adresse email est valide, un e-mail vous a été envoyé pour vous permettre de réinitialiser votre mot de passe.</p>
        </div>
      )}
    </form>
  );
};

export default Forgot;
