import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthProvider";
import { PersonasProvider } from "./contexts/PersonasProvider";
import ProtectedRoute from "./components/common/ProtectedRoute";
import AuthPage from "./components/auth/AuthPage";
import AppShell from "./components/layout/AppShell";
import PagamentoConcluido from "./components/credits/PagamentoConcluido";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PersonasProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<AuthPage />} />
            <Route path="/payment-success" element={<PagamentoConcluido />} />
            <Route path="/pagamento-concluido" element={<PagamentoConcluido />} />

            {/* Protected */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PersonasProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
