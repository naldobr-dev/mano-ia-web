import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  type Content,
  type Part,
} from "@google/generative-ai";
import type { Message } from "../types";

import {
  logPersonaRejected,
  logPersonaGenerated,
} from "./analytics";

// ── Client (singleton) ────────────────────────────────────────────────────────

function getClient(): GoogleGenerativeAI {
  const key = import.meta.env.VITE_GEMINI_API_KEY as string;
  if (!key) throw new Error("VITE_GEMINI_API_KEY is not set.");
  return new GoogleGenerativeAI(key);
}

//const MODEL_NAME = "gemini-2.5-flash";
const MODEL_NAME = "gemini-3.1-flash-lite-preview";
const MODERATION_MODEL = "gemini-2.5-flash-lite";

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
 * Moderates a persona before saving.
 *
 * Sends the persona's system prompt to Gemini Flash Lite and asks it to check
 * for violations of the Generative AI Prohibited Use Policy.
 *
 * @returns `{ approved: true }` if the persona is acceptable, or
 *          `{ approved: false, reason: string }` with the violation description.
 */
export async function moderatePersona(
  systemPrompt: string,
  userId: string,
  personaName: string
): Promise<{ approved: true } | { approved: false; reason: string }> {
  const genAI = getClient();

  const model = genAI.getGenerativeModel({
    model: MODERATION_MODEL,
    // Temperature 0 = deterministic, consistent moderation decisions
    generationConfig: { temperature: 0, maxOutputTokens: 1000 },
    // Keep safety settings permissive here so the model can *describe* violations
    // without itself being blocked by the safety filters.
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ],
  });

  const prompt = `Abaixo está um modelo de prompt para a criação de um persona de IA. Analise-o quanto à possibilidade de violar a "Política de Uso Proibido da IA Generativa".
Responda APENAS "NÃO" se não violar nenhuma política. Se violar, responda APENAS com o motivo, em no máximo 200 caracteres, sem introdução nem explicação extra.

Persona:
"${systemPrompt}"`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    // Any answer that is exactly "NÃO" (case-insensitive) means approved
    if (/^não$/i.test(raw)) return { approved: true };

    // Otherwise, log the rejection reason and return it to the caller
    await logPersonaRejected({
      userId,
      personaName,
      reason: raw,
      systemPrompt,
    });
    // Otherwise the model returned the violation reason
    return { approved: false, reason: raw };
  } catch {
    // If the moderation call itself fails (network, quota, etc.),
    // fail open — don't block the user from saving.
    console.warn("moderatePersona: moderation call failed, allowing save.");
    return { approved: true };
  }
}

/**
 * Gera um personagem de IA a partir de um nome dado pelo usuário
 * 
 * @param name O nome do personagem a ser criado
 * @returns Um JSON com os dados do novo personagem recebido pela API do Gemini
 * 
 */
export async function generatePersona(name: string, userId: string): Promise<{
  systemPrompt: string;
  exampleDialog: { user: string; model: string }[]
} | null> {
  const genAI = getClient();

  const model = genAI.getGenerativeModel({
    model: MODERATION_MODEL,
    generationConfig: {
      temperature: 0.9,
      responseMimeType: "application/json",
    },
    safetySettings: SAFETY_SETTINGS,
  });

  const prompt = `Crie um personagem sobre "${name}". Se você identificar que ele é um personagem conhecido, use as informações reais sobre ele. Retorne APENAS um JSON válido, sem explicações, sem markdown, sem crases, sem texto adicional, preenchendo as seguintes informações do personagem:

nome -> O nome do personagem
emoji -> Um emoji que represente bem esse personagem
desc -> Uma descrição curta do peronagem
sexo -> Sexo do personagem (masculino, feminino, não-binário)
idade -> Possível idade do personagem
escolaridade -> Uma escolaridade para o personagem
profissao -> A profissão do personagem
especialidade -> No quê o personagem é especialista
historicoVida -> Uma breve história do personagem (max. 500 caracteres)
personalidadeExtra -> Personalidades e características extras do personagem (como ele se comunica, se tem humor, se é formal ou casual, se tem expressões favoritas...) (max. 500 caracteres)
objetivo -> O que esse personagem quer alcançar na conversa
regras -> Lista de comportamentos obrigatórios ou proibidos
estiloComunicacao -> formal, casual, sarcástico, motivador, técnico
modoPensamento-> analítico, criativo, crítico, didático, provocador
limitacoes -> o que ele NÃO faz ou NÃO SABE
maneirismos -> bordões ou estilo repetitivo de fala
tipoInteracao -> passivo | ativo | desafiador

Exemplo:
{
  "nome": "Prof. Matheus",
  "emoji": "👨‍🏫",
  "desc": "Professor que simplifica matemática ao extremo usando lógica e analogias do dia a dia",
  "sexo": "Masculino",
  "idade": 40,
  "escolaridade": "Doutorado em Matemática",
  "profissao": "Professor de Matemática",
  "especialidade": "Explicar matemática de forma simples e intuitiva",
  "historicoVida": "Depois de anos ensinando alunos com dificuldade, percebeu que o problema não era a matemática, mas a forma como ela era explicada. Desde então, desenvolveu um método baseado em simplificação extrema e analogias do cotidiano.",
  "personalidadeExtra": "Calmo, direto e extremamente didático. Odeia complicação desnecessária e sempre tenta reduzir tudo ao mais simples possível. Fala como alguém explicando para um amigo.",
  "objetivo": "Fazer o usuário entender qualquer conceito matemático da forma mais simples possível, sem decorar fórmulas",
  "regras": [
    "Sempre explicar com analogias simples do cotidiano",
    "Evitar linguagem técnica sempre que possível",
    "Quebrar o raciocínio em passos curtos",
    "Confirmar se o usuário entendeu antes de avançar"
  ],
  "estiloComunicacao": "casual e didático",
  "modoPensamento": "simplificador",
  "limitacoes": [
    "Não usa explicações longas",
    "Não apresenta fórmulas sem contexto",
    "Não assume que o usuário sabe o básico"
  ],
  "maneirismos": [
    "“Vamos simplificar isso:”",
    "“Pensa assim:”",
    "“Matemática é só lógica disfarçada.”"
  ],
  "tipoInteracao": "ativo"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    const parsed = JSON.parse(text);

    // Log successful generation for analytics, including the input name and user ID for correlation. 
    // We can analyze this later to see what kinds of names lead to successful or failed generations.
    await logPersonaGenerated({ userId, inputText: name, success: true });

    // If the response is valid JSON, return it. The UI can then use this to pre-fill the persona creation form, 
    // allowing the user to edit and customize further before saving.
    return parsed;
  } catch {
    console.warn(`Falha ao criar persona: resposta do modelo não é um JSON válido. Resposta recebida: ${text}`);

    // Log the failure for analytics to understand what went wrong. This can help us improve the prompt or handle edge cases better.
    await logPersonaGenerated({ userId, inputText: name, success: false });

    // Return null to indicate failure to generate a valid persona. The UI can handle this case and show an appropriate message to the user.
    return null;
  }
}

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
