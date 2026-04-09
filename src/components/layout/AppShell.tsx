import { useState } from "react";
import { usePersonas } from "../../hooks/usePersonas";
import MainLayout from "./MainLayout";
import PersonaEditor from "../persona/PersonaEditor";
import SettingsDrawer from "../settings/SettingsDrawer";
import type { Persona } from "../../types";
import { useAuth } from "../../hooks/useAuth";

type PersonaModal =
  | { mode: "new" }
  | { mode: "edit"; persona: Persona }
  | null;

export default function AppShell() {
  const { personas, createPersona, updatePersona, deletePersona } = usePersonas();
  const [modal, setModal] = useState<PersonaModal>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { user } = useAuth();


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

  return (
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
  );
}
