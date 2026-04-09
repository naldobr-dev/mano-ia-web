import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

import { IconLogo } from '../../icons/IconLogo';

interface Props {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0e0f14",
        flexDirection: "column",
        gap: 16,
      }}>
        <div style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          background: "linear-gradient(135deg, #4f6ef7, #6b48f5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          animation: "pulse 1.5s ease-in-out infinite",
        }}><IconLogo
            partId="loading"
            className="size-10"
            start="#eeeeee"
            end="#ffffff"
            fill="#ffffff"
          /></div>
        <p style={{ color: "#555870", fontFamily: "'Sora', sans-serif", fontSize: 13 }}>
          Carregando...
        </p>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50%       { opacity: 0.6; transform: scale(0.95); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
