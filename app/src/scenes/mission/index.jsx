import { Route, Routes } from "react-router-dom";

import View from "@/scenes/mission/View";

const Mission = () => {
  return (
    <Routes>
      <Route path="/:id" element={<View />} />
    </Routes>
  );
};

export default Mission;
