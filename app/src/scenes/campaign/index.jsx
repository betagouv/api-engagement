import { Route, Routes } from "react-router-dom";

import Create from "./Create";
import Edit from "./Edit";

const Index = () => {
  return (
    <Routes>
      <Route path="/new" element={<Create />} />
      <Route path="/:id" element={<Edit />} />
    </Routes>
  );
};
export default Index;
