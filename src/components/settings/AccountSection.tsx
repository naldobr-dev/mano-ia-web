import { useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "../../lib/firebase";

interface Props {
  user: User | null;
  onLogout: () => void;
}

type PassStatus = "idle" | "loading" | "ok" | "err-mismatch" | "err-wrong" | "err-minimum" | "err-generic";

export default function AccountSection({ user, onLogout }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<PassStatus>("idle");

  const handleChangePassword = async () => {
    const currentUser = auth.currentUser; // Pega a instância viva aqui

    if (!currentUser?.email) return;
    if (next !== confirm) { setStatus("err-mismatch"); return; }
    if (next.length < 6) { setStatus("err-minimum"); return; }

    setStatus("loading");
    try {
      // Re-authenticate before sensitive operation
      const credential = EmailAuthProvider.credential(currentUser.email, current);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, next);
      setStatus("ok");
      setTimeout(() => {
        setStatus("idle"); setExpanded(false);
        setCurrent(""); setNext(""); setConfirm("");
      }, 1800);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      setStatus(code.includes("wrong-password") || code.includes("invalid-credential")
        ? "err-wrong" : "err-generic");
      console.error("Error changing password:", err);
    }
  };

  const statusMessage: Record<string, { text: string; color: string } | null> = {
    "idle": null,
    "loading": null,
    "ok": { text: "✓ Senha alterada com sucesso!", color: "#3ecf8e" },
    "err-mismatch": { text: "⚠ As senhas não coincidem.", color: "#f7614f" },
    "err-wrong": { text: "⚠ Senha atual incorreta.", color: "#f7614f" },
    "err-minimum": { text: "⚠ A nova senha deve ter pelo menos 6 caracteres.", color: "#f7614f" },
    "err-generic": { text: "⚠ Erro ao alterar senha. Tente novamente.", color: "#f7614f" },
  };

  const isGoogleUser = user?.providerData?.[0]?.providerId === "google.com";

  return (
    <div className="st-section">
      <p className="st-section__title">Conta</p>

      {/* Change password row */}
      {!isGoogleUser && (
        <>
          <div
            className={`st-row ${expanded ? "st-row--active" : ""}`}
            onClick={() => setExpanded(v => !v)}
          >
            <div className="st-row__icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" opacity={0.6} /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
            </div>
            <div className="st-row__body">
              <p className="st-row__label">Trocar senha</p>
              <p className="st-row__desc">Altere sua senha de acesso</p>
            </div>
            <span className="st-row__chevron">{expanded ?
              <><svg viewBox="0 0 24 24" fill="currentColor" className="size-4"><path fillRule="evenodd" d="M11.47 7.72a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 1 1-1.06 1.06L12 9.31l-6.97 6.97a.75.75 0 0 1-1.06-1.06l7.5-7.5Z" clipRule="evenodd" /></svg></>
              : <><svg viewBox="0 0 24 24" fill="currentColor" className="size-4"><path fillRule="evenodd" d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z" clipRule="evenodd" /></svg></>
            }</span>
          </div>

          {expanded && (
            <div className="st-inset-form">
              {(["current", "next", "confirm"] as const).map((k) => (
                <div key={k} className="st-inset-form__field">
                  <label className="st-label">
                    {k === "current" ? "Senha atual" : k === "next" ? "Nova senha" : "Confirmar nova senha"}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={k === "current" ? current : k === "next" ? next : confirm}
                    onChange={e => {
                      const v = e.target.value;
                      if (k === "current") setCurrent(v);
                      else if (k === "next") setNext(v);
                      else setConfirm(v);
                    }}
                    className="st-input"
                  />
                </div>
              ))}

              {statusMessage[status] && (
                <p className="st-status-msg" style={{ color: statusMessage[status]!.color }}>
                  {statusMessage[status]!.text}
                </p>
              )}

              <button
                onClick={handleChangePassword}
                disabled={status === "loading" || status === "ok"}
                className="st-btn-primary"
              >
                {status === "loading"
                  ? <><span className="st-spinner st-spinner--sm" /> Salvando…</>
                  : "Salvar nova senha"
                }
              </button>
            </div>
          )}
        </>
      )}

      {isGoogleUser && (
        <div className="st-info-row">
          <span><svg width="24" height="24" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg></span>
          <p>Conta vinculada ao Google. A senha é gerenciada pelo Google.</p>
        </div>
      )}

      {/* Logout */}
      <div className="st-row st-row--danger" onClick={onLogout}>
        <div className="st-row__icon-wrap st-row__icon-wrap--danger">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path opacity={0.4} d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" /><path d="M9 12h12l-3 -3" /><path d="M18 15l3 -3" /></svg>
        </div>
        <div className="st-row__body">
          <p className="st-row__label st-row__label--danger">Sair da conta</p>
          <p className="st-row__desc">{user?.email}</p>
        </div>
      </div>
    </div>
  );
}
