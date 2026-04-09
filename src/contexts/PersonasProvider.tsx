import {
  useEffect, useState, useCallback,
  type ReactNode,
} from "react";
import { PersonasContext } from "./PersonasContext";
import { useAuth } from "../hooks/useAuth";
import { subscribePersonas, savePersona, deletePersona as dbDeletePersona } from "../lib/firestore";
import { PERSONA_TEMPLATES, type Persona } from "../types";

const MAX_FREE_PERSONAS = 5;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PersonasProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!user) { setPersonas([]); setLoading(false); return; }
    setLoading(true);
    const unsub = subscribePersonas(user.uid, data => {
      setPersonas(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const createPersona = useCallback(async (data: Omit<Persona, "id" | "createdAt">) => {
    if (!user) throw new Error("Não autenticado");
    if (personas.length >= MAX_FREE_PERSONAS)
      throw new Error(`Limite de ${MAX_FREE_PERSONAS} personas atingido no plano gratuito.`);

    const persona: Persona = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    await savePersona(user.uid, persona);
    return persona;
  }, [user, personas.length]);

  const updatePersona = useCallback(async (persona: Persona) => {
    if (!user) throw new Error("Não autenticado");
    await savePersona(user.uid, persona);
  }, [user]);

  const deletePersona = useCallback(async (id: string) => {
    if (!user) throw new Error("Não autenticado");
    await dbDeletePersona(user.uid, id);
  }, [user]);

  return (
    <PersonasContext.Provider value={{
      personas, loading,
      canCreate: personas.length < MAX_FREE_PERSONAS,
      createPersona, updatePersona, deletePersona,
      templates: PERSONA_TEMPLATES,
    }}>
      {children}
    </PersonasContext.Provider>
  );
}
