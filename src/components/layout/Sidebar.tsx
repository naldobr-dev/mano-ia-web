import { useState, useRef, useEffect } from "react";
import { useCreditos } from "../../hooks/useCredits";
import { type Persona, type Conversation, epochToLocalTime } from "../../types";
import ShareButton from "../share/ShareButton";
import "./Sidebar.css";

import {
  ChatBubbleLeftRightIcon,
  TrashIcon as IconTrashSolid,
} from '@heroicons/react/24/solid'
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  AdjustmentsHorizontalIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChatBubbleLeftIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

import { IconLogo } from "../../icons/IconLogo";

type Panel = "personas" | "conversations";

interface Props {
  personas: Persona[];
  activePersonaId: string | null;
  convMetas: Record<string, Omit<Conversation, "messages">[]>;
  activeConvId: Record<string, string>;
  /** Which panel to show on mount (default: "personas") */
  initialPanel?: Panel;
  /** Pre-select this persona when opening the conversations panel */
  initialPersonaId?: string | null;
  onSelectPersona: (id: string) => void;
  /** Called when user picks a conversation — parent decides whether to close drawer */
  onSelectConversation: (personaId: string, convId: string) => void;
  onRenameConversation: (personaId: string, convId: string, newTitle: string) => void;
  onDeleteConversation: (personaId: string, convId: string) => void;
  /** Called when "Nova conversa" is tapped — parent decides whether to close drawer */
  onNewConversation: () => void;
  onNewPersona: () => void;
  onEditPersona: (persona: Persona) => void;
  onDeletePersona: (id: string) => void;
  onOpenSettings: () => void;
  onOpenCredits: () => void;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ emoji, size = 46, active = false }: { emoji: string; size?: number; active?: boolean }) {
  return (
    <div
      className={`avatar ${active ? "avatar--active" : ""}`}
      style={{ width: size, height: size, borderRadius: size * 0.32, fontSize: size * 0.44 }}
    >{emoji}</div>
  );
}

