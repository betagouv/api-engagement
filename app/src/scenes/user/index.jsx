import { Route, Routes } from "react-router-dom";

import Create from "@/scenes/user/Create";
import Edit from "@/scenes/user/Edit";

const User = () => {
  return (
    <Routes>
      <Route path="/new" element={<Create />} />
      <Route path="/:id" element={<Edit />} />
    </Routes>
  );
};

export default User;
