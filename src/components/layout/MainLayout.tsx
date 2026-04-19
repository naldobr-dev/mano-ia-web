import { useState, useCallback, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import Sidebar from "./Sidebar";
import ChatArea from "../chat/ChatArea";
import type { Persona, Conversation, Message } from "../../types";
import { buildSystemPrompt, epochToLocalTime } from "../../types";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../lib/firebase";
import {
  saveConversation, updateConversationMeta,
  saveMessage, loadMessages,
  subscribeConversations,
} from "../../lib/firestore";
import { sendMessage as geminiSend } from "../../lib/gemini";
import "./MainLayout.css";

import { IconLogo } from '../../icons/IconLogo';

import {
  FireIcon,
  LightBulbIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

// ── Firebase Functions client ─────────────────────────────────────────────────
const fnDeletePersona = httpsCallable<{ personaId: string }, { success: boolean }>(functions, "deletePersona");
const fnDeleteConversation = httpsCallable<{ personaId: string; convId: string }, { success: boolean }>(functions, "deleteConversation");

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2);
const nowTime = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  personas: Persona[];
  onUpdatePersonas: (p: Persona[]) => void;
  onOpenSettings: () => void;
  onNewPersona: () => void;
  onEditPersona: (p: Persona) => void;
}

export default function MainLayout({ personas, onUpdatePersonas, onOpenSettings, onNewPersona, onEditPersona }: Props) {
  const { user } = useAuth();

  const [activePersonaId, setActivePersonaId] = useState<string | null>(personas[0]?.id ?? null);
  const [activeConvId, setActiveConvId] = useState<Record<string, string>>({});
  const [convMetas, setConvMetas] = useState<Record<string, Omit<Conversation, "messages">[]>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // set theme on load
  const { theme, setTheme } = useTheme(user?.uid ?? null);
  useEffect(() => {
    if (theme) document.documentElement.setAttribute("data-theme", theme);
  }, [theme, setTheme]);

  const activePersona = personas.find(p => p.id === activePersonaId) ?? null;
  const activeConv = activePersonaId
    ? convMetas[activePersonaId]?.find(c => c.id === activeConvId[activePersonaId]) ?? null
    : null;

  // ── Subscribe to conversations for the active persona ─────────────────────
  useEffect(() => {
    if (!user || !activePersonaId) return;
    const unsub = subscribeConversations(user.uid, activePersonaId, (convos) => {
      setConvMetas(prev => ({ ...prev, [activePersonaId]: convos }));
    });
    return unsub;
  }, [user, activePersonaId]);

  // ── Load messages when active conversation changes ────────────────────────
  useEffect(() => {
    if (!user || !activePersonaId || !activeConvId[activePersonaId]) { setMessages([]); return; }
    loadMessages(user.uid, activePersonaId, activeConvId[activePersonaId])
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [user, activePersonaId, activeConvId]);

  // ── Select persona ────────────────────────────────────────────────────────
  // Does NOT close the mobile drawer — user should see the conversations panel next.
  const handleSelectPersona = useCallback((id: string) => {
    setActivePersonaId(id);
  }, []);

  // ── Select conversation ─────────────────────────────────────────────────
  // Closes the mobile drawer — user is now going to the chat.
  const handleSelectConversation = useCallback((personaId: string, convId: string) => {
    setActiveConvId(prev => ({ ...prev, [personaId]: convId }));
    setMobileSidebarOpen(false);
  }, []);

  // ── New conversation ──────────────────────────────────────────────────────
  const handleNewConversation = useCallback(async () => {
    if (!activePersonaId || !user) return;
    const conv: Omit<Conversation, "messages"> = {
      id: uid(), personaId: activePersonaId,
      title: "Nova conversa",
      lastMsg: "", lastTime: nowTime(),
      unread: 0, createdAt: Date.now(),
    };
    await saveConversation(user.uid, activePersonaId, conv);
    setActiveConvId(prev => ({ ...prev, [activePersonaId]: conv.id }));
    setMessages([]);
    setMobileSidebarOpen(false); // close drawer and go straight to chat
  }, [activePersonaId, user]);

  // ── Delete conversation ───────────────────────────────────────────────────
  const handleDeleteConversation = useCallback(async (personaId: string, convId: string) => {
    if (!user) return;
    await fnDeleteConversation({ personaId, convId });
    if (activeConvId[personaId] === convId) {
      setActiveConvId(prev => ({ ...prev, [personaId]: "" }));
      setMessages([]);
    }
  }, [user, activeConvId]);

  // ── Rename conversation ───────────────────────────────────────────────────
  const handleRenameConversation = useCallback(async (personaId: string, convId: string, newTitle: string) => {
    if (!user) return;
    await updateConversationMeta(user.uid, personaId, convId, { title: newTitle });
  }, [user]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async (text: string, file?: File) => {
    if (!activePersonaId || !activePersona || !user) return;

    // Create conversation on first message
    let convId = activeConvId[activePersonaId];
    if (!convId) {
      const conv: Omit<Conversation, "messages"> = {
        id: uid(), personaId: activePersonaId,
        title: text.slice(0, 40) || (file?.name ?? "Nova conversa"),
        lastMsg: text, lastTime: nowTime(),
        unread: 0, createdAt: Date.now(),
      };
      await saveConversation(user.uid, activePersonaId, conv);
      convId = conv.id;
      setActiveConvId(prev => ({ ...prev, [activePersonaId]: convId }));
    }

    const userMsg: Message = {
      id: uid(), role: "user", text, createdAt: Date.now(),
    };

    if (file) {
      userMsg.attachmentName = file.name;
      userMsg.attachmentType = file.type.startsWith("image/") ? "image"
        : file.type.startsWith("audio/") ? "audio"
          : "file";
    }

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    await saveMessage(user.uid, activePersonaId, convId, userMsg);
    await updateConversationMeta(user.uid, activePersonaId, convId, {
      lastMsg: (file ? `📎 ${file.name}` : text).slice(0, 60),
      lastTime: epochToLocalTime(userMsg.createdAt),
    });

    try {
      const aiText = await geminiSend(
        buildSystemPrompt(activePersona, user.displayName || "Usuário"),
        messages,
        text,
        file
      );

      const aiMsg: Message = { id: uid(), role: "assistant", text: aiText, createdAt: Date.now() };

      setMessages(prev => [...prev, aiMsg]);
      await saveMessage(user.uid, activePersonaId, convId, aiMsg);
      await updateConversationMeta(user.uid, activePersonaId, convId, {
        lastMsg: aiText.slice(0, 60), lastTime: epochToLocalTime(aiMsg.createdAt),
      });
    } catch (err) {
      console.error("Gemini error:", err);
      const errMsg: Message = {
        id: uid(), role: "assistant",
        text: "Desculpe, ocorreu um erro ao me conectar. Tente novamente.",
        createdAt: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [activePersonaId, activePersona, user, activeConvId, messages]);

  // ── Delete persona ────────────────────────────────────────────────────────
  const handleDeletePersona = async (id: string) => {
    await fnDeletePersona({ personaId: id });
    onUpdatePersonas(personas.filter(p => p.id !== id));
    if (activePersonaId === id) {
      setActivePersonaId(personas.find(p => p.id !== id)?.id ?? null);
    }
  };

  const activeConvWithMessages: Conversation | null = activeConv
    ? { ...activeConv, messages }
    : null;

  const sidebarProps = {
    personas,
    activePersonaId,
    convMetas,
    activeConvId,
    onSelectPersona: handleSelectPersona,
    onSelectConversation: handleSelectConversation,
    onRenameConversation: handleRenameConversation,
    onDeleteConversation: handleDeleteConversation,
    onNewConversation: handleNewConversation,
    onNewPersona,
    onEditPersona,
    onDeletePersona: handleDeletePersona,
    onOpenSettings,
  };

  return (
    <div className="main-layout">
      <div className="main-layout__sidebar">
        <Sidebar {...sidebarProps} />
      </div>

      {mobileSidebarOpen && (
        <div className="main-layout__mobile-overlay">
          <div className="main-layout__mobile-backdrop" onClick={() => setMobileSidebarOpen(false)} />
          <div className="main-layout__mobile-sidebar">
            <Sidebar
              {...sidebarProps}
              initialPanel={activePersonaId ? "conversations" : "personas"}
              initialPersonaId={activePersonaId}
            />
          </div>
        </div>
      )}

      {activePersona ? (
        <ChatArea
          persona={activePersona}
          conversation={activeConvWithMessages}
          onSend={handleSend}
          onNewConversation={handleNewConversation}
          onOpenSidebar={() => setMobileSidebarOpen(true)}
          isTyping={isTyping}
        />
      ) : (
        <>
          <div className="main-layout__empty" style={{ flexDirection: 'column' }}>
            <div style={{ fontSize: '5em', marginBottom: '-0.4em' }}><IconLogo
              partId="main-layout-empty"
              className='start-page__icon'
              fill={theme === "light" ? "#555555" : "#8a8a8a"}
            /></div>
            <h1 className="start-page__logo">Mano IA</h1>
            <p className="start-page__sublogo">Selecione ou crie um personagem para começar</p>
            <div>
              <div className="start-page__button"
                onClick={() => setMobileSidebarOpen(true)}
              >
                Ver personagens
              </div>
            </div>
            <div className="float-left" style={{ margin: '1em 1em 0' }}>
              <p className="start-page__tips">
                <FireIcon className="size-5.5 inline mr-1.5!" style={{ alignSelf: 'anchor-center' }} fill="#cb2929" stroke="#f7c83b" strokeWidth={1} />
                Converse sobre diversos assuntos, tenha ajuda com tarefas, crie histórias e muito mais.
              </p>
              <p className="start-page__tips">
                <LightBulbIcon className="size-5 inline mr-1.5!" style={{ alignSelf: 'anchor-center' }} stroke="yellow" />
                Para melhores resultados, tente enviar mensagens claras e específicas.
              </p>
              <p className="start-page__tips">
                <UsersIcon className="size-5 inline mr-1.5!" style={{ alignSelf: 'anchor-center' }} stroke="dodgerblue" />
                Crie personagens com personalidades diferentes para diversas situações.
              </p>
            </div>

            <p className="start-page__footer">
              Ao enviar mensagens para o Mano IA, um chatbot de IA, você aceita nossos <a href="https://mano.ia.br/legal/#terms" className="underline" target="_blank">Termos</a> e reconhece nossa <a href="https://mano.ia.br/legal/#privacy" className="underline" target="_blank">Política de Privacidade</a>.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
