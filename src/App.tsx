import { Navigate, Route, Routes } from "react-router-dom";

import { LandingPage } from "@/pages/LandingPage";
import ScenePage from "@/pages/ScenePage";
import { LibraryPage } from "@/pages/LibraryPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/library" element={<LibraryPage />} />
      <Route path="/scene" element={<ScenePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
