import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import "./AuthForm.css";

const IconMail = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>);
const IconLock = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>);
const IconUser = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 1 0-16 0" /></svg>);
const IconEye = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>);
const IconEyeOff = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>);
const IconAlert = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>);
const IconGoogle = () => (<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>);

function getStrength(p: string) {
  if (!p) return { level: 0, label: "" };
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p) && /[^a-zA-Z0-9]/.test(p)) s++;
  return { level: s, label: ["", "Fraca", "Média", "Forte"][s] };
}
const strengthColor = (l: string) => l === "Fraca" ? "var(--error)" : l === "Média" ? "#f7c14f" : "var(--success)";

interface Props { onSwitchToLogin: () => void; }

export default function RegisterForm({ onSwitchToLogin }: Props) {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [conf, setConf] = useState("");
  const [showP, setShowP] = useState(false);
  const [showC, setShowC] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const strength = getStrength(pass);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Informe seu nome."); return; }
    if (!email) { setError("Informe seu e-mail."); return; }
    if (pass.length < 6) { setError("A senha precisa ter pelo menos 6 caracteres."); return; }
    if (pass !== conf) { setError("As senhas não coincidem."); return; }
    setLoading(true);
    try { await register(email, pass, name.trim()); setSuccess(true); }
    catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      setError(code === "auth/email-already-in-use" ? "Este e-mail já está cadastrado." : "Não foi possível criar a conta. Tente novamente.");
    }
    finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError(""); setLoading(true);
    try { await loginWithGoogle(); navigate("/"); }
    catch { setError("Falha ao entrar com Google."); }
    finally { setLoading(false); }
  };

  if (success) return (
    <div style={{ textAlign: "center", padding: "16px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(62,207,142,0.12)", border: "1px solid rgba(62,207,142,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>✅</div>
      <div><p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Conta criada!</p><p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>Verifique seu e-mail para ativar a conta.</p></div>
      <button className="btn-primary" style={{ width: "auto", padding: "10px 24px" }} onClick={onSwitchToLogin}>Ir para o login</button>
    </div>
  );

  return (
    <form className="auth-form" onSubmit={handleRegister}>
      <button type="button" className="btn-google" onClick={handleGoogle} disabled={loading}><IconGoogle /> Cadastrar com Google</button>
      <div className="form-divider">ou</div>

      <div className="input-group"><label htmlFor="r-name">Nome de exibição</label><div className="input-wrapper"><span className="input-icon"><IconUser /></span><input id="r-name" type="text" placeholder="Como quer ser chamado?" value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></div></div>
      <div className="input-group"><label htmlFor="r-email">E-mail</label><div className="input-wrapper"><span className="input-icon"><IconMail /></span><input id="r-email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></div></div>

      <div className="input-group">
        <label htmlFor="r-pass">Senha</label>
        <div className="input-wrapper"><span className="input-icon"><IconLock /></span><input id="r-pass" type={showP ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={pass} onChange={e => setPass(e.target.value)} autoComplete="new-password" /><button type="button" className="toggle-password" onClick={() => setShowP(v => !v)}>{showP ? <IconEyeOff /> : <IconEye />}</button></div>
        {pass && (<div className="password-strength"><div className="strength-bars">{[0, 1, 2].map(i => <div key={i} className={`strength-bar ${i < strength.level ? (strength.label === "Fraca" ? "active-weak" : strength.label === "Média" ? "active-medium" : "active-strong") : ""}`} />)}</div>{strength.label && <span className="strength-label">Força: <strong style={{ color: strengthColor(strength.label) }}>{strength.label}</strong></span>}</div>)}
      </div>

      <div className="input-group">
        <label htmlFor="r-conf">Confirmar senha</label>
        <div className="input-wrapper"><span className="input-icon"><IconLock /></span><input id="r-conf" type={showC ? "text" : "password"} placeholder="Repita a senha" value={conf} onChange={e => setConf(e.target.value)} autoComplete="new-password" /><button type="button" className="toggle-password" onClick={() => setShowC(v => !v)}>{showC ? <IconEyeOff /> : <IconEye />}</button></div>
        {conf && pass && <span className="field-error" style={{ color: conf === pass ? "var(--success)" : "var(--error)" }}>{conf === pass ? "✓ Senhas coincidem" : <><IconAlert /> Senhas não coincidem</>}</span>}
      </div>

      {error && <div className="form-error-box"><IconAlert /> {error}</div>}
      <button type="submit" className="btn-primary" disabled={loading}>{loading && <span className="spinner" />}{loading ? "Criando conta..." : "Criar conta"}</button>
    </form>
  );
}
