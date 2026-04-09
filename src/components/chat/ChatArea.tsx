import { useRef, useEffect, useState, useCallback } from "react";
import { type Message, type Persona, type Conversation, epochToLocalDateTime } from "../../types";

import { toWebP } from "../../lib/imageUtils";

// ── Importações para renderização de Markdown com suporte a matemática (KaTeX)
import ReactMarkdown from 'react-markdown';
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

import {
  PaperAirplaneIcon,
  MicrophoneIcon,
  TrashIcon,
} from '@heroicons/react/24/solid'

import {
  PhotoIcon,
  PaperClipIcon as AttachmentPaperClipIcon,
} from '@heroicons/react/24/outline'

import "./ChatArea.css";

// Propriedades dos ícones
interface IconProps {
  className?: string;
  fill?: string;
  stroke?: string;
}

// Ícone de áudio (linhas verticais representando ondas sonoras)
const AudioLinesIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 inline"><path d="M2 10v3" /><path d="M6 6v11" /><path d="M10 3v18" /><path d="M14 8v7" /><path d="M18 5v13" /><path d="M22 10v3" /></svg>);
// Ícone de arquivo PDF
const PDFIcon = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 inline"><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4" /><path d="M5 18h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6" /><path d="M17 18h2" /><path d="M20 15h-3v6" /><path d="M11 15v6h1a2 2 0 0 0 2 -2v-2a2 2 0 0 0 -2 -2h-1" /></svg>);
// Ícone de arquivo geral (clipe de papel)
const PaperClipIcon = (props: IconProps) => (<svg viewBox="0 0 16 16" fill={props.fill || "currentColor"} className={`${props.className || 'size-5'} inline`}><path d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 1 0-3 0v9a2.5 2.5 0 0 0 5 0V5a.5.5 0 0 1 1 0v7a3.5 3.5 0 1 1-7 0V3z" /></svg>);
// Ícone de arquivo
const FileIcon = () => (<svg viewBox="0 0 24 24" fill="currentColor" className="size-5 inline"><path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" /><path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" /></svg>);

interface Props {
  persona: Persona;
  conversation: Conversation | null;
  onSend: (text: string, file?: File) => Promise<void>;
  onNewConversation: () => void;
  onOpenSidebar?: () => void;
  isTyping: boolean;
}

const MAX_FILE_MB = 20;

// ── Audio recorder hook ───────────────────────────────────────────────────────
type RecordState = "idle" | "recording" | "preview";

function useAudioRecorder() {
  const [state, setState] = useState<RecordState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        const file = new File([blob], `audio_${Date.now()}.webm`, { type: mime });
        const url = URL.createObjectURL(blob);
        setAudioFile(file);
        setAudioUrl(url);
        setState("preview");
      };
      mr.start(250);
      mediaRef.current = mr;
      setState("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch {
      alert("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
    }
  }, []);

  const stop = useCallback(() => {
    mediaRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const cancel = useCallback(() => {
    mediaRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(null);
    setAudioUrl("");
    setState("idle");
    setSeconds(0);
  }, [audioUrl]);

  const reset = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(null);
    setAudioUrl("");
    setState("idle");
    setSeconds(0);
  }, [audioUrl]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return { state, seconds, audioFile, audioUrl, start, stop, cancel, reset, fmt };
}

