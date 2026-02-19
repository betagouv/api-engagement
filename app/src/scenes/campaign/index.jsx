import { Route, Routes } from "react-router-dom";

import Create from "@/scenes/campaign/Create";
import Edit from "@/scenes/campaign/Edit";

const Index = () => {
  return (
    <Routes>
      <Route path="/new" element={<Create />} />
      <Route path="/:id" element={<Edit />} />
    </Routes>
  );
};
export default Index;
