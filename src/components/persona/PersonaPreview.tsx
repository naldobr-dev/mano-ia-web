import type { Persona } from "../../types";

type FormData = Omit<Persona, "id" | "createdAt">;

interface Props { form: FormData; }

export default function PersonaPreview({ form }: Props) {
  const rows = [
    { label: "Especialidade", value: form.especialidade },
    { label: "Escolaridade", value: form.escolaridade },
    { label: "Personalidade", value: form.personalidadeExtra },
    { label: "Histórico", value: form.historicoVida },
  ].filter(r => r.value.trim());

  const greeting = `Olá! Sou ${form.nome || "seu personagem"}${form.profissao ? `, ${form.profissao.toLowerCase()}` : ""}. Como posso ajudar você hoje?`;

  return (
    <div className="ppv-root">
      <p className="ppv-label">Preview</p>

      {/* Avatar + identity */}
      <div className="ppv-identity">
        <div className="ppv-avatar">{form.emoji}</div>
        <div>
          <p className="ppv-name">{form.nome || <span className="ppv-placeholder">Nome do personagem</span>}</p>
          <p className="ppv-role">{form.profissao || <span className="ppv-placeholder">Profissão</span>}</p>
          <div className="ppv-tags">
            {form.sexo && <span className="ppv-tag ppv-tag--accent">{form.sexo}</span>}
            {form.idade > 0 && <span className="ppv-tag">{form.idade} anos</span>}
          </div>
        </div>
      </div>

      {/* Info rows */}
      {rows.map((r, i) => (
        <div key={i} className="ppv-row">
          <p className="ppv-row__label">{r.label}</p>
          <p className="ppv-row__value">{r.value.slice(0, 120)}{r.value.length > 120 ? "…" : ""}</p>
        </div>
      ))}

      {/* Sample greeting bubble */}
      <div className="ppv-bubble">
        <p className="ppv-bubble__hint">Apresentação</p>
        <p className="ppv-bubble__text">{greeting}</p>
      </div>
    </div>
  );
}