// ── File preview chip ─────────────────────────────────────────────────────────
function FileChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  const icon = file.type.startsWith("image/") ? <PhotoIcon className="size-5" />
    : file.type.startsWith("audio/") ? <AudioLinesIcon />
      : file.type === "application/pdf" ? <PDFIcon />
        : <FileIcon />;
  const sizeMB = (file.size / 1024 / 1024).toFixed(1);
  return (
    <div className="file-chip">
      <span>{icon}</span>
      <span className="file-chip__name">{file.name}</span>
      <span className="file-chip__size">{sizeMB} MB</span>
      <button className="file-chip__remove" onClick={onRemove} title="Remover">✕</button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ChatArea({ persona, conversation, onSend, onNewConversation, onOpenSidebar, isTyping }: Props) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [fileError, setFileError] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const audio = useAudioRecorder();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const messages: Message[] = conversation?.messages ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "37px";
    el.style.height = Math.min(el.scrollHeight, 130) + "px";
  };

  // ── Send text (+ optional file) ───────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if ((!text && !pendingFile) || sending) return;
    setSending(true);
    setFileError("");
    try {
      await onSend(text, pendingFile ?? undefined);
      setInput("");
      setPendingFile(null);
      if (textareaRef.current) textareaRef.current.style.height = "37px";
    } finally {
      setSending(false);
    }
  };

  // ── Send audio ────────────────────────────────────────────────────────────
  const handleSendAudio = async () => {
    if (!audio.audioFile || sending) return;
    setSending(true);
    try {
      await onSend("", audio.audioFile);
      audio.reset();
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── File picker ───────────────────────────────────────────────────────────
  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError("");
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setFileError(`Arquivo muito grande. Limite: ${MAX_FILE_MB} MB.`);
      e.target.value = "";
      return;
    }
    // Convert images to WebP
    const processed = file.type.startsWith("image/") ? await toWebP(file) : file;
    setPendingFile(processed);
    e.target.value = "";
  };

  const canSend = (input.trim().length > 0 || !!pendingFile) && !sending;

  const getChatDataChip = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(today.getDate() - 2);
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);
    const fourDaysAgo = new Date(today);
    fourDaysAgo.setDate(today.getDate() - 4);
    const fiveDaysAgo = new Date(today);
    fiveDaysAgo.setDate(today.getDate() - 5);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else if (date.toDateString() === dayBeforeYesterday.toDateString()) {
      return 'Anteontem';
    } else if (date.toDateString() === threeDaysAgo.toDateString() || date.toDateString() === fourDaysAgo.toDateString() || date.toDateString() === fiveDaysAgo.toDateString()) {
      // exibe o nome do dia da semana para mensagens de até 5 dias atrás
      return date.toLocaleDateString("pt-BR", { weekday: "long" });
    } else {
      return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
    };
  };

  const groupedMessages = messages.reduce<Record<string, Message[]>>((acc, msg) => {
    const dateKey = epochToLocalDateTime(msg.createdAt).toDateString();

    if (!acc[dateKey]) acc[dateKey] = [];

    acc[dateKey].push(msg);

    return acc;
  }, {});

  return (
    <div className="chat-area">
      {/* Header */}
      <div className="chat-header">
        <button className="chat-header__back" onClick={onOpenSidebar} title="Personas">‹</button>
        <div className="chat-header__avatar">{persona.emoji}</div>
        <div className="chat-header__info">
          <p className="chat-header__name">{persona.nome}</p>
          <p className="chat-header__status">{isTyping ? "digitando..."
            : <><span style={{ color: 'var(--text-primary)', fontStyle: 'italic', marginRight: '0.5rem', opacity: 0.7 }}>{persona.desc}</span> ● online</>}</p>
        </div>
        <button className="chat-header__btn" onClick={onNewConversation} title="Nova conversa">✦</button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {Object.keys(groupedMessages).length === 0 && !isTyping && (
          <div className="chat-empty">
            <div className="chat-empty__emoji">{persona.emoji}</div>
            <p className="chat-empty__name">{persona.nome}</p>
            <p className="chat-empty__desc">{persona.desc}</p>
            <p className="chat-empty__hint">Diga olá para começar! <span style={{ fontSize: '1.25rem' }}>👋</span></p>
          </div>
        )}

        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            <div className="chat-date-separator">
              <div className="chat-date-chip">
                {getChatDataChip(new Date(date))}
              </div>
            </div>

            <div className="chat-message-group">
              {msgs.map((msg) => {
                return (
                  <div key={msg.id} className={`bubble-row bubble-row--${msg.role}`}>
                    {msg.role === "assistant" && <div className="bubble-avatar">{persona.emoji}</div>}
                    <div className="bubble-wrap">
                      <div className={`bubble bubble--${msg.role}`}>
                        {msg.attachmentName && (
                          <div className="bubble-attachment">
                            {msg.attachmentType === "image" ?
                              <PhotoIcon className="size-5" />
                              : msg.attachmentType === "audio" ?
                                <AudioLinesIcon />
                                : msg.attachmentName.endsWith(".pdf") ?
                                  <PDFIcon />
                                  : <AttachmentPaperClipIcon className="size-5 inline" />} {msg.attachmentName}
                          </div>
                        )}
                        {msg.role === "assistant"
                          ? <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                              p: ({ ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                              ul: ({ ...props }) => <ul className="mb-2 list-disc" {...props} />,
                              ol: ({ ...props }) => <ol className="mb-2 list-decimal" {...props} />,
                              li: ({ ...props }) => <li className="mb-1" {...props} />,
                              strong: ({ ...props }) => <strong className="font-semibold" style={{ color: 'var(--text-primary)' }} {...props} />,
                              a: ({ ...props }) => <a style={{ color: 'var(--accent-primary)' }} className="hover:underline" {...props} />,
                              h1: ({ ...props }) => <h1 className="mb-2 text-base font-bold" style={{ fontFamily: 'var(--font-display)' }} {...props} />,
                              h2: ({ ...props }) => <h2 className="mb-2 text-sm font-bold" style={{ fontFamily: 'var(--font-display)' }} {...props} />,
                              h3: ({ ...props }) => <h3 className="mb-1 text-sm font-semibold" {...props} />,
                              code: ({ ...props }) => (
                                <code
                                  className="px-1.5 py-0.5 rounded text-xs font-mono"
                                  style={{ background: 'var(--bg-overlay)', color: '#a5b4fc' }}
                                  {...props}
                                />
                              ),
                              pre: ({ ...props }) => (
                                <pre
                                  className="rounded-xl p-3 overflow-x-auto text-xs font-mono my-2"
                                  style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}
                                  {...props}
                                />
                              ),
                            }}
                          >
                            {msg.text.replace(/\$\$(.*?)\$\$/gs, "\n$$$1$$\n")}
                          </ReactMarkdown>
                          : <pre style={{ textWrap: 'auto', fontFamily: 'sans-serif', lineHeight: '1.5em' }}>{msg.text}</pre>
                        }
                      </div>
                      <span className="bubble-time">
                        {epochToLocalDateTime(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        {msg.role === "user" && <span className="bubble-check">✓✓</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="bubble-row bubble-row--assistant">
            <div className="bubble-avatar">{persona.emoji}</div>
            <div className="bubble bubble--assistant bubble--typing">
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />

      </div>

      {/* Input area */}
      <div className="chat-input-area">
        {fileError && <p className="chat-file-error">⚠ {fileError}</p>}

        {/* Pending file chip */}
        {pendingFile && (
          <div className="chat-pending-file">
            <FileChip file={pendingFile} onRemove={() => setPendingFile(null)} />
          </div>
        )}

        {/* ── Audio preview bar ── */}
        {audio.state === "preview" && (
          <div className="audio-preview-bar">
            <span className="audio-preview-bar__icon">🎵</span>
            <audio controls src={audio.audioUrl} className="audio-preview-bar__player" />
            <button className="audio-preview-bar__cancel" onClick={audio.cancel} title="Cancelar"><TrashIcon className="size-5" /></button>
            <button
              className={`chat-send-btn chat-send-btn--active audio-preview-bar__send`}
              onClick={handleSendAudio}
              disabled={sending}
              title="Enviar áudio"
            >{sending ? <span className="send-spinner" /> : <PaperAirplaneIcon className="size-5" />}</button>
          </div>
        )}

        {/* ── Recording bar ── */}
        {audio.state === "recording" && (
          <div className="audio-recording-bar">
            <span className="audio-recording-bar__dot" />
            <span className="audio-recording-bar__timer">{audio.fmt(audio.seconds)}</span>
            <span className="audio-recording-bar__label">Gravando…</span>
            <button className="audio-recording-bar__cancel" onClick={audio.cancel} title="Cancelar">✕</button>
            <button className="audio-recording-bar__stop chat-send-btn chat-send-btn--active" onClick={audio.stop} title="Parar">⏹</button>
          </div>
        )}

        {/* ── Normal input ── */}
        {audio.state === "idle" && (
          <div className="chat-input-box">
            {/* Attach */}
            <button className="chat-input-btn" title="Enviar arquivo" onClick={() => fileInputRef.current?.click()}><PaperClipIcon className="size-6" /></button>
            <input
              ref={fileInputRef} type="file" hidden
              onChange={handleFilePick}
              accept="image/*,.pdf,.doc,.docx,.txt,.json,.xml,.htm,.html,.csv,.xls,.xlsx,.mp3,.ogg,.wav,.m4a,.webm"
            />

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKey}
              placeholder={pendingFile ? "Adicione uma mensagem (opcional)…" : `Mensagem para ${persona.nome}…`}
              rows={1}
              className="chat-textarea"
              disabled={sending}
            />

            {/* Mic */}
            <button
              className={`chat-input-btn ${(audio.state as RecordState) === "recording" ? "chat-input-btn--recording" : ""}`}
              title="Gravar áudio"
              onClick={audio.start}
            ><MicrophoneIcon className="size-6" /></button>

            {/* Send */}
            <button
              className={`chat-send-btn ${canSend ? "chat-send-btn--active" : ""}`}
              onClick={handleSend}
              disabled={!canSend}
              title="Enviar"
            >
              {sending ? <span className="send-spinner" /> : <PaperAirplaneIcon className="size-6" />}
            </button>
          </div>
        )}

        {audio.state === "idle" && (
          <p className="chat-input-hint">Enter para enviar · Shift+Enter para nova linha</p>
        )}
      </div>
    </div>
  );
}
