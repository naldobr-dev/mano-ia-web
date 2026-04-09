import { useContext } from "react";
import { PersonasContext } from "../contexts/PersonasContext";

export function usePersonas() {
    const ctx = useContext(PersonasContext);
    if (!ctx) throw new Error("usePersonas must be used inside <PersonasProvider>");
    return ctx;
}