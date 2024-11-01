import { Route, Routes } from "react-router-dom";

import Edit from "./Edit";

const Widget = () => {
  return (
    <Routes>
      <Route path="/:id" element={<Edit />} />
    </Routes>
  );
};

export default Widget;
