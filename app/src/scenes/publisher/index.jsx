import { Route, Routes } from "react-router-dom";

import Create from "./Create";
import Edit from "./Edit";

const Publisher = () => {
  return (
    <Routes>
      <Route path="/new" element={<Create />} />
      <Route path="/:id" element={<Edit />} />
    </Routes>
  );
};

export default Publisher;
