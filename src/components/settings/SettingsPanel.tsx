import { useAuth } from "../../hooks/useAuth";
import { usePersonas } from "../../hooks/usePersonas";
import { useTheme } from "../../hooks/useTheme";
import ProfileSection from "./ProfileSection";
import { AppearanceSection, StatsSection, AboutSection } from "./AppearanceStatsAbout";
import AccountSection from "./AccountSection";
import DangerSection from "./DangerSection";
import "./Settings.css";

interface Props { onClose: () => void; }

export default function SettingsPanel({ onClose }: Props) {
  const { user, logout } = useAuth();
  const { personas } = usePersonas();
  const { theme, setTheme } = useTheme(user?.uid ?? null);

  const handleLogout = async () => { onClose(); await logout(); };

  const handleClearData = async () => {
    // DangerSection handles its own Firestore batch-delete
  };

  return (
    <div className="st-panel">
      <div className="st-header">
        <div>
          <p className="st-header__title">Configurações</p>
          <p className="st-header__sub">Gerencie sua conta e preferências</p>
        </div>
        <button className="st-close-btn" onClick={onClose} title="Fechar">✕</button>
      </div>

      <div className="st-body">
        <ProfileSection user={user} />
        <div className="st-divider" />
        <AppearanceSection theme={theme} onThemeChange={setTheme} />
        <div className="st-divider" />
        <StatsSection personaCount={personas.length} />
        <div className="st-divider" />
        <AboutSection />
        <div className="st-divider" />
        <AccountSection user={user} onLogout={handleLogout} />
        <div className="st-divider" />
        <DangerSection onClearData={handleClearData} />
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
