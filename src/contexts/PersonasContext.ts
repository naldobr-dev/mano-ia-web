import { createContext } from "react";
import { PERSONA_TEMPLATES, type Persona } from "../types";


// ─── Context type ─────────────────────────────────────────────────────────────

interface PersonasContextValue {
    personas: Persona[];
    loading: boolean;
    canCreate: boolean;
    createPersona: (data: Omit<Persona, "id" | "createdAt">) => Promise<Persona>;
    updatePersona: (persona: Persona) => Promise<void>;
    deletePersona: (id: string) => Promise<void>;
    templates: typeof PERSONA_TEMPLATES;
}

export const PersonasContext = createContext<PersonasContextValue | null>(null);