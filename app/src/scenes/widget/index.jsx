import { Route, Routes } from "react-router-dom";

import Edit from "./Edit";
import New from "./New";

const Widget = () => {
  return (
    <Routes>
      <Route path="/new" element={<New />} />
      <Route path="/:id" element={<Edit />} />
    </Routes>
  );
};

export default Widget;
