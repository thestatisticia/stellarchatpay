import { Route, Routes, Navigate } from "react-router-dom";
import { MetricsLayout } from "./components/MetricsLayout";
import { ActivityPage } from "./pages/ActivityPage";
import { InsightsPage } from "./pages/InsightsPage";
import ChatPage from "./pages/ChatPage";
import { SettingsPage } from "./pages/SettingsPage";
import { InfoPage } from "./pages/InfoPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ChatPage />} />
      <Route element={<MetricsLayout />}>
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/security" element={<InfoPage />} />
        <Route path="/terms" element={<InfoPage />} />
        <Route path="/privacy" element={<InfoPage />} />
        <Route path="/risk" element={<InfoPage />} />
        <Route path="/analytics" element={<Navigate to="/insights" replace />} />
        <Route path="/feedback" element={<Navigate to="/settings?feedback=1" replace />} />
      </Route>
    </Routes>
  );
}
