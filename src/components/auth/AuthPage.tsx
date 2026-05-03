import { useState } from "react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import "./AuthPage.css";

import { IconLogo } from "../../icons/IconLogo";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="auth-root">
      {/* Animated background blobs */}
      <div className="auth-bg">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="grid-overlay" />
      </div>

      <div className="auth-container">
        {/* Branding */}
        <div className="auth-brand">
          <div className="brand-logo">
            <IconLogo className="w-12.5 h-12.5" />
          </div>
          <h1 className="brand-name">Mano IA</h1>
          <p className="brand-tagline">Crie e converse com personagens de IA únicos</p>
        </div>

        {/* Card */}
        <div className="auth-card">
          {/* Tab switcher */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === "login" ? "active" : ""}`}
              onClick={() => setMode("login")}
            >
              Entrar
            </button>
            <button
              className={`auth-tab ${mode === "register" ? "active" : ""}`}
              onClick={() => setMode("register")}
            >
              Criar conta
            </button>
            <div className={`tab-indicator ${mode === "register" ? "right" : "left"}`} />
          </div>

          {/* Forms */}
          <div className="auth-form-area">
            {mode === "login" ? (
              <LoginForm />
            ) : (
              <RegisterForm onSwitchToLogin={() => setMode("login")} />
            )}
          </div>
        </div>

        <p className="auth-footer">
          Ao continuar, você concorda com os{" "}
          <a href="https://mano.ia.br/legal/#terms" target="_blank">
            Termos de Uso
          </a>{" "}
          e a{" "}
          <a href="https://mano.ia.br/legal/#privacy" target="_blank">
            Política de Privacidade
          </a>
          .
        </p>
        <div className="auth-footer">
          © 2026 Mano IA ·
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ display: 'inline', marginTop: '-1px' }}><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M3.6 9h16.8" /><path d="M3.6 15h16.8" /><path d="M11.5 3a17 17 0 0 0 0 18" /><path d="M12.5 3a17 17 0 0 1 0 18" /></svg>
          mano.ia.br  · v{__APP_VERSION__}
        </div>

      </div>
    </div>
  );
}
