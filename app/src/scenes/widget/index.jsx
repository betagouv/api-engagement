import { Route, Routes } from "react-router-dom";

import Edit from "@/scenes/widget/Edit";
import New from "@/scenes/widget/New";

const Widget = () => {
  return (
    <Routes>
      <Route path="/new" element={<New />} />
      <Route path="/:id" element={<Edit />} />
    </Routes>
  );
};

export default Widget;
