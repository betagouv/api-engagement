import { useState } from "react";
import { IoMdEye, IoMdEyeOff } from "react-icons/io";
import { RiCheckboxCircleFill, RiErrorWarningFill } from "react-icons/ri";
import { TiDeleteOutline } from "react-icons/ti";
import { Navigate } from "react-router-dom";
import { toast } from "react-toastify";

import Modal from "../../components/New-Modal";
import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";

const Account = () => {
  const { user, setUser, setAuth } = useStore();
  const [values, setValues] = useState({
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!values.firstname) errors.firstname = "Le nom est requis";

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
              api.removeToken();
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
            <input
              id="firstname"
              className={`input mb-2 ${errors.firstname ? "border-b-red-main" : "border-b-black"}`}
              name="firstname"
              value={values.firstname}
              onChange={(e) => setValues({ ...values, firstname: e.target.value })}
            />
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
            <input
              id="lastname"
              className={`input mb-2 ${errors.lastname ? "border-b-red-main" : "border-b-black"}`}
              name="lastname"
              value={values.lastname}
              onChange={(e) => setValues({ ...values, lastname: e.target.value })}
            />
          </div>
          <div className="col-span-2 flex flex-col">
            <label className="mb-2 text-sm" htmlFor="email">
              E-mail
            </label>
            <input id="email" className="input mb-2 border-b-black" name="email" disabled value={values.email} />
          </div>

          <div className="col-span-2 flex justify-end gap-4">
            <ResetPasswordModal />

            <button type="submit" className="filled-button" disabled={!isChanged() || isErrors()}>
              Mettre à jour
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const ResetPasswordModal = () => {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async () => {
    const errors = {};
    if (values.newPassword.length < 12 || !/[a-zA-Z]/.test(values.newPassword) || !/[0-9]/.test(values.newPassword) || !/[!-@#$%^&*(),.?":{}|<>]/.test(values.newPassword)) {
      errors.newPassword = "Le mot de passe ne respecte pas les critères de sécurité";
    }
    if (values.newPassword === values.oldPassword) {
      errors.newPassword = "Le nouveau mot de passe ne peut pas être identique à l'ancien mot de passe";
    }
    if (values.newPassword !== values.confirmPassword) {
      errors.confirmPassword = "Les mots de passe ne sont pas identiques";
    }

    setErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      const res = await api.put(`/user/change-password`, values);
      if (!res.ok) {
        if (res.code === "INVALID_PASSWORD") {
          setErrors({ newPassword: "Le mot de passe ne respecte pas les critères de sécurité" });
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
    <>
      <button type="button" className="empty-button" onClick={() => setOpen(true)}>
        Réinitialiser le mot de passe
      </button>

      <Modal isOpen={open} onClose={onClose}>
        <div className="p-12">
          <h2 className="text-lg font-bold mb-12">Changement du mot de passe</h2>
          <div className="flex flex-col">
            <div className="flex flex-col">
              <label className="mb-2 text-sm" htmlFor="old-password">
                Ancien mot de passe
              </label>
              <input
                id="old-password"
                className={`input mb-2 ${errors.oldPassword ? "border-b-red-main" : "border-b-black"}`}
                name="oldPassword"
                type="password"
                value={values.oldPassword}
                onChange={(e) => setValues({ ...values, oldPassword: e.target.value })}
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
                <label className="mb-2 text-sm" htmlFor="new-password">
                  Nouveau mot de passe
                </label>
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => setShowNewPassword(!showNewPassword)}>
                  {showNewPassword ? <IoMdEyeOff className="text-blue-dark" /> : <IoMdEye className="text-blue-dark" />}
                  <span className="text-xs font-bold text-blue-dark">{showNewPassword ? "CACHER" : "AFFICHER"}</span>
                </div>
              </div>
              <input
                id="new-password"
                className={`input mb-2 ${errors.newPassword ? "border-b-red-main" : "border-b-black"}`}
                name="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={values.newPassword}
                onChange={(e) => setValues({ ...values, newPassword: e.target.value })}
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
                <label className="mb-2 text-sm" htmlFor="confirm-password">
                  Confirmez le nouveau mot de passe
                </label>
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <IoMdEyeOff className="text-blue-dark" /> : <IoMdEye className="text-blue-dark" />}
                  <span className="text-xs font-bold text-blue-dark">{showConfirmPassword ? "CACHER" : "AFFICHER"}</span>
                </div>
              </div>
              <input
                id="confirm-password"
                className={`input mb-2 ${errors.confirmPassword ? "border-b-red-main" : "border-b-black"}`}
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={values.confirmPassword}
                onChange={(e) => setValues({ ...values, confirmPassword: e.target.value })}
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
                <span className={`align-middle text-sm ${values.newPassword && /[a-zA-Z]/.test(values.newPassword) ? "text-green-600" : "text-gray-600"}`}>
                  Au moins une lettre
                </span>
              </div>
              <div className="flex gap-2 items-center">
                {/[0-9]/.test(values.newPassword) ? <RiCheckboxCircleFill className="text-green-700" /> : <RiCheckboxCircleFill className="text-gray-600" />}
                <span className={`align-middle text-sm ${values.newPassword && /[0-9]/.test(values.newPassword) ? "text-green-600" : "text-gray-600"}`}>Au moins un chiffre</span>
              </div>
              <div className="flex gap-2 items-center">
                {/[!-@#$%^&*(),.?":{}|<>]/.test(values.newPassword) ? <RiCheckboxCircleFill className="text-green-700" /> : <RiCheckboxCircleFill className="text-gray-600" />}
                <span className={`align-middle text-sm ${values.newPassword && /[!-@#$%^&*(),.?":{}|<>]/.test(values.newPassword) ? "text-green-600" : "text-gray-600"}`}>
                  Au moins un caractère spécial
                </span>
              </div>
            </div>

            <div className="mt-8 flex gap-2 justify-end">
              <button type="button" className="button border text-blue-dark py-2 px-4 hover:bg-gray-hover" onClick={() => setOpen(false)}>
                Annuler
              </button>
              <button type="button" className="filled-button" disabled={isErrors()} onClick={handleSubmit}>
                Mettre à jour
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Account;
