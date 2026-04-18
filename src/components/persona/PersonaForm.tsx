import { useState } from "react";
import type { Persona } from "../../types";
import { buildSystemPrompt } from "../../types";
import { moderatePersona } from "../../lib/gemini";
import PersonaPreview from "./PersonaPreview";

import {
  SparklesIcon
} from '@heroicons/react/24/solid'
import {
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowLeftIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline'

type FormData = Omit<Persona, "id" | "createdAt">;

interface Props {
  displayName: string;
  initial: FormData;
  onSave: (data: FormData) => void;
  onBack: () => void;
  isEdit: boolean;
  saving: boolean;
}

const EMOJI_LIST = [
  "🤖", "👤", "👨", "👩", "🧑", "👨‍💻", "👩‍💻", "👨‍🏫", "👩‍🏫", "👨‍⚕️", "👩‍⚕️",
  "👨‍🍳", "👩‍🍳", "🎨", "🎭", "🎬", "📚", "🔬", "⚖️", "🎸", "🌟",
  "🦁", "🐉", "🦊", "🧙", "🕵️", "🧑‍🚀", "🏋️", "🧘", "🎯",
];

const SEXO_OPTS = ["Masculino", "Feminino", "Não-binário", "Outro"];

// ─── Small field components ───────────────────────────────────────────────────

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className="pf-label">
      {text} {required && <span className="pf-required">*</span>}
    </label>
  );
}

function TextInput({
  value, onChange, placeholder, type = "text", error,
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`pf-input ${focused ? "pf-input--focused" : ""} ${error ? "pf-input--error" : ""}`}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {error && <p className="pf-field-error mt-2!"><ExclamationTriangleIcon className="size-4 mr-1! " /> {error}</p>}
    </div>
  );
}

function TextArea({
  value, onChange, placeholder, rows = 3, maxLength, error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  error?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="pf-textarea-wrap">
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={`pf-textarea ${focused ? "pf-input--focused" : ""} ${error ? "pf-input--error" : ""}`}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {maxLength && (
        <span className={`pf-char-count ${value.length > maxLength * 0.85 ? (value.length >= maxLength ? "pf-char-count--over" : "pf-char-count--warn") : ""}`}>
          {value.length}/{maxLength}
        </span>
      )}
      {error && <p className="pf-field-error mt-2!"><ExclamationTriangleIcon className="size-4 mr-1! " /> {error}</p>}
    </div>
  );
}

// ─── Emoji Picker ─────────────────────────────────────────────────────────────

