import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import api from "../../services/api";
import { captureError } from "../../services/error";
import useStore from "../../services/store";

const LoginAs = () => {
  const [searchParams] = useSearchParams();
  const { setAuth } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!searchParams.get("id")) {
        captureError("No Id in loginas", "Erreur lors de la connexion");
        navigate("/login");
      }
      try {
        const res = await api.get(`/user/loginas/${searchParams.get("id")}`);
        if (!res.ok) throw res;
        api.setToken(res.data.token);
        setAuth(res.data.user, res.data.publisher);
        navigate("/");
      } catch (error) {
        captureError(error, "Erreur lors de la connexion");
      }
    };
    fetchData();
  }, []);
  return <></>;
};

export default LoginAs;
