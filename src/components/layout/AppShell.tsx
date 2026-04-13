import { useState } from "react";
import { usePersonas } from "../../hooks/usePersonas";
import MainLayout from "./MainLayout";
import PersonaEditor from "../persona/PersonaEditor";
import SettingsDrawer from "../settings/SettingsDrawer";
import type { Persona } from "../../types";
import { auth } from "../../lib/firebase";
import { sendEmailVerification } from "firebase/auth";
import { useAuth } from "../../hooks/useAuth";

type PersonaModal =
  | { mode: "new" }
  | { mode: "edit"; persona: Persona }
  | null;

export default function AppShell() {
  const { personas, createPersona, updatePersona, deletePersona } = usePersonas();
  const [modal, setModal] = useState<PersonaModal>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { user, logout } = useAuth();
  const [resendMessage, setResendMessage] = useState("");


  const handleSave = async (data: Omit<Persona, "id" | "createdAt">) => {
    if (modal?.mode === "edit") {
      await updatePersona({ ...modal.persona, ...data });
    } else {
      await createPersona(data);
    }
  };

  const handleUpdatePersonas = async (updated: Persona[]) => {
    const removedIds = personas
      .map(p => p.id)
      .filter(id => !updated.find(u => u.id === id));
    for (const id of removedIds) await deletePersona(id);
  };

  const handleResendEmailVerification = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setResendMessage("Usuário não encontrado.");
      return;
    }

    try {
      await sendEmailVerification(currentUser);
      setResendMessage("ok");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/too-many-requests') {
        setResendMessage("Muitas solicitações. Tente novamente em alguns minutos.");
      } else {
        setResendMessage("Ocorreu um erro ao enviar o e-mail.");
      }
    }
  };

  const checkEmailVerified = async () => {
    const currentUser = auth.currentUser;

    if (currentUser) {
      try {
        // 1. Atualiza o estado local (para o emailVerified virar true)
        await currentUser.reload();

        if (currentUser.emailVerified) {
          // 2. FORÇA a atualização do token para o Firestore reconhecer as permissões
          await currentUser.getIdToken(true);

          // 3. Em vez de reload total da página, você pode apenas atualizar um estado local
          // ou deixar o seu observador de auth (onAuthStateChanged) agir.
          window.location.reload();
        } else {
          alert("O e-mail ainda não foi verificado. Verifique sua caixa de entrada.");
        }
      } catch (error) {
        console.error("Erro ao atualizar status:", error);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {user?.emailVerified ? (
        <>
          <MainLayout
            personas={personas}
            onUpdatePersonas={handleUpdatePersonas}
            onOpenSettings={() => setSettingsOpen(true)}
            onNewPersona={() => setModal({ mode: "new" })}
            onEditPersona={(p) => setModal({ mode: "edit", persona: p })}
          />

          {modal && (
            <PersonaEditor
              displayName={user?.displayName ?? "Usuário"}
              mode={modal.mode}
              editData={modal.mode === "edit" ? modal.persona : undefined}
              onClose={() => setModal(null)}
              onSave={handleSave}
            />
          )}

          {settingsOpen && (
            <SettingsDrawer onClose={() => setSettingsOpen(false)} />
          )}
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "16px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, lineHeight: '2em' }}>
          <div style={{ width: 126, height: 126, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 32 32" className="size-20">
              <g>
                <path fill="currentColor" d="M28 9h-2.68c-.55 0-1 .45-1 1s.45 1 1 1h2.35l-10.7 11.23c-.5.53-1.43.53-1.93 0L4.33 11h2.35c.55 0 1-.45 1-1s-.45-1-1-1H4c-1.65 0-3 1.35-3 3v16c0 1.65 1.35 3 3 3h24c1.65 0 3-1.35 3-3V12c0-1.65-1.35-3-3-3zm-6.14 11L29 12.5v15zM16 24.65c.91 0 1.79-.38 2.41-1.03l2.06-2.16 7.19 7.55H4.33l7.19-7.55 2.06 2.16c.63.66 1.51 1.03 2.41 1.03zM10.14 20 3 27.5v-15z" />
                <path fill="#7738c8" d="M16 14c3.58 0 6.5-2.92 6.5-6.5S19.58 1 16 1 9.5 3.92 9.5 7.5 12.42 14 16 14zm-3.18-7.39a.997.997 0 0 1 1.41.06l1.03 1.11 2.5-2.71a.997.997 0 0 1 1.41-.06c.41.38.43 1.01.05 1.41l-3.24 3.5c-.19.21-.46.32-.73.32s-.54-.12-.73-.32l-1.76-1.91a.996.996 0 0 1 .05-1.41z" />
              </g>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>
              Sua conta ainda não foi ativada.
            </p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>Verifique seu e-mail <span className="text-amber-400">{user?.email}</span> para ativar a conta.</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginTop: '20px' }}>
              O e-mail de ativação pode ter ido parar na pasta de Span do seu e-mail. Se não estiver encontrando, procure por lá.
            </p>
            <p style={{ fontSize: 13, color: "var(--text-primary)", marginTop: '20px' }}>
              {resendMessage === "" ? (
                <>
                  Você pode enviar um novo e-mail de ativação, <span style={{ color: 'dodgerblue', textDecoration: 'underline', cursor: 'pointer' }} onClick={handleResendEmailVerification}>clicando aqui</span>
                </>
              ) : (
                <>
                  {resendMessage === 'ok' ? (
                    <span style={{ fontSize: 16, color: 'green' }}>Novo e-mail de ativação enviado!</span>
                  ) : (
                    <span style={{ fontSize: 14, color: 'red' }}>{resendMessage}</span>
                  )}
                </>
              )}.
            </p>
            <button className="btn-primary" style={{ width: "auto", padding: "10px 24px", marginTop: 20 }} onClick={checkEmailVerified}>Já fiz a ativação!</button>
            <p style={{ marginTop: 30, textAlign: 'left' }}>
              <span style={{ marginLeft: 10, border: '1px solid dodgerblue', padding: '8px 20px', borderRadius: 10, color: 'dodgerblue', textDecoration: 'underline', cursor: 'pointer' }} onClick={handleLogout}>Voltar para Login</span>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