function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pf-emoji-wrap">
      <button type="button" className="pf-emoji-btn" onClick={() => setOpen(v => !v)}>
        {value}
      </button>
      {open && (
        <>
          <div className="pf-emoji-overlay" onClick={() => setOpen(false)} />
          <div className="pf-emoji-grid">
            {EMOJI_LIST.map((em, i) => (
              <button
                key={i}
                type="button"
                className={`pf-emoji-option ${em === value ? "pf-emoji-option--active" : ""}`}
                onClick={() => { onChange(em); setOpen(false); }}
              >{em}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function PersonaForm({ displayName, initial, onSave, onBack, isEdit, saving }: Props) {
  const [form, setForm] = useState<FormData>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [activeTab, setActiveTab] = useState<"basico" | "personalidade">("basico");
  const [showPrompt, setShowPrompt] = useState(false);
  // Moderation state
  const [moderating, setModerating] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const set = <K extends keyof FormData>(key: K) =>
    (value: FormData[K] | string) =>
      setForm(f => ({ ...f, [key]: value }));

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.nome.trim()) e.nome = "Nome obrigatório";
    if (!form.profissao.trim()) e.profissao = "Profissão obrigatória";
    if (!form.especialidade.trim()) e.especialidade = "Especialidade obrigatória";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setRejectionReason(null);
    setModerating(true);
    try {
      const fakePersona: Persona = { ...form, id: "preview", createdAt: 0 };
      const result = await moderatePersona(buildSystemPrompt(fakePersona, displayName));
      if (!result.approved) {
        setRejectionReason(result.reason);
        return;
      }
      onSave(form);
    } finally {
      setModerating(false);
    }
  };

  const fakePersona: Persona = { ...form, id: "preview", createdAt: 0 };

  return (
    <div className="pf-layout">
      {/* ── Left panel ── */}
      <div className="pf-left">

        {/* Tabs */}
        <div className="pf-tabs">
          {(["basico", "personalidade"] as const).map(t => (
            <button
              key={t}
              className={`pf-tab ${activeTab === t ? "pf-tab--active" : ""}`}
              onClick={() => setActiveTab(t)}
            >
              <div>
                {t === "basico" ?
                  <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2" /><path d="M9 5a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2" /><path d="M9 12h6" /><path d="M9 16h6" /></svg> Básico</>
                  : <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><path d="m10 16 1.5 1.5" /><path d="m14 8-1.5-1.5" /><path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993" /><path d="m16.5 10.5 1 1" /><path d="m17 6-2.891-2.891" /><path d="M2 15c6.667-6 13.333 0 20-6" /><path d="m20 9 .891.891" /><path d="M3.109 14.109 4 15" /><path d="m6.5 12.5 1 1" /><path d="m7 18 2.891 2.891" /><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993" /></svg> Personalidade</>}
              </div>
            </button>
          ))}
        </div>

        {/* ── Tab: Básico ── */}
        {activeTab === "basico" && (
          <div className="pf-fields">

            {/* Emoji + Name */}
            <div className="pf-row-emoji-name">
              <div className="pf-field self-start">
                <Label text="Emoji" />
                <EmojiPicker value={form.emoji} onChange={set("emoji")} />
              </div>
              <div className="pf-field pf-field--grow">
                <Label text="Nome" required />
                <TextInput
                  value={form.nome}
                  onChange={set("nome")}
                  placeholder="Ex: Prof. Carlos, Ana Dev…"
                  error={errors.nome}
                />
              </div>
            </div>

            {/* Sexo + Idade */}
            <div className="pf-row-2col">
              <div className="pf-field">
                <Label text="Sexo" />
                <select
                  value={form.sexo}
                  onChange={e => set("sexo")(e.target.value)}
                  className="pf-select"
                >
                  {SEXO_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="pf-field">
                <Label text="Idade" />
                <TextInput
                  type="number"
                  value={form.idade}
                  onChange={v => setForm(f => ({ ...f, idade: parseInt(v) || 0 }))}
                  placeholder="25"
                />
              </div>
            </div>

            <div className="pf-field">
              <Label text="Escolaridade" />
              <TextInput
                value={form.escolaridade}
                onChange={set("escolaridade")}
                placeholder="Ex: Doutorado em Educação"
              />
            </div>

            <div className="pf-field">
              <Label text="Profissão" required />
              <TextInput
                value={form.profissao}
                onChange={set("profissao")}
                placeholder="Ex: Professor Universitário"
                error={errors.profissao}
              />
            </div>

            <div className="pf-field">
              <Label text="Especialidade" required />
              <TextArea
                value={form.especialidade}
                onChange={set("especialidade")}
                placeholder="Ex: Programação full-stack, JavaScript, TypeScript, React…"
                rows={2}
                maxLength={300}
                error={errors.especialidade}
              />
              <p className="pf-hint">O que esse personagem domina? Define o foco das respostas.</p>
            </div>
          </div>
        )}

        {/* ── Tab: Personalidade ── */}
        {activeTab === "personalidade" && (
          <div className="pf-fields">
            <div className="pf-tip-box">
              💡 Quanto mais detalhes você fornecer, mais único e consistente será o personagem.
            </div>

            <div className="pf-field">
              <Label text="Histórico de vida" />
              <TextArea
                value={form.historicoVida}
                onChange={set("historicoVida")}
                placeholder="De onde vem? O que viveu? Ex: Cresceu no interior de Minas. Estudou na USP…"
                rows={4}
                maxLength={500}
              />
              <p className="pf-hint">Enriquece as respostas com contexto pessoal autêntico.</p>
            </div>

            <div className="pf-field">
              <Label text="Personalidade & características extras" />
              <TextArea
                value={form.personalidadeExtra}
                onChange={set("personalidadeExtra")}
                placeholder="Como se comunica? Tem humor? É formal ou casual? Tem expressões favoritas?…"
                rows={4}
                maxLength={500}
              />
              <p className="pf-hint">Defina o jeito de ser: tom, manias, linguagem, energia.</p>
            </div>

            {/* System prompt preview toggle */}
            <button
              disabled
              type="button"
              className="pf-prompt-toggle inline-flex"
              onClick={() => setShowPrompt(v => !v)}
            >
              {showPrompt ? <ChevronUpIcon className="size-4 mr-1!" /> : <ChevronDownIcon className="size-4 mr-1!" />}
              {showPrompt ? " Ocultar" : " Ver"} system prompt gerado
            </button>

            {showPrompt && (
              <div className="pf-prompt-box">
                <pre>{buildSystemPrompt(fakePersona, displayName)}</pre>
              </div>
            )}
          </div>
        )}

        {/* ── Rejection notice ── */}
        {rejectionReason && (
          <div className="pf-rejection-box">
            <span className="pf-rejection-box__icon"><NoSymbolIcon className="size-7" stroke="#e5321d" strokeWidth={3} fill="#eeeeee" /></span>
            <div>
              <p className="pf-rejection-box__title">Personagem recusado</p>
              <p className="pf-rejection-box__reason">{rejectionReason}</p>
            </div>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="pf-actions">
          <button type="button" className="pf-btn-back inline-flex" onClick={onBack}>
            <ArrowLeftIcon className="size-4 mr-1! mt-0.5!" /> Voltar
          </button>
          <button
            type="button"
            className={`pf-btn-save ${(saving || moderating) ? "pf-btn-save--loading" : ""}`}
            onClick={handleSave}
            disabled={saving || moderating}
          >
            {moderating
              ? <><span className="pf-spinner" /> Verificando…</>
              : saving
                ? <><span className="pf-spinner" /> Salvando…</>
                : isEdit ?
                  <><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" className="-mt-1!" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344" /><path d="m9 11 3 3L22 4" /></svg> Salvar alterações</>
                  : <><SparklesIcon className="size-5 mr-1!" fill="gold" /> Criar personagem</>
            }
          </button>
        </div>
      </div>

      {/* ── Right panel: live preview ── */}
      <div className="pf-right">
        <PersonaPreview form={form} />
      </div>
    </div>
  );
}
