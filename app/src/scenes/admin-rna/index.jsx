import { Route, Routes } from "react-router-dom";

import List from "./List";
import View from "./View";

const AdminRna = () => (
  <Routes>
    <Route path="/" element={<List />} />
    <Route path="/:id" element={<View />} />
  </Routes>
);

export default AdminRna;
