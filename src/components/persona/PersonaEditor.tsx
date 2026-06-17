import { useState, useRef, useEffect } from "react";
import type { Persona } from "../../types";
import { PERSONA_TEMPLATES } from "../../types";
import TemplatePicker from "./TemplatePicker";
import PersonaForm from "./PersonaForm";
import { logPersonaCreated } from "../../lib/analytics";
import { useAuth } from "../../hooks/useAuth";
import "./PersonaEditor.css";
// PersonaPreview and PersonaForm styles are bundled in PersonaEditor.css

import {
  CheckBadgeIcon,
  SparklesIcon,
} from '@heroicons/react/24/solid'

type Mode = "new" | "edit";
type Step = "template" | "form";

interface Props {
  displayName: string;
  mode: Mode;
  editData?: Persona;
  onClose: () => void;
  onSave: (data: Omit<Persona, "id" | "createdAt">) => Promise<void>;
}

export default function PersonaEditor({ displayName, mode, editData, onClose, onSave }: Props) {
  const emptyForm: Omit<Persona, "id" | "createdAt"> = {
    nome: "", emoji: "🤖", desc: "",
    sexo: "Masculino", idade: 25,
    escolaridade: "", profissao: "",
    especialidade: "", historicoVida: "", personalidadeExtra: "",
    objetivo: "", regras: [], estiloComunicacao: "", modoPensamento: "",
    limitacoes: [], maneirismos: [], tipoInteracao: ""
  };

  const [step, setStep] = useState<Step>(mode === "edit" ? "form" : "template");
  const [formData, setFormData] = useState<Omit<Persona, "id" | "createdAt">>(
    mode === "edit" && editData ? { ...editData } : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { user } = useAuth();

  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (step === "form") {
      bodyRef.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [step]);

  const [formWasTemplate, setFormWasTemplate] = useState(false);
  const [formWasGenerated, setFormWasGenerated] = useState(false);

  const handleSelectTemplate = (t: typeof PERSONA_TEMPLATES[number]) => {
    setFormWasTemplate(true);
    setFormWasGenerated(false);
    setFormData({ ...t });
    setStep("form");
  };

  const handleFromScratch = () => {
    setFormWasTemplate(false);
    setFormWasGenerated(false);
    setFormData({ ...emptyForm });
    setStep("form");
  };

  const handleSave = async (data: Omit<Persona, "id" | "createdAt">) => {
    setSaving(true);
    try {
      await onSave(data);

      // Log de criação (apenas no modo "new" — edição não conta)
      if (mode === "new") {
        const creationMethod = step === "form" && formData.nome !== ""
          ? (formWasGenerated ? "generated" : formWasTemplate ? "template" : "scratch")
          : "scratch";
        // Simples: registre o método com base em como chegou ao form
        await logPersonaCreated({
          userId: user?.uid ?? "",
          personaId: crypto.randomUUID(), // será sobrescrito pelo ID real
          personaName: data.nome,
          creationMethod,
        });
      }
      setSaved(true);
      setTimeout(onClose, 900);
    } finally {
      setSaving(false);
    }
  };

  const title = mode === "new" ? "Novo personagem" : "Editar personagem";
  const subtitle = step === "template"
    ? "Escolher modelo"
    : mode === "edit"
      ? `Editando · ${editData?.nome}`
      : "Configurar personagem";

  return (
    <div className="pe-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`pe-modal ${step === "template" ? "pe-modal--narrow" : "pe-modal--wide"}`}>

        {/* ── Header ── */}
        <div className="pe-header">
          <div className="pe-header__left">
            {/* Step dots (new mode only) */}
            {mode === "new" && (
              <div className="pe-steps">
                {(["template", "form"] as Step[]).map((s, i) => (
                  <div key={s} className="pe-steps__item">
                    {i > 0 && <div className={`pe-steps__line ${step === "form" ? "pe-steps__line--done" : ""}`} />}
                    <div className={`pe-steps__dot ${step === s ? "pe-steps__dot--active" : ""} ${step === "form" && s === "template" ? "pe-steps__dot--done" : ""}`}>
                      {step === "form" && s === "template" ? "✓" : i + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div>
              <p className="pe-header__title">{title}</p>
              <p className="pe-header__sub">{subtitle}</p>
            </div>
          </div>

          <button className="pe-close-btn" onClick={onClose} title="Fechar">✕</button>
        </div>

        {/* ── Success overlay ── */}
        {saved && (
          <div className="pe-success">
            <div className="pe-success__icon"><CheckBadgeIcon className="size-4" fill="green" /></div>
            <p className="pe-success__title">{mode === "edit" ? "Personagem atualizado!" : "Personagem criado!"}</p>
            <p className="pe-success__sub">Pronto para conversar <SparklesIcon className="size-4" fill="gold" /></p>
          </div>
        )}

        {/* ── Body ── */}
        <div className="pe-body" ref={bodyRef}>
          {step === "template" ? (
            <TemplatePicker
              templates={PERSONA_TEMPLATES}
              onSelect={handleSelectTemplate}
              onFromScratch={handleFromScratch}
            />
          ) : (
            <PersonaForm
              displayName={displayName}
              initial={formData}
              onSave={handleSave}
              onBack={() => mode === "new" ? setStep("template") : onClose()}
              isEdit={mode === "edit"}
              saving={saving}
              onGenerated={() => setFormWasGenerated(true)} // Novo callback para marcar que o form foi gerado
            />
          )}
        </div>
      </div>
    </div>
  );
}