// ── Persona Row ───────────────────────────────────────────────────────────────
function PersonaRow({
  persona, active, lastConv, onClick, onEdit, onDelete,
}: {
  persona: Persona;
  active: boolean;
  lastConv?: Omit<Conversation, "messages">;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={`persona-row ${active ? "persona-row--active" : ""}`}
      onClick={onClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Avatar emoji={persona.emoji} active={active} />

      <div className="persona-row__info">
        <div className="persona-row__top">
          <span className="persona-row__name">{persona.nome}</span>
          {lastConv && <span className="persona-row__time">{lastConv.lastTime.slice(0, 5)}</span>}
        </div>
        <div className="persona-row__bottom">
          <span className="persona-row__last">
            {lastConv?.lastMsg || persona.desc}
          </span>
        </div>
      </div>

      {/* Chevron hint */}
      <span className="persona-row__chevron"><ChevronRightIcon className="size-6" /></span>

      {/* Context menu */}
      <button
        className="persona-row__menu-btn"
        onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
        title="Opções"
      >⋯</button>

      {menuOpen && (
        <>
          <div className="persona-row__overlay" onClick={e => { e.stopPropagation(); setMenuOpen(false); }} />
          <div className="persona-row__menu" onClick={e => e.stopPropagation()}>
            <button onClick={() => { onEdit(); setMenuOpen(false); }}><PencilSquareIcon className="size-4 -mt-0.5!" /> Editar</button>
            <button className="danger" onClick={() => { onDelete(); setMenuOpen(false); }}>
              <TrashIcon className="persona-row__menu-icon size-4" /> Excluir
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Conversation Row ──────────────────────────────────────────────────────────
function ConvRow({
  conv, active, onSelect, onDelete, onRename,
}: {
  conv: Omit<Conversation, "messages">;
  active: boolean;
  onSelect: () => void;
  onRename: (newTitle: string) => void;
  onDelete: () => void;
}) {
  const [hov, setHov] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title || 'Nova Conversa');
  };

  const saveEdit = async (e: React.FormEvent | React.FocusEvent) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      onRename(editTitle);

      setEditingId(null);
    } catch (error) {
      console.error("Erro ao renomear:", error);
    }
  };

  return (
    <div
      className={`conv-row ${active ? "conv-row--active" : ""}`}
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="conv-row__icon"><ChatBubbleLeftIcon className="size-5" /></div>
      <div className="conv-row__info">
        <div className="conv-row__title">
          {editingId === conv.id ? (
            <form onSubmit={saveEdit} onClick={e => e.stopPropagation()}>
              <input
                autoFocus
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onBlur={() => setEditingId(null)}
                className="w-full rounded-md px-2! py-0! text-sm border-2!"
                style={{
                  fontWeight: 'normal',
                }}
              />
            </form>
          ) : (
            conv.title || "Conversa"
          )}
        </div>
        {conv.lastMsg && <p className="conv-row__last">{conv.lastMsg.slice(0, 45)}</p>}
      </div>
      <span className="conv-row__time">{epochToLocalTime(conv.createdAt)}</span>
      {hov && (
        <>
          <button className="conv-row__rename" title="Renomear"
            onClick={e => startEditing(e)}
          ><svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg></button>
          <button
            className="conv-row__del"
            title="Excluir"
            onClick={e => { e.stopPropagation(); onDelete(); }}
          ><IconTrashSolid className="size-4" fill="#ff0000" /></button>
        </>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar({
  personas, activePersonaId, convMetas, activeConvId,
  initialPanel = "personas", initialPersonaId,
  onSelectPersona, onSelectConversation, onDeleteConversation, onRenameConversation, onNewConversation,
  onNewPersona, onEditPersona, onDeletePersona, onOpenSettings, onOpenCredits,
}: Props) {
  const [panel, setPanel] = useState<Panel>(initialPanel);
  const [search, setSearch] = useState("");
  // Which persona's conversations we're viewing
  const [viewingPersonaId, setViewingPersonaId] = useState<string | null>(
    initialPanel === "conversations" ? (initialPersonaId ?? activePersonaId) : activePersonaId
  );
  // Track slide direction for animation: "forward" = personas→convs, "back" = convs→personas
  const [direction, setDirection] = useState<"forward" | "back">(
    initialPanel === "conversations" ? "forward" : "forward"
  );
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { totais: creditosTotais } = useCreditos();
  const [sharePanelShow, setSharePanelShow] = useState(false);

  useEffect(() => {
    // 5 minutos = 5 * 60 * 1000 = 300000 milissegundos
    const timer = setTimeout(() => {
      setSharePanelShow(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const ANIM_MS = 260;

  const navigate = (to: Panel, dir: "forward" | "back") => {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setPanel(to);
    timerRef.current = setTimeout(() => setAnimating(false), ANIM_MS);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const openConversations = (personaId: string) => {
    setViewingPersonaId(personaId);
    navigate("conversations", "forward");
    onSelectPersona(personaId);
  };

  const backToPersonas = () => {
    navigate("personas", "back");
  };

  const filtered = personas.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.desc.toLowerCase().includes(search.toLowerCase())
  );

  const viewingPersona = personas.find(p => p.id === viewingPersonaId);
  const viewingConvs = viewingPersonaId ? (convMetas[viewingPersonaId] ?? []) : [];

  // Animation class: which panel is visible vs. offscreen
  const personasPanelClass = `sidebar__panel sidebar__panel--personas ${panel === "personas"
    ? "sidebar__panel--active"
    : direction === "forward" ? "sidebar__panel--exit-left" : "sidebar__panel--enter-left"
    }`;
  const convsPanelClass = `sidebar__panel sidebar__panel--convs ${panel === "conversations"
    ? "sidebar__panel--active"
    : direction === "back" ? "sidebar__panel--exit-right" : "sidebar__panel--enter-right"
    }`;

  return (
    <aside className="sidebar">
      {/* ── Shared header ── */}
      <div className="sidebar__header">
        {panel === "conversations" ? (
          <>
            <button className="sidebar__back-btn" onClick={backToPersonas} title="Voltar">
              <ChevronLeftIcon className="size-5" />
            </button>
            <div className="sidebar__header-persona">
              <span className="sidebar__header-emoji">{viewingPersona?.emoji}</span>
              <div>
                <p className="sidebar__title">{viewingPersona?.nome}</p>
                <p className="sidebar__count">
                  {viewingConvs.length} conversa{viewingConvs.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="sidebar__brand">
              <div className="sidebar__logo"><IconLogo
                partId="sidebarLogo"
                className='w-8 h-8'
                fill="#aaaaaa"
              /></div>
              <div>
                <p className="sidebar__title">Mano IA</p>
                <p className="sidebar__count">{personas.length} persona{personas.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            {/* Botão de saldo de créditos */}
            <button className="sidebar__credits-btn" onClick={onOpenCredits} title="Seus créditos">
              <span className="sidebar__credits-text">
                💎
                <strong className={`${creditosTotais > 2 ? 'text-blue-400' : 'text-red-400'}`}>
                  {creditosTotais}
                </strong>
              </span>
            </button>
            <button className="sidebar__icon-btn" onClick={onOpenSettings} title="Configurações"><AdjustmentsHorizontalIcon className="size-6 opacity-60" /></button>
          </>
        )}
      </div>

      {/* ── Sliding viewport ── */}
      <div className="sidebar__viewport">

        {/* Panel 1: Persona list */}
        <div className={personasPanelClass}>
          {/* Search */}
          <div className="sidebar__search-wrap">
            <span className="sidebar__search-icon"><MagnifyingGlassIcon className="size-4 opacity-60" /></span>
            <input
              className="sidebar__search"
              placeholder="Buscar persona..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="sidebar__list">
            {filtered.map(p => (
              <PersonaRow
                key={p.id}
                persona={p}
                active={p.id === activePersonaId}
                lastConv={convMetas[p.id]?.[0]}
                onClick={() => openConversations(p.id)}
                onEdit={() => onEditPersona(p)}
                onDelete={() => onDeletePersona(p.id)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="sidebar__empty flex flex-col items-center justify-center h-48 text-center px-4">
                <div className="size-30 flex items-center justify-center mb-3!">
                  <svg fill="currentColor" viewBox="-63 65 128 128">
                    <path d="M-49.1,157.8c6.5,0,11.8,5.3,11.8,11.8c0,6.5-5.3,11.8-11.8,11.8s-11.8-5.3-11.8-11.8C-60.9,163.1-55.7,157.8-49.1,157.8z M62.9,168.7l-22.2-22.2l0,0c-1.3-1.3-3.3-2.2-5.2-2.2c-2.1,0-3.8,0.9-5.2,2.2l-14.2,14.2c-0.9-0.6-1.8-0.9-2.8-1.2	c-6.2-1.5-12.7-2.4-19.4-2.8v-16.3l0,0L4.5,130l-25.1-25.1l-25.1,8.4l8.4,8.4l-4.1,4.1l25.1,25.1v5.9c-9,0.9-16.1,7.7-17.6,16.5	c0,0-0.1,1.2-0.1,1.5c0,3.7,3,6.6,6.6,6.6h16.3c0,0,0,0,0.1,0c0,0,0,0,0.1,0h24.4c1.8,0.1,3.7-0.6,5.2-1.9c0.1-0.1,0.4-0.4,0.4-0.4	l16.7-16.7l16.8,16.8c3,3,7.5,3,10.5,0C65.7,176.3,65.7,171.5,62.9,168.7z M-37.3,125.9l16.7-16.7L0.2,130l-7.4,7.4	c-1-1-2.5-1.9-4.1-1.9c-2.8,0-5.2,2.4-5.2,5.2v6.2L-37.3,125.9z" />
                  </svg>
                </div>
                <p className="text-base font-medium mb-2!" style={{ color: 'var(--text-secondary)' }}>
                  Nenhum personagem ainda
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Clique no <UserPlusIcon className="size-4 inline" /> para criar o primeiro
                </p>
              </div>
            )}
          </div>

          <div className="sidebar__footer">
            {/* --- Botão de compartilhamento --- */}
            {sharePanelShow && (
              <ShareButton
                onClose={() => setSharePanelShow(false)}
              />
            )}

            <button className="sidebar__new-btn flex flex-1 items-center justify-center" onClick={onNewPersona}>
              <UserPlusIcon className="size-5 -mt-0.5!" />
              &nbsp; Novo personagem</button>
          </div>
        </div>

        {/* Panel 2: Conversation list */}
        <div className={convsPanelClass}>
          <div className="sidebar__list">
            {viewingConvs.length === 0 ? (
              <div className="sidebar__empty-convs">
                <span><ChatBubbleLeftRightIcon className="size-10" /></span>
                <p>Nenhuma conversa ainda.</p>
                <p>Envie uma mensagem para começar!</p>
              </div>
            ) : (
              viewingConvs.map(c => (
                <ConvRow
                  key={c.id}
                  conv={c}
                  active={c.id === (viewingPersonaId ? activeConvId[viewingPersonaId] : "")}
                  onSelect={() => {
                    if (viewingPersonaId) onSelectConversation(viewingPersonaId, c.id);
                  }}
                  onRename={(newTitle: string) => {
                    if (viewingPersonaId) onRenameConversation(viewingPersonaId, c.id, newTitle);
                  }}
                  onDelete={() => {
                    if (viewingPersonaId) onDeleteConversation(viewingPersonaId, c.id);
                  }}
                />
              ))
            )}
          </div>

          <div className="sidebar__footer">
            {creditosTotais > 2 ? (
              <button className="sidebar__new-btn flex flex-1 items-center justify-center" onClick={onNewConversation}>
                <span style={{ fontSize: '18px' }}>✦</span> &nbsp; Nova conversa
              </button>
            ) :
              <div className="align-center p-2! italic text-sm text-gray-400">
                <p>
                  <span className="text-red-500 mr-2! text-lg">⚠</span>
                  Créditos insuficientes para iniciar novas conversas. <strong>Espere até amanhã para ganhar mais ou</strong>&nbsp;
                  <button className="text-blue-400 cursor-pointer hover:text-blue-600 hover:underline" onClick={onOpenCredits}>
                    compre créditos
                  </button>
                  .
                </p>
              </div>
            }
          </div>
        </div>

      </div>
    </aside>
  );
}
