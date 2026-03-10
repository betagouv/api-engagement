import { Route, Routes } from "react-router-dom";

import List from "@/scenes/admin-organization/List";
import View from "@/scenes/admin-organization/View";

const AdminOrganization = () => (
  <Routes>
    <Route path="/" element={<List />} />
    <Route path="/:id" element={<View />} />
  </Routes>
);

export default AdminOrganization;
