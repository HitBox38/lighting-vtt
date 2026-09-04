import { useEffect } from "react";
import { usePostHog } from "@posthog/react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { JoinPage } from "@/pages/JoinPage";
import { LandingPage } from "@/pages/LandingPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { ScenePage } from "@/pages/ScenePage";

let lastTrackedPath: string | null = null;

function PostHogPageviews() {
  const posthog = usePostHog();
  const location = useLocation();

  useEffect(() => {
    const query = location.search ?? "";
    const hash = location.hash ?? "";
    const path = `${location.pathname}${query}${hash}`;
    if (path === lastTrackedPath) {
      return;
    }
    lastTrackedPath = path;
    posthog.capture("$pageview", { $current_url: path });
  }, [location.pathname, location.search, location.hash, posthog]);

  return null;
}

function App() {
  return (
    <>
      <PostHogPageviews />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/scene" element={<ScenePage />} />
        <Route path="/join/:inviteCode" element={<JoinPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
