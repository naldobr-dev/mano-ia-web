import type { Persona } from "../../types";

type FormData = Omit<Persona, "id" | "createdAt">;

export const EMPTY_FORM: FormData = {
    nome: "", emoji: "🤖", desc: "",
    sexo: "Masculino", idade: 25,
    escolaridade: "", profissao: "", especialidade: "",
    historicoVida: "", personalidadeExtra: "",
    objetivo: "",
    regras: [],
    estiloComunicacao: "",
    modoPensamento: "",
    limitacoes: [],
    maneirismos: [],
    tipoInteracao: "ativo",
};