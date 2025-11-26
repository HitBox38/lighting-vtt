import { Navigate, Route, Routes } from "react-router-dom";

import ScenePage from "@/pages/ScenePage";

function App() {
  return (
    <Routes>
      <Route path="/scene" element={<ScenePage />} />
      <Route path="*" element={<Navigate to="/scene" replace />} />
    </Routes>
  );
}

export default App;
