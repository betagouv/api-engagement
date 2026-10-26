import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { toast } from "@/services/toast";
import api from "@/services/api";
import { captureError } from "@/services/error";
import useStore from "@/services/store";

const LoginAs = () => {
  const [searchParams] = useSearchParams();
  const { setAuth } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!searchParams.get("id")) {
        toast.error("Erreur lors de la connexion - Aucun identifiant de compte trouvé");
        navigate("/login");
        return;
      }
      try {
        const res = await api.get(`/user/loginas/${searchParams.get("id")}`);
        if (!res.ok) throw res;
        api.setToken(res.data.token);
        setAuth(res.data.user, res.data.publisher);
        navigate("/");
      } catch (error) {
        captureError(error, { extra: { id: searchParams.get("id") } });
      }
    };
    fetchData();
  }, []);
  return (
    <>
      <title>API Engagement - Connexion</title>
    </>
  );
};

export default LoginAs;
