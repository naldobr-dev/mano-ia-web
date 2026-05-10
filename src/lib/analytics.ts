import {
    collection,
    addDoc,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Tipos de eventos ─────────────────────────────────────────────────────────

type PersonaRejectedEvent = {
    type: "persona_rejected";
    userId: string;
    personaName: string;
    reason: string;
    systemPrompt: string;
};

type ChatErrorEvent = {
    type: "chat_error";
    userId: string;
    personaId: string;
    conversationId: string;
    errorMessage: string;
    errorCode?: string;
    modelName: string;
    /** Últimas mensagens da conversa para contexto (máx. 5) */
    recentMessages: { role: "user" | "assistant"; text: string }[];
};

type PersonaDeletedEvent = {
    type: "persona_deleted";
    userId: string;
    personaId: string;
    personaName: string;
    personaEmoji: string;
    conversationCount: number;
};

type ConversationDeletedEvent = {
    type: "conversation_deleted";
    userId: string;
    personaId: string;
    conversationId: string;
    conversationTitle: string;
    messageCount: number;
};

type ConversationRenamedEvent = {
    type: "conversation_renamed";
    userId: string;
    personaId: string;
    conversationId: string;
    oldTitle: string;
    newTitle: string;
};

type PersonaGeneratedEvent = {
    type: "persona_generated";
    userId: string;
    /** Texto que o usuário digitou no campo Nome para gerar o personagem */
    inputText: string;
    /** Se a geração foi bem-sucedida */
    success: boolean;
};

type PersonaCreatedEvent = {
    type: "persona_created";
    userId: string;
    personaId: string;
    personaName: string;
    /** "template" | "scratch" | "generated" */
    creationMethod: "template" | "scratch" | "generated";
    templateName?: string;
};

type MessageSentEvent = {
    type: "message_sent";
    userId: string;
    personaId: string;
    conversationId: string;
    /** Tipo do conteúdo enviado */
    contentType: "text" | "image" | "audio" | "pdf" | "file";
    /** Tamanho aproximado do texto em caracteres */
    textLength: number;
    /** Tamanho do arquivo em bytes (se houver) */
    fileSize?: number;
    /** Nome do arquivo (sem extensão para preservar privacidade) */
    fileExtension?: string;
};

type AnalyticsEvent =
    | PersonaRejectedEvent
    | ChatErrorEvent
    | PersonaDeletedEvent
    | ConversationDeletedEvent
    | ConversationRenamedEvent
    | PersonaGeneratedEvent
    | PersonaCreatedEvent
    | MessageSentEvent;

// ─── Função base ──────────────────────────────────────────────────────────────

async function logEvent(event: AnalyticsEvent): Promise<void> {
    try {
        await addDoc(collection(db, "analytics"), {
            ...event,
            timestamp: serverTimestamp(),
        });
    } catch (err) {
        // Analytics nunca deve quebrar o fluxo principal
        console.warn("[analytics] Falha ao registrar evento:", err);
    }
}

// ─── Funções públicas ─────────────────────────────────────────────────────────

/**
 * Persona recusada pela moderação antes de salvar.
 */
export async function logPersonaRejected(params: {
    userId: string;
    personaName: string;
    reason: string;
    systemPrompt: string;
}): Promise<void> {
    await logEvent({ type: "persona_rejected", ...params });
}

/**
 * Erro ao chamar a API do Gemini durante o chat.
 */
export async function logChatError(params: {
    userId: string;
    personaId: string;
    conversationId: string;
    errorMessage: string;
    errorCode?: string;
    modelName: string;
    recentMessages: { role: "user" | "assistant"; text: string }[];
}): Promise<void> {
    await logEvent({
        type: "chat_error",
        ...params,
        // Garante no máximo 5 mensagens recentes
        recentMessages: params.recentMessages.slice(-5),
    });
}

/**
 * Persona excluída pelo usuário.
 */
export async function logPersonaDeleted(params: {
    userId: string;
    personaId: string;
    personaName: string;
    personaEmoji: string;
    conversationCount: number;
}): Promise<void> {
    await logEvent({ type: "persona_deleted", ...params });
}

/**
 * Conversa excluída pelo usuário.
 */
export async function logConversationDeleted(params: {
    userId: string;
    personaId: string;
    conversationId: string;
    conversationTitle: string;
    messageCount: number;
}): Promise<void> {
    await logEvent({ type: "conversation_deleted", ...params });
}

/**
 * Conversa renomeada pelo usuário.
 */
export async function logConversationRenamed(params: {
    userId: string;
    personaId: string;
    conversationId: string;
    oldTitle: string;
    newTitle: string;
}): Promise<void> {
    await logEvent({ type: "conversation_renamed", ...params });
}

/**
 * Usuário usou o botão "Gerar personagem" a partir do nome.
 */
export async function logPersonaGenerated(params: {
    userId: string;
    inputText: string;
    success: boolean;
}): Promise<void> {
    await logEvent({ type: "persona_generated", ...params });
}

/**
 * Persona criada com sucesso e salva no Firestore.
 */
export async function logPersonaCreated(params: {
    userId: string;
    personaId: string;
    personaName: string;
    creationMethod: "template" | "scratch" | "generated";
    templateName?: string;
}): Promise<void> {
    await logEvent({ type: "persona_created", ...params });
}

/**
 * Mensagem enviada pelo usuário no chat.
 */
export async function logMessageSent(params: {
    userId: string;
    personaId: string;
    conversationId: string;
    contentType: "text" | "image" | "audio" | "pdf" | "file";
    textLength: number;
    fileSize?: number | 0;
    fileExtension?: string;
}): Promise<void> {
    await logEvent({ type: "message_sent", ...params });
}
