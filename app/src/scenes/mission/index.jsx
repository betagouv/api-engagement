import { Route, Routes } from "react-router-dom";

import Edit from "@/scenes/mission/Edit";
import View from "@/scenes/mission/View";

const Mission = () => {
  return (
    <Routes>
      <Route path="/:id" element={<View />} />
      <Route path="/:id/edit" element={<Edit />} />
    </Routes>
  );
};

export default Mission;
