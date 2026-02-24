import { Route, Routes } from "react-router-dom";

import Apercu from "@/scenes/admin-stats/Apercu";

const Index = () => (
  <div className="space-y-12">
    <h1 className="text-4xl font-bold">Statistiques</h1>
    <div>
      <section className="bg-white shadow-lg">
        <Routes>
          <Route path="/" element={<Apercu />} />
        </Routes>
      </section>
    </div>
  </div>
);

export default Index;
