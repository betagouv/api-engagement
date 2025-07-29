import { useEffect, useState } from "react";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import Footer from "./components/Footer";
import Header from "./components/Header";
import Loader from "./components/Loader";
import Nav from "./components/Nav";
import Account from "./scenes/account";
import AdminAccounts from "./scenes/admin-account";
import AdminMissions from "./scenes/admin-mission";
import AdminStats from "./scenes/admin-stats";
import AdminWarnings from "./scenes/admin-warning";
import ForgotPassword from "./scenes/auth/ForgotPassword";
import Login from "./scenes/auth/Login";
import LoginAs from "./scenes/auth/LoginAs";
import ResetPassword from "./scenes/auth/ResetPassword";
import Signup from "./scenes/auth/Signup";
import Broadcast from "./scenes/broadcast";
import Campaign from "./scenes/campaign";
import CGU from "./scenes/cgu";
import Mission from "./scenes/mission";
import MyMissions from "./scenes/my-missions";
import Performance from "./scenes/performance";

import Settings from "./scenes/settings";
import Warnings from "./scenes/warnings";
import Widget from "./scenes/widget";

import image from "./assets/img/background-connexion.jpg";
import AdminOrganization from "./scenes/admin-organization";
import AdminReport from "./scenes/admin-report";
import PublicStats from "./scenes/public-stats";
import Publisher from "./scenes/publisher";
import User from "./scenes/user";
import api from "./services/api";
import { ENV } from "./services/config";
import { captureError } from "./services/error";
import useStore from "./services/store";

const TOAST_STYLES = {
  success: "bg-green-dark text-white",
  error: "bg-red-dark text-white",
  info: "bg-blue-dark text-white",
  warning: "bg-orange-warning",
  default: "bg-white border border-gray-border",
  dark: "bg-dark text-white border border white",
};

const App = () => {
  return (
    <>
      <ToastContainer
        className="p-0"
        toastClassName={({ type }) => TOAST_STYLES[type || "default"] + ` flex justify-between py-4 px-3 min-h-10 shadow-none rounded-none`}
        bodyClassName={() => "flex gap-4 text-sm"}
        progressClassName="m-0.5"
        position="top-right"
        autoClose={5000}
      />
      <HelmetProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/connect" element={<LoginAs />} />
            </Route>

            <Route element={<PublicLayout />}>
              <Route path="/public-stats" element={<PublicStats />} />
              <Route path="/cgu" element={<CGU />} />
            </Route>
            <Route element={<ProtectedLayout />}>
              <Route path="/performance/*" element={<Performance />} />
              <Route path="/broadcast/*" element={<Broadcast />} />
              <Route path="/my-missions/*" element={<MyMissions />} />
              <Route path="/settings/*" element={<Settings />} />
              <Route path="/mission/*" element={<Mission />} />
              <Route path="/warning/*" element={<Warnings />} />
              <Route path="/my-account" element={<Account />} />

              <Route element={<AdminLayout />}>
                <Route path="/broadcast/campaign/*" element={<Campaign />} />
                <Route path="/broadcast/widget/*" element={<Widget />} />
                <Route path="/publisher/*" element={<Publisher />} />
                <Route path="/user/*" element={<User />} />
                <Route path="/admin-mission/*" element={<AdminMissions />} />
                <Route path="/admin-organization/*" element={<AdminOrganization />} />
                <Route path="/admin-account/*" element={<AdminAccounts />} />
                <Route path="/admin-stats/*" element={<AdminStats />} />
                <Route path="/admin-warning/*" element={<AdminWarnings />} />
                <Route path="/admin-report/*" element={<AdminReport />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/performance" />} />
          </Routes>
        </BrowserRouter>
      </HelmetProvider>
    </>
  );
};

const AuthLayout = () => {
  const { user } = useStore();

  if (user) return <Navigate to="/performance" replace={true} />;

  return (
    <div className="min-w-768 flex min-h-screen w-screen flex-col bg-beige">
      <Header />
      <div className="flex">
        <div className="flex-1">
          <Outlet />
        </div>
        <div className="h-full w-1/2">
          <img src={image} />
        </div>
      </div>
      <Footer />
    </div>
  );
};

const PATH = [
  "/performance",
  "/performance/mission",
  "/performance/means",
  "/performance/compare",
  "/broadcast",
  "/broadcast/widgets",
  "/broadcast/campaigns",
  "/broadcast/moderation",
  "/my-missions",
  "/my-missions/moderation",
  "/my-missions/partners",
  "/my-missions/moderated-mission",
  "/settings",
  "/settings/tracking",
  "/settings/real-time",
  "/mission",
  "/warning",
  "/my-account",
];

const ADMIN_PATH = ["/admin-mission", "/admin-organization", "/admin-account", "/admin-stats", "/admin-warning", "/admin-report", "/user/", "/publisher/"];

const ProtectedLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setAuth } = useStore();
  const [loading, setLoading] = useState(true);

  // Simple page tracking with user role
  useEffect(() => {
    if (user && user.role && window.plausible) {
      const adminPath = ADMIN_PATH.find((path) => location.pathname.startsWith(path));

      if (adminPath) {
        window.plausible(`admin - ${adminPath}`);
        return;
      }

      const path = PATH.find((path) => location.pathname.startsWith(path));
      if (path) {
        window.plausible(`${user.role} - ${path}`);
      }
    }
  }, [location.pathname, user]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const publisher = localStorage.getItem("publisher");
        const res = await api.get(`/user/refresh${publisher ? `?publisherId=${publisher}` : ""}`);

        if (!res.ok) throw res;
        // Don't capture error here, it can be a 401
        setAuth(res.data.user, res.data.publisher);
        api.setToken(res.data.token);
      } catch (error) {
        setAuth(null, null);
        api.removeToken();
        navigate("/login");
        captureError(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading)
    return (
      <div className="h-screen w-full flex justify-center items-center">
        <Loader />
      </div>
    );
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="min-w-768 flex min-h-screen w-screen flex-col bg-beige">
      {ENV === "staging" && (
        <div className="bg-red-dark text-white text-center p-2 w-full">
          <span>Environnement de pré-prod</span>
        </div>
      )}
      <Header />
      <Nav />

      <div className="mx-auto my-14 w-4/5 max-w-[1200px] flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
};

const AdminLayout = () => {
  const { user } = useStore();
  return !user || user.role !== "admin" ? <Navigate to="/login" /> : <Outlet />;
};

const PublicLayout = () => {
  const { user } = useStore();
  const location = useLocation();

  useEffect(() => {
    if (window.plausible) {
      window.plausible(`public - ${location.pathname}`);
    }
  }, [location.pathname]);

  return (
    <div className="min-w-768 flex min-h-screen w-screen flex-col bg-beige">
      <Header />
      {user ? <Nav /> : ""}
      <div className="">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
};

export default App;
