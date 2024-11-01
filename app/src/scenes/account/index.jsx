import { useState } from "react";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import { RiCheckboxCircleFill, RiErrorWarningFill } from "react-icons/ri";
import { TiDeleteOutline } from "react-icons/ti";
import { Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import validator from "validator";

import Modal from "../../components/New-Modal";
import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";

const Account = () => {
  const [open, setOpen] = useState(false);
  const { user, setUser, setAuth } = useStore();
  const [values, setValues] = useState({
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues({
      ...values,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    if (validator.isEmpty(values.firstname)) errors.firstname = "Le nom est requis";

    setErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      const res = await api.put(`/user/`, values);
      if (!res.ok) throw res;
      toast.success("Paramètres mis à jour");
      setUser(res.data);
    } catch (error) {
      captureError(error, "Erreur lors de la mise à jour des paramètres");
    }
  };

  const isChanged = () => values.firstname !== user.firstname || values.lastname !== user.lastname;
  const isErrors = () => !!errors.firstname;

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="space-y-12">
      <h1 className="text-4xl font-bold">Mon compte</h1>

      <form onSubmit={handleSubmit} className="bg-white shadow-lg p-12">
        <div className="mb-6 flex justify-between">
          <h2 className="text-3xl font-bold">Vos informations</h2>
          <div
            className="flex cursor-pointer items-center text-sm text-red-main"
            onClick={() => {
              localStorage.removeItem("token");
              setAuth(null, null);
            }}
          >
            <TiDeleteOutline className="mr-2" />
            <span>Se deconnecter</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-5">
          <div className="flex flex-col">
            <label className="mb-2 text-sm" htmlFor="firstname">
              Prénom
            </label>
            <input className={`input mb-2 ${errors.firstname ? "border-b-red-main" : "border-b-black"}`} name="firstname" value={values.firstname} onChange={handleChange} />
            {errors.firstname && (
              <div className="flex items-center text-sm text-red-main">
                <RiErrorWarningFill className="mr-2" />
                {errors.firstname}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <label className="mb-2 text-sm" htmlFor="lastname">
              Nom de famille
            </label>
            <input className={`input mb-2 ${errors.lastname ? "border-b-red-main" : "border-b-black"}`} name="lastname" value={values.lastname} onChange={handleChange} />
          </div>
          <div className="col-span-2 flex flex-col">
            <label className="mb-2 text-sm" htmlFor="email">
              E-mail
            </label>
            <input className="input mb-2 border-b-black" name="email" disabled value={values.email} />
          </div>

          <div className="col-span-2 flex justify-end gap-4">
            <button type="button" className="empty-button" onClick={() => setOpen(true)}>
              Réinitialiser le mot de passe
            </button>

            <button type="submit" className="filled-button" disabled={!isChanged() || isErrors()}>
              Mettre à jour
            </button>
          </div>
        </div>
      </form>
      <ResetPasswordModal open={open} setOpen={setOpen} />
    </div>
  );
};

const ResetPasswordModal = ({ open, setOpen }) => {
  const [values, setValues] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues({
      ...values,
      [name]: value,
    });
    setErrors((prevErrors) => ({ ...prevErrors, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    if (values.newPassword.length < 12 || !/[a-zA-Z]/.test(values.newPassword) || !/[0-9]/.test(values.newPassword) || !/[!@#$%^&*(),.?":{}|<>]/.test(values.newPassword)) {
      errors.newPassword = "Le mot de passe ne respecte pas les critères de sécurité";
    }
    if (values.newPassword === values.oldPassword) {
      errors.newPassword = "Le mot de passe ne peut pas être identique à l'ancien mot de passe";
    }
    if (values.newPassword !== values.confirmPassword) {
      errors.confirmPassword = "Les mots de passe ne sont pas identiques";
    }

    setErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      const res = await api.put(`/user/change-password`, values);
      if (!res.ok) {
        if (res.message === "Old password is not correct") {
          setErrors({ oldPassword: "Ancien mot de passe incorrect" });
          return;
        }
        throw res;
      }
      toast.success("Mot de passe mis à jour");
      setOpen(false);
    } catch (error) {
      captureError(error, "Erreur lors de la mise à jour du mot de passe");
    }
  };

  const onClose = () => {
    setErrors({});
    setValues({
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setOpen(false);
  };

  const isErrors = () => errors.oldPassword || errors.newPassword || errors.confirmPassword;

  return (
    <Modal className="w-full max-w-3xl" isOpen={open} onClose={onClose}>
      <div className="p-12">
        <h2 className="mb-12">Changement du mot de passe</h2>
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex flex-col">
            <label className="mb-2 text-sm" htmlFor="oldPassword">
              Ancien mot de passe
            </label>
            <input
              className={`input mb-2 ${errors.oldPassword ? "border-b-red-main" : "border-b-black"}`}
              name="oldPassword"
              type="password"
              value={values.oldPassword}
              onChange={handleChange}
            />
            {errors.oldPassword && (
              <div className="flex items-center text-sm text-red-main">
                <RiErrorWarningFill className="mr-2" />
                {errors.oldPassword}
              </div>
            )}
          </div>
          <div className="flex flex-col mt-4">
            <div className="flex justify-between">
              <label className="mb-2 text-sm" htmlFor="newPassword">
                Nouveau mot de passe
              </label>
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => setShowNewPassword(!showNewPassword)}>
                {showNewPassword ? <IoMdEyeOff className="text-blue-dark" /> : <IoMdEye className="text-blue-dark" />}
                <span className="text-xs font-bold text-blue-dark">{showNewPassword ? "CACHER" : "AFFICHER"}</span>
              </div>
            </div>
            <input
              className={`input mb-2 ${errors.newPassword ? "border-b-red-main" : "border-b-black"}`}
              name="newPassword"
              type={showNewPassword ? "text" : "password"}
              value={values.newPassword}
              onChange={handleChange}
              autoComplete="new-password"
            />
            {errors.newPassword && (
              <div className="flex items-center text-sm text-red-main">
                <RiErrorWarningFill className="mr-2" />
                {errors.newPassword}
              </div>
            )}
          </div>
          <div className="flex flex-col mt-4">
            <div className="flex justify-between">
              <label className="mb-2 text-sm" htmlFor="confirmPassword">
                Confirmez le nouveau mot de passe
              </label>
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <IoMdEyeOff className="text-blue-dark" /> : <IoMdEye className="text-blue-dark" />}
                <span className="text-xs font-bold text-blue-dark">{showConfirmPassword ? "CACHER" : "AFFICHER"}</span>
              </div>
            </div>
            <input
              className={`input mb-2 ${errors.confirmPassword ? "border-b-red-main" : "border-b-black"}`}
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={values.confirmPassword}
              onChange={handleChange}
            />
            {errors.confirmPassword && (
              <div className="flex items-center text-sm text-red-main">
                <RiErrorWarningFill className="mr-2" />
                {errors.confirmPassword}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <div className="flex gap-2 items-center">
              {(values.newPassword || "").length >= 12 ? <RiCheckboxCircleFill className="text-green-700" /> : <RiCheckboxCircleFill className="text-gray-600" />}
              <span className={`align-middle text-sm ${values.newPassword && (values.newPassword || "").length >= 12 ? "text-green-600" : "text-gray-600"}`}>
                Au moins 12 caractères
              </span>
            </div>
            <div className="flex gap-2 items-center">
              {/[a-zA-Z]/.test(values.newPassword) ? <RiCheckboxCircleFill className="text-green-700" /> : <RiCheckboxCircleFill className="text-gray-600" />}
              <span className={`align-middle text-sm ${values.newPassword && /[a-zA-Z]/.test(values.newPassword) ? "text-green-600" : "text-gray-600"}`}>Au moins une lettre</span>
            </div>
            <div className="flex gap-2 items-center">
              {/[0-9]/.test(values.newPassword) ? <RiCheckboxCircleFill className="text-green-700" /> : <RiCheckboxCircleFill className="text-gray-600" />}
              <span className={`align-middle text-sm ${values.newPassword && /[0-9]/.test(values.newPassword) ? "text-green-600" : "text-gray-600"}`}>Au moins un chiffre</span>
            </div>
            <div className="flex gap-2 items-center">
              {/[!@#$%^&*(),.?":{}|<>]/.test(values.newPassword) ? <RiCheckboxCircleFill className="text-green-700" /> : <RiCheckboxCircleFill className="text-gray-600" />}
              <span className={`align-middle text-sm ${values.newPassword && /[!@#$%^&*(),.?":{}|<>]/.test(values.newPassword) ? "text-green-600" : "text-gray-600"}`}>
                Au moins un caractère spécial
              </span>
            </div>
          </div>

          <div className="mt-8 flex gap-2 justify-end">
            <button className="button border text-blue-dark py-2 px-4 hover:bg-gray-hover" type="button" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="filled-button" disabled={isErrors()}>
              Mettre à jour
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default Account;
