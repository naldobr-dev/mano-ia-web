import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import "./AuthForm.css";

const IconMail = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>);
const IconLock = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>);
const IconEye = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>);
const IconEyeOff = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>);
const IconAlert = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>);
const IconGoogle = () => (<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>);

function friendlyError(code: string): string {
  const map: Record<string, string> = {
    "auth/user-not-found": "Nenhuma conta encontrada com este e-mail.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um momento.",
    "auth/network-request-failed": "Erro de conexão. Verifique sua internet.",
    "auth/popup-closed-by-user": "Login com Google cancelado.",
  };
  return map[code] ?? "Ocorreu um erro. Tente novamente.";
}

export default function LoginForm() {
  const { loginWithEmail, loginWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Preencha todos os campos."); return; }
    setLoading(true);
    try { await loginWithEmail(email, password); navigate("/"); }
    catch (err: unknown) { setError(friendlyError((err as { code?: string })?.code ?? "")); }
    finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError(""); setLoading(true);
    try { await loginWithGoogle(); navigate("/"); }
    catch (err: unknown) { setError(friendlyError((err as { code?: string })?.code ?? "")); }
    finally { setLoading(false); }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    try { await resetPassword(forgotEmail); setForgotSent(true); }
    catch { /* silently handled by UI */ }
    finally { setForgotLoading(false); }
  };

  return (
    <>
      <form className="auth-form" onSubmit={handleLogin}>
        <button type="button" className="btn-google" onClick={handleGoogle} disabled={loading}><IconGoogle /> Entrar com Google</button>
        <div className="form-divider">ou</div>
        <div className="input-group">
          <label htmlFor="l-email">E-mail</label>
          <div className="input-wrapper"><span className="input-icon"><IconMail /></span><input id="l-email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></div>
        </div>
        <div className="input-group">
          <label htmlFor="l-pass">Senha</label>
          <div className="input-wrapper"><span className="input-icon"><IconLock /></span><input id="l-pass" type={showPass ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /><button type="button" className="toggle-password" onClick={() => setShowPass(v => !v)}>{showPass ? <IconEyeOff /> : <IconEye />}</button></div>
        </div>
        <div className="forgot-link"><a href="#" onClick={e => { e.preventDefault(); setForgotOpen(true); }}>Esqueceu a senha?</a></div>
        {error && <div className="form-error-box"><IconAlert /> {error}</div>}
        <button type="submit" className="btn-primary" disabled={loading}>{loading && <span className="spinner" />}{loading ? "Entrando..." : "Entrar"}</button>
      </form>

      {forgotOpen && (
        <div className="modal-backdrop" onClick={() => { setForgotOpen(false); setForgotSent(false); }}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Recuperar senha</h3>
            {forgotSent
              ? <div className="form-success-box" style={{ marginTop: 14 }}>✅ Link enviado para <strong>{forgotEmail}</strong>.</div>
              : <form onSubmit={handleForgot} style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                <p className="modal-desc">Informe seu e-mail para receber o link de redefinição.</p>
                <div className="input-group"><label>E-mail</label><div className="input-wrapper"><span className="input-icon"><IconMail /></span><input type="email" placeholder="seu@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} /></div></div>
                <button type="submit" className="btn-primary" disabled={forgotLoading}>{forgotLoading && <span className="spinner" />}{forgotLoading ? "Enviando..." : "Enviar link"}</button>
              </form>
            }
            <button className="modal-close" onClick={() => { setForgotOpen(false); setForgotSent(false); }}>✕</button>
          </div>
        </div>
      )}
      <style>{`.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:100;padding:24px;backdrop-filter:blur(4px)}.modal-box{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;width:100%;max-width:360px;position:relative;box-shadow:0 24px 64px rgba(0,0,0,.6)}.modal-title{font-size:16px;font-weight:600;color:var(--text-primary)}.modal-desc{font-size:13px;color:var(--text-secondary);line-height:1.5}.modal-close{position:absolute;top:14px;right:14px;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text-muted);width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:12px}`}</style>
    </>
  );
}
