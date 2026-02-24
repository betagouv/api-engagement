import { useState } from "react";
import { RiCheckboxCircleFill, RiErrorWarningFill } from "react-icons/ri";

import api from "@/services/api";
import { captureError } from "@/services/error";
import { isValidEmail } from "@/services/utils";

const Forgot = () => {
  const [values, setValues] = useState({ email: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!isValidEmail(values.email)) {
      errors.email = true;
    }
    setErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      await api.post("/user/forgot-password", { email: values.email });
      setDone(true);
    } catch (error) {
      captureError(error, { extra: { values } });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col bg-white px-32 py-10">
      <title>API Engagement - Mot de passe oublié</title>
      <h1 className="text-4xl font-bold">Récupérez votre mot de passe</h1>

      <label className="mt-6 mb-2 text-sm" htmlFor="email">
        E-mail
      </label>
      <input
        className={`input mb-2 ${errors.email ? "border-b-error" : "border-b-black"}`}
        name="email"
        id="email"
        value={values.email}
        onChange={(e) => setValues({ ...values, email: e.target.value })}
      />
      {errors.email && (
        <div className="text-error flex items-center text-sm">
          <RiErrorWarningFill className="mr-2" />
          Adresse email invalide
        </div>
      )}

      <button type="submit" className="primary-btn mt-6 w-full" disabled={errors.email || loading || done}>
        {loading ? "Chargement..." : "Réinitialisez votre mot de passe"}
      </button>

      {done && (
        <div className="text-success mt-4 flex items-center text-sm">
          <RiCheckboxCircleFill className="mr-2" />
          <p>Si votre adresse email est valide, un e-mail vous a été envoyé pour vous permettre de réinitialiser votre mot de passe.</p>
        </div>
      )}
    </form>
  );
};

export default Forgot;
