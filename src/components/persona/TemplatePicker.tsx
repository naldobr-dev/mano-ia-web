import { useState } from "react";
import type { PERSONA_TEMPLATES } from "../../types";

interface Props {
  templates: typeof PERSONA_TEMPLATES;
  onSelect: (t: typeof PERSONA_TEMPLATES[number]) => void;
  onFromScratch: () => void;
}

export default function TemplatePicker({ templates, onSelect, onFromScratch }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="tp-root">
      <p className="tp-hint">
        Escolha um modelo pronto para começar rapidamente, ou crie do zero com sua imaginação.
      </p>

      <div className="tp-grid">
        {templates.map((t, i) => (
          <button
            key={i}
            className={`tp-card ${hovered === i ? "tp-card--hovered" : ""}`}
            onClick={() => onSelect(t)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="tp-card__emoji">{t.emoji}</span>
            <div className="tp-card__info">
              <p className="tp-card__name">{t.nome}</p>
              <p className="tp-card__desc">{t.desc}</p>
            </div>
            <div className="tp-card__tags">
              <span className="tp-tag tp-tag--accent">{t.sexo}</span>
              <span className="tp-tag">{t.idade} anos</span>
            </div>
          </button>
        ))}
      </div>

      <button className="tp-scratch-btn" onClick={onFromScratch}>
        ✦ Criar personagem do zero
      </button>
    </div>
  );
}
