import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  getDocs, query, orderBy, serverTimestamp,
  onSnapshot, type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Persona, Conversation, Message } from "../types";

// ─── Personas ─────────────────────────────────────────────────────────────────

export function personasRef(userId: string) {
  return collection(db, "users", userId, "personas");
}

export function convosRef(userId: string, personaId: string) {
  return collection(db, "users", userId, "personas", personaId, "conversations");
}

export function messagesRef(userId: string, personaId: string, convId: string) {
  return collection(db, "users", userId, "personas", personaId, "conversations", convId, "messages");
}

// ── Persona CRUD ──────────────────────────────────────────────────────────────

export async function savePersona(userId: string, persona: Persona) {
  await setDoc(doc(personasRef(userId), persona.id), {
    ...persona,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePersona(userId: string, personaId: string) {
  await deleteDoc(doc(personasRef(userId), personaId));
}

export function subscribePersonas(
  userId: string,
  cb: (personas: Persona[]) => void
): Unsubscribe {
  const q = query(personasRef(userId), orderBy("createdAt", "asc"));
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => d.data() as Persona))
  );
}

// ── Conversation CRUD ─────────────────────────────────────────────────────────

export async function saveConversation(
  userId: string,
  personaId: string,
  convo: Omit<Conversation, "messages">
) {
  await setDoc(doc(convosRef(userId, personaId), convo.id), {
    ...convo,
    updatedAt: serverTimestamp(),
  });
}

export async function updateConversationMeta(
  userId: string,
  personaId: string,
  convId: string,
  fields: Partial<Pick<Conversation, "title" | "lastMsg" | "lastTime" | "unread">>
) {
  await updateDoc(doc(convosRef(userId, personaId), convId), {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteConversation(userId: string, personaId: string, convId: string) {
  await deleteDoc(doc(convosRef(userId, personaId), convId));
}

export function subscribeConversations(
  userId: string,
  personaId: string,
  cb: (convos: Omit<Conversation, "messages">[]) => void
): Unsubscribe {
  const q = query(convosRef(userId, personaId), orderBy("createdAt", "desc"));
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => d.data() as Omit<Conversation, "messages">))
  );
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function saveMessage(
  userId: string,
  personaId: string,
  convId: string,
  message: Message
) {
  await setDoc(doc(messagesRef(userId, personaId, convId), message.id), {
    ...message,
    updatedAt: serverTimestamp(),
  });
}

export async function loadMessages(
  userId: string,
  personaId: string,
  convId: string
): Promise<Message[]> {
  const q = query(messagesRef(userId, personaId, convId), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Message);
}

// ── Stats ─────────────────────────────────────────────────────────────────────

/**
 * Counts the total number of conversations across all personas of a user.
 * Fetches each persona's conversations subcollection in parallel.
 * Intended for low-frequency use (e.g. Settings panel).
 */
export async function countTotalConversations(userId: string): Promise<number> {
  // First get all personas, then fan out to their conversations subcollections
  const personasSnap = await getDocs(personasRef(userId));
  if (personasSnap.empty) return 0;

  const counts = await Promise.all(
    personasSnap.docs.map(async (personaDoc) => {
      const convSnap = await getDocs(convosRef(userId, personaDoc.id));
      return convSnap.size;
    })
  );

  return counts.reduce((sum, n) => sum + n, 0);
}