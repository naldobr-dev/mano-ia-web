import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  type Content,
  type Part,
} from "@google/generative-ai";
import type { Message } from "../types";

// ── Client (singleton) ────────────────────────────────────────────────────────

function getClient(): GoogleGenerativeAI {
  const key = import.meta.env.VITE_GEMINI_API_KEY as string;
  if (!key) throw new Error("VITE_GEMINI_API_KEY is not set.");
  return new GoogleGenerativeAI(key);
}

//const MODEL_NAME = "gemini-2.5-flash";
const MODEL_NAME = "gemini-3.1-flash-lite-preview";

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Converts our Message[] history to the SDK Content[] format */
function historyToContents(history: Message[]): Content[] {
  return history.map((msg): Content => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.text }],
  }));
}

/** Builds the multipart user turn from text + optional file */
async function buildUserParts(userText: string, file?: File): Promise<Part[]> {
  const parts: Part[] = [];

  if (file) {
    const isPlainText = /\.(txt|htm|html|json|xml|csv)$/i.test(file.name);

    if (isPlainText) {
      const text = await file.text();
      parts.push({ text: `[Arquivo: ${file.name}]\n\n${text}` });
    } else {
      const base64Data = await fileToBase64(file);
      parts.push({ inlineData: { mimeType: file.type, data: base64Data } });

      if (file.type.startsWith("audio/")) {
        // For audio, ask the model to transcribe then respond — no extra text part needed
        parts.push({
          text: "O usuário enviou uma mensagem de voz. Transcreva o que foi dito e responda de acordo com sua personalidade.",
        });
        return parts; // skip userText for audio-only turns
      }

      // For images/PDFs: append the user's caption if provided
      if (userText) parts.push({ text: userText });
      else parts.push({ text: `Analise o conteúdo deste arquivo: ${file.name}` });
      return parts;
    }
  }

  if (userText) parts.push({ text: userText });
  return parts;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Sends a message to Gemini and returns the full response text.
 *
 * @param systemPrompt - The persona's system instruction
 * @param history      - Prior messages in this conversation (without the current one)
 * @param userText     - The user's text input (may be empty if sending only a file)
 * @param file         - Optional file attachment (image, audio, PDF, etc.)
 */
export async function sendMessage(
  systemPrompt: string,
  history: Message[],
  userText: string,
  file?: File
): Promise<string> {
  const genAI = getClient();

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: systemPrompt,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 2048,
    },
  });

  const chat = model.startChat({
    history: historyToContents(history),
  });

  const userParts = await buildUserParts(userText, file);
  const result = await chat.sendMessage(userParts);
  const text = result.response.text();

  if (!text) throw new Error("Resposta vazia do Gemini.");
  return text;
}

/**
 * Streaming variant — yields text chunks as they arrive.
 * Ready to use; hook it up to a streaming UI when needed.
 *
 * Usage:
 *   for await (const chunk of streamMessage(...)) {
 *     setPartialResponse(prev => prev + chunk);
 *   }
 */
export async function* streamMessage(
  systemPrompt: string,
  history: Message[],
  userText: string,
  file?: File
): AsyncGenerator<string> {
  const genAI = getClient();

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: systemPrompt,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 2048,
    },
  });

  const chat = model.startChat({
    history: historyToContents(history),
  });

  const userParts = await buildUserParts(userText, file);
  const result = await chat.sendMessageStream(userParts);

  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    if (chunkText) yield chunkText;
  }
}
